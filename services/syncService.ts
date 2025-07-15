import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lista, Item, Categoria } from '../types';

const LISTAS_KEY = '@liteus_listas';

export interface SyncData {
  listas: Lista[];
  categorias: Categoria[];
  metadata: {
    exportadoEm: string;
    versao: string;
    dispositivo: string;
    totalListas: number;
    totalItens: number;
  };
}

export class SyncService {
  // Exportar todas as listas em formato estruturado
  static async exportarTodasListas(): Promise<string> {
    try {
      const listas = await this.carregarListas();
      const categorias = await this.carregarCategorias();

      const syncData: SyncData = {
        listas,
        categorias,
        metadata: {
          exportadoEm: new Date().toISOString(),
          versao: '2.0',
          dispositivo: 'Liteus App',
          totalListas: listas.length,
          totalItens: listas.reduce((total, lista) => total + lista.itens.length, 0),
        },
      };

      return JSON.stringify(syncData, null, 2);
    } catch (error) {
      console.error('Erro ao exportar listas:', error);
      throw new Error('Falha ao exportar listas');
    }
  }

  // Exportar lista específica em formato estruturado
  static async exportarLista(listaId: string): Promise<string> {
    try {
      const listas = await this.carregarListas();
      const lista = listas.find(l => l.id === listaId);
      
      if (!lista) {
        throw new Error('Lista não encontrada');
      }

      const syncData: SyncData = {
        listas: [lista],
        categorias: lista.categorias,
        metadata: {
          exportadoEm: new Date().toISOString(),
          versao: '2.0',
          dispositivo: 'Liteus App',
          totalListas: 1,
          totalItens: lista.itens.length,
        },
      };

      return JSON.stringify(syncData, null, 2);
    } catch (error) {
      console.error('Erro ao exportar lista:', error);
      throw new Error('Falha ao exportar lista');
    }
  }

  // Importar dados estruturados
  static async importarDados(dadosJson: string): Promise<{
    listasImportadas: number;
    itensImportados: number;
    conflitos: string[];
  }> {
    try {
      const syncData: SyncData = JSON.parse(dadosJson);
      const listasExistentes = await this.carregarListas();
      const conflitos: string[] = [];
      let listasImportadas = 0;
      let itensImportados = 0;

      for (const listaImportada of syncData.listas) {
        // Verificar se a lista já existe
        const listaExistente = listasExistentes.find(l => l.nome === listaImportada.nome);
        
        if (listaExistente) {
          // Atualizar lista existente
          await this.atualizarLista(listaExistente.id, listaImportada);
          conflitos.push(`Lista "${listaImportada.nome}" foi atualizada`);
        } else {
          // Criar nova lista
          await this.criarLista(listaImportada);
          listasImportadas++;
        }
        
        itensImportados += listaImportada.itens.length;
      }

      return {
        listasImportadas,
        itensImportados,
        conflitos,
      };
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      throw new Error('Falha ao importar dados');
    }
  }

  // Processar diferentes formatos de arquivo
  static async processarArquivo(conteudo: string, tipoArquivo: string): Promise<{
    nome: string;
    descricao?: string;
    itens: Array<string | {
      texto: string;
      descricao?: string;
      categoria?: string;
      categorias?: string[];
      tags?: string[];
      prioridade?: number;
      data?: string;
      concluido?: boolean;
      textoFormatado?: any[];
    }>;
    cor?: string;
    categorias: string[];
    permiteSelecaoAleatoria: boolean;
    tipoAnimacao: 'simples';
  }> {
    console.log('Processando arquivo:', tipoArquivo);
    
    // Normalizar o tipo de arquivo
    const tipoNormalizado = tipoArquivo.toLowerCase().trim();
    
    // Primeiro, tentar extrair texto de qualquer formato
    let textoExtraido = await this.extrairTextoDeQualquerFormato(conteudo, tipoNormalizado);
    
    if (!textoExtraido) {
      throw new Error('Não foi possível extrair texto do arquivo');
    }
    
    console.log('Texto extraído:', textoExtraido.substring(0, 200) + '...');
    
    // Agora processar o texto extraído
    switch (tipoNormalizado) {
      case 'json':
        return this.processarJSON(textoExtraido);
      case 'txt':
      case 'text':
      case 'plain':
      case 'google-docs':
      case 'docs':
        return this.processarTexto(textoExtraido);
      case 'docx':
      case 'odt':
      case 'rtf':
      case 'doc':
        return this.processarDocumento(textoExtraido);
      case 'pdf':
        return this.processarPDF(textoExtraido);
      case 'auto':
      case 'detect':
      default:
        // Tentar detectar automaticamente
        return this.detectarEProcessar(textoExtraido);
    }
  }

  // Processar arquivo JSON estruturado
  private static processarJSON(conteudo: string): any {
    try {
      const dados = JSON.parse(conteudo);
      if (dados.listas && dados.listas.length > 0) {
        const lista = dados.listas[0];
        return {
          nome: lista.nome,
          descricao: lista.descricao,
          itens: lista.itens.map((item: any) => ({
            texto: item.texto,
            descricao: item.descricao,
            categoria: item.categoria,
            categorias: item.categorias,
            tags: item.tags,
            prioridade: item.prioridade,
            data: item.data,
            concluido: item.concluido,
            textoFormatado: item.textoFormatado,
          })),
          cor: lista.cor,
          categorias: lista.categorias?.map((cat: any) => cat.nome) || [],
          permiteSelecaoAleatoria: lista.permiteSelecaoAleatoria || true,
          tipoAnimacao: lista.tipoAnimacao || 'simples',
        };
      }
      throw new Error('Formato JSON inválido');
    } catch (error) {
      throw new Error('Erro ao processar arquivo JSON');
    }
  }

  // Processar arquivo de texto simples (incluindo exportações do Google Docs)
  private static processarTexto(conteudo: string): any {
    console.log('Processando texto simples');
    const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Tentar detectar se é um template do Google Docs estruturado
    if (linhas.some(l => l.startsWith('# ')) && linhas.some(l => l.startsWith('## Itens'))) {
      console.log('Detectado template estruturado do Google Docs');
      return this.processarTemplateGoogleDocs(conteudo);
    }

    // Processar como lista simples do Google Docs
    console.log('Processando como lista simples');
    const itens: Array<string | {
      texto: string;
      descricao?: string;
      categoria?: string;
      categorias?: string[];
      tags?: string[];
      prioridade?: number;
      data?: string;
      concluido?: boolean;
      textoFormatado?: any[];
    }> = [];
    let nomeLista = 'Lista Importada';
    let descricao = '';
    let cor = '#007AFF';
    let categorias: string[] = [];

    for (const linha of linhas) {
      // Remover marcadores comuns do Google Docs
      const itemLimpo = linha
        .replace(/^[-•*▪▫◦‣⁃]\s*/, '') // Remove hífen, bullet, asterisco
        .replace(/^\d+\.\s*/, '') // Remove numeração
        .replace(/^[a-zA-Z]\.\s*/, '') // Remove letras com ponto
        .replace(/^[•▪▫◦‣⁃]\s*/, '') // Remove outros bullets Unicode
        .replace(/^\s*[-•*]\s*/, '') // Remove bullets com espaços
        .replace(/^\s*\d+\.\s*/, '') // Remove numeração com espaços
        .trim();

      if (itemLimpo.length > 0) {
        // Se a linha contém ":" pode ser um título ou metadado
        if (itemLimpo.includes(':') && itens.length === 0) {
          const partes = itemLimpo.split(':');
          if (partes.length >= 2) {
            const chave = partes[0].trim().toLowerCase();
            const valor = partes.slice(1).join(':').trim();
            
            if (chave === 'nome' || chave === 'título' || chave === 'title') {
              nomeLista = valor;
            } else if (chave === 'descrição' || chave === 'descricao' || chave === 'description') {
              descricao = valor;
            } else if (chave === 'cor' || chave === 'color') {
              cor = valor;
            } else if (chave === 'categorias' || chave === 'categories') {
              categorias = valor.split(',').map(c => c.trim());
            } else {
              // Se não for um metadado conhecido, tratar como título da lista
              nomeLista = itemLimpo;
            }
          }
        } else if (itemLimpo.toLowerCase().startsWith('nome:') || 
                   itemLimpo.toLowerCase().startsWith('título:') ||
                   itemLimpo.toLowerCase().startsWith('title:')) {
          // Metadado de nome
          const valor = itemLimpo.split(':')[1]?.trim();
          if (valor) nomeLista = valor;
        } else if (itemLimpo.toLowerCase().startsWith('descrição:') || 
                   itemLimpo.toLowerCase().startsWith('descricao:') ||
                   itemLimpo.toLowerCase().startsWith('description:')) {
          // Metadado de descrição
          const valor = itemLimpo.split(':')[1]?.trim();
          if (valor) descricao = valor;
        } else if (itemLimpo.toLowerCase().startsWith('cor:') || 
                   itemLimpo.toLowerCase().startsWith('color:')) {
          // Metadado de cor
          const valor = itemLimpo.split(':')[1]?.trim();
          if (valor) cor = valor;
        } else if (itemLimpo.toLowerCase().startsWith('categorias:') || 
                   itemLimpo.toLowerCase().startsWith('categories:')) {
          // Metadado de categorias
          const valor = itemLimpo.split(':')[1]?.trim();
          if (valor) categorias = valor.split(',').map(c => c.trim());
        } else {
          // É um item da lista
          itens.push(itemLimpo);
        }
      }
    }

    return {
      nome: nomeLista,
      descricao: descricao || undefined,
      itens,
      cor,
      categorias,
      permiteSelecaoAleatoria: true,
      tipoAnimacao: 'simples',
    };
  }

  // Processar documentos (DOCX, ODT, RTF) - Google Docs exporta como DOCX
  private static processarDocumento(conteudo: string): any {
    console.log('Processando documento (DOCX/ODT/RTF)');
    
    // Para documentos do Google Docs, tentar extrair texto limpo
    let textoLimpo = conteudo
      .replace(/<[^>]*>/g, '') // Remove tags HTML/XML
      .replace(/&[a-zA-Z]+;/g, ' ') // Remove entidades HTML
      .replace(/\s+/g, ' ') // Normaliza espaços
      .replace(/^\s+|\s+$/g, '') // Remove espaços no início/fim
      .trim();

    // Se o texto ainda contém muitas tags, tentar uma limpeza mais agressiva
    if (textoLimpo.includes('<') || textoLimpo.includes('>')) {
      textoLimpo = textoLimpo
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    console.log('Texto limpo:', textoLimpo.substring(0, 200) + '...');
    return this.processarTexto(textoLimpo);
  }

  // Processar PDF
  private static processarPDF(conteudo: string): any {
    console.log('Processando PDF');
    // PDFs geralmente vêm como texto extraído
    return this.processarTexto(conteudo);
  }


  private static detectarEProcessar(conteudo: string): any {
    console.log('Detectando formato automaticamente');
    

    const conteudoLimpo = conteudo.trim();
    

    if (conteudoLimpo.startsWith('{') || conteudoLimpo.startsWith('[')) {
      console.log('Detectado JSON');
      return this.processarJSON(conteudo);
    }


    if (conteudo.includes('# ') && conteudo.includes('## Itens')) {
      console.log('Detectado template estruturado do Google Docs');
      return this.processarTemplateGoogleDocs(conteudo);
    }


    if (conteudo.includes('<') && conteudo.includes('>')) {
      console.log('Detectado documento com tags (DOCX/RTF/DOC)');
      return this.processarDocumento(conteudo);
    }


    const linhas = conteudo.split('\n');
    const temBullets = linhas.some(l => 
      l.trim().match(/^[-•*▪▫◦‣⁃]\s/) || 
      l.trim().match(/^\d+\.\s/) ||
      l.trim().match(/^[a-zA-Z]\.\s/)
    );
    
    if (temBullets) {
      console.log('Detectado texto simples com bullets (Google Docs)');
      return this.processarTexto(conteudo);
    }


    const temEstruturaLista = linhas.some(l => 
      l.trim().length > 0 && 
      !l.trim().startsWith('#') && 
      !l.trim().startsWith('##')
    );
    
    if (temEstruturaLista) {
      console.log('Detectado texto simples com estrutura de lista');
      return this.processarTexto(conteudo);
    }


    console.log('Processando como texto simples');
    return this.processarTexto(conteudo);
  }


  static gerarExemploTemplate(): string {
    return `# Exemplo de Lista

## Descrição
Esta é uma lista de exemplo para demonstrar como formatar no Google Docs.

## Itens
1. Primeiro item da lista
2. Segundo item da lista
3. Terceiro item da lista
4. Quarto item da lista

## Metadados
- Cor: #007AFF
- Categorias: Exemplo, Teste
- Seleção Aleatória: Sim
- Tipo de Animação: roleta
- Criada em: ${new Date().toLocaleDateString('pt-BR')}

---
# Outra Lista

## Descrição
Segunda lista de exemplo.

## Itens
1. Item A
2. Item B
3. Item C

## Metadados
- Cor: #34C759
- Categorias: 
- Seleção Aleatória: Sim
- Tipo de Animação: roleta
- Criada em: ${new Date().toLocaleDateString('pt-BR')}

---
# Formato Simples (também funciona)

Nome: Lista Simples
Descrição: Esta é uma lista em formato simples
Cor: #FF9500
Categorias: Simples, Teste

• Item 1
• Item 2
• Item 3
• Item 4

---
# Formato com Bullets

Nome: Lista com Bullets
Descrição: Lista usando bullets do Google Docs

- Primeiro item
- Segundo item
- Terceiro item

---
# Formato Numerado

Nome: Lista Numerada
Descrição: Lista usando numeração

1. Primeiro item
2. Segundo item
3. Terceiro item

---
# Formato Misto

Nome: Lista Mista
Descrição: Lista com diferentes tipos de marcadores

• Item com bullet
1. Item numerado
- Item com hífen
* Item com asterisco`;
  }


  static gerarTemplateGoogleDocs(lista: Lista): string {
    let template = `# ${lista.nome}\n`;
    
    if (lista.descricao) {
      template += `## Descrição\n${lista.descricao}\n\n`;
    }

    template += `## Itens\n`;
    
    lista.itens.forEach((item, index) => {
      template += `${index + 1}. ${item.texto}`;
      
      if (item.descricao) {
        template += ` (${item.descricao})`;
      }
      
      if (item.categoria) {
        template += ` [${item.categoria}]`;
      }
      
      template += '\n';
    });

    template += `\n## Metadados\n`;
    template += `- Cor: ${lista.cor || '#007AFF'}\n`;
    template += `- Categorias: ${lista.categorias.map(c => c.nome).join(', ')}\n`;
    template += `- Seleção Aleatória: ${lista.permiteSelecaoAleatoria ? 'Sim' : 'Não'}\n`;
    template += `- Tipo de Animação: ${lista.tipoAnimacao || 'roleta'}\n`;
          template += `- Criada em: ${new Date(lista.dataCriacao).toLocaleDateString('pt-BR')}\n`;

    return template;
  }
  static processarTemplateGoogleDocs(conteudo: string): {
    nome: string;
    descricao?: string;
    itens: Array<string | {
      texto: string;
      descricao?: string;
      categoria?: string;
      categorias?: string[];
      tags?: string[];
      prioridade?: number;
      data?: string;
      concluido?: boolean;
      textoFormatado?: any[];
    }>;
    cor?: string;
    categorias: string[];
    permiteSelecaoAleatoria: boolean;
    tipoAnimacao: 'simples';
  } {
    const linhas = conteudo.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    let nome = '';
    let descricao = '';
    let itens: Array<string | {
      texto: string;
      descricao?: string;
      categoria?: string;
      categorias?: string[];
      tags?: string[];
      prioridade?: number;
      data?: string;
      concluido?: boolean;
      textoFormatado?: any[];
    }> = [];
    let cor = '#007AFF';
    let categorias: string[] = [];
    let permiteSelecaoAleatoria = true;
    let tipoAnimacao: 'roleta' | 'cubo' = 'roleta';

    let secaoAtual = '';

    for (const linha of linhas) {
      if (linha.startsWith('# ')) {
        nome = linha.substring(2);
        secaoAtual = 'nome';
      } else if (linha.startsWith('## Descrição')) {
        secaoAtual = 'descricao';
      } else if (linha.startsWith('## Itens')) {
        secaoAtual = 'itens';
      } else if (linha.startsWith('## Metadados')) {
        secaoAtual = 'metadados';
      } else if (secaoAtual === 'descricao' && linha.length > 0) {
        descricao = linha;
      } else if (secaoAtual === 'itens' && linha.match(/^\d+\./)) {
        const itemCompleto = linha.replace(/^\d+\.\s*/, '');
        
        // Tentar extrair descrição e categoria do item
        let texto = itemCompleto;
        let descricao: string | undefined;
        let categoria: string | undefined;
        
        // Verificar se tem descrição entre parênteses
        const descricaoMatch = itemCompleto.match(/\(([^)]+)\)/);
        if (descricaoMatch) {
          descricao = descricaoMatch[1];
          texto = texto.replace(/\([^)]+\)/, '').trim();
        }
        
        // Verificar se tem categoria entre colchetes
        const categoriaMatch = itemCompleto.match(/\[([^\]]+)\]/);
        if (categoriaMatch) {
          categoria = categoriaMatch[1];
          texto = texto.replace(/\[[^\]]+\]/, '').trim();
        }
        
        // Se o item tem informações extras, criar objeto estruturado
        if (descricao || categoria) {
          itens.push({
            texto: texto,
            descricao: descricao,
            categoria: categoria,
          });
        } else {
          itens.push(texto);
        }
      } else if (secaoAtual === 'metadados') {
        if (linha.startsWith('- Cor:')) {
          const corMatch = linha.match(/#[0-9A-Fa-f]{6}/);
          if (corMatch) cor = corMatch[0];
        } else if (linha.startsWith('- Categorias:')) {
          const cats = linha.replace('- Categorias:', '').trim();
          if (cats && cats !== 'undefined') {
            categorias = cats.split(',').map(c => c.trim());
          }
        } else if (linha.startsWith('- Seleção Aleatória:')) {
          permiteSelecaoAleatoria = linha.includes('Sim');
        } else if (linha.startsWith('- Tipo de Animação:')) {
          tipoAnimacao = linha.includes('cubo') ? 'cubo' : 'roleta';
        }
      }
    }

    return {
      nome,
      descricao: descricao || undefined,
      itens,
      cor,
      categorias,
      permiteSelecaoAleatoria,
      tipoAnimacao: tipoAnimacao as "simples",
    };
  }

  // Funções auxiliares
  private static async carregarListas(): Promise<Lista[]> {
    try {
      const dados = await AsyncStorage.getItem(LISTAS_KEY);
      return dados ? JSON.parse(dados) : [];
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
      return [];
    }
  }

  private static async carregarCategorias(): Promise<Categoria[]> {
    try {
      const dados = await AsyncStorage.getItem('categorias');
      return dados ? JSON.parse(dados) : [];
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
      return [];
    }
  }

  private static async atualizarLista(id: string, listaAtualizada: Lista): Promise<void> {
    try {
      const listas = await this.carregarListas();
      const index = listas.findIndex(l => l.id === id);
      
      if (index >= 0) {
        listas[index] = {
          ...listaAtualizada,
          id,
          dataModificacao: Date.now(),
        };
        
        await AsyncStorage.setItem(LISTAS_KEY, JSON.stringify(listas));
      }
    } catch (error) {
      console.error('Erro ao atualizar lista:', error);
      throw error;
    }
  }

  private static async criarLista(lista: Lista): Promise<void> {
    try {
      const listas = await this.carregarListas();
      const novaLista = {
        ...lista,
        id: Date.now().toString(),
        dataCriacao: Date.now(),
        dataModificacao: Date.now(),
      };
      
      listas.push(novaLista);
      await AsyncStorage.setItem(LISTAS_KEY, JSON.stringify(listas));
    } catch (error) {
      console.error('Erro ao criar lista:', error);
      throw error;
    }
  }


  private static async extrairTextoDeQualquerFormato(conteudo: string, tipoArquivo: string): Promise<string> {
    console.log('Extraindo texto do formato:', tipoArquivo);
    

    if (tipoArquivo === 'txt' || tipoArquivo === 'text' || tipoArquivo === 'plain') {
      return conteudo;
    }
    

    if (tipoArquivo === 'json') {
      return conteudo;
    }
    

    if (tipoArquivo === 'docx' || tipoArquivo === 'doc' || tipoArquivo === 'odt' || tipoArquivo === 'rtf') {
      return this.extrairTextoDeDocumento(conteudo);
    }
    
    if (tipoArquivo === 'pdf') {
      return this.extrairTextoDePDF(conteudo);
    }
    

    if (tipoArquivo === 'auto' || tipoArquivo === 'detect') {
      return this.detectarEExtrairTexto(conteudo);
    }
    

    return conteudo;
  }


  private static extrairTextoDeDocumento(conteudo: string): string {
    console.log('Extraindo texto de documento...');
    
    // Se o conteúdo contém tags XML/HTML, tentar extrair texto
    if (conteudo.includes('<') && conteudo.includes('>')) {
      let textoLimpo = conteudo
        .replace(/<[^>]*>/g, ' ') 
        .replace(/&[a-zA-Z]+;/g, ' ') 
        .replace(/&[#][0-9]+;/g, ' ') 
        .replace(/\s+/g, ' ') 
        .replace(/^\s+|\s+$/g, '') 
        .trim();

   
      if (textoLimpo.includes('<') || textoLimpo.includes('>')) {
        textoLimpo = textoLimpo
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }

      console.log('Texto extraído do documento:', textoLimpo.substring(0, 200) + '...');
      return textoLimpo;
    }
    
 
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(conteudo)) {
      console.log('Detectado dados binários, tentando extrair texto...');
      

      let textoExtraido = conteudo
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') 
        .replace(/\s+/g, ' ') 
        .trim();
      
 
      if (textoExtraido.length > 10 && /[a-zA-Z]/.test(textoExtraido)) {
        console.log('Texto extraído de dados binários:', textoExtraido.substring(0, 200) + '...');
        return textoExtraido;
      }
    }
    
    // Se não tem tags nem dados binários, pode ser texto já extraído
    return conteudo;
  }

  // Extrair texto de PDF
  private static extrairTextoDePDF(conteudo: string): string {
    console.log('Extraindo texto de PDF...');
    
    // PDFs geralmente vêm como texto extraído
    // Se contém caracteres especiais de PDF, tentar limpar
    let textoLimpo = conteudo
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove caracteres de controle
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim();
    
    console.log('Texto extraído do PDF:', textoLimpo.substring(0, 200) + '...');
    return textoLimpo;
  }

  // Detectar e extrair texto automaticamente
  private static detectarEExtrairTexto(conteudo: string): string {
    console.log('Detectando formato automaticamente...');
    
    // Verificar se é JSON
    if (conteudo.trim().startsWith('{') || conteudo.trim().startsWith('[')) {
      console.log('Detectado JSON');
      return conteudo;
    }
    
    // Verificar se contém tags XML/HTML (DOCX, RTF, etc.)
    if (conteudo.includes('<') && conteudo.includes('>')) {
      console.log('Detectado documento com tags');
      return this.extrairTextoDeDocumento(conteudo);
    }
    
    // Verificar se contém caracteres de controle (PDF, DOCX binário)
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(conteudo)) {
      console.log('Detectado arquivo binário (PDF/DOCX)');
      return this.extrairTextoDeDocumento(conteudo);
    }
    
    // Verificar se contém dados base64 (arquivos codificados)
    if (conteudo.match(/^[A-Za-z0-9+/]*={0,2}$/) && conteudo.length > 100) {
      console.log('Detectado dados base64');
      try {
        // Tentar decodificar base64
        const decoded = Buffer.from(conteudo, 'base64').toString('utf8');
        if (decoded.length > 10) {
          console.log('Dados base64 decodificados com sucesso');
          return this.detectarEExtrairTexto(decoded);
        }
      } catch (error) {
        console.log('Erro ao decodificar base64:', error);
      }
    }
    
    // Padrão: tratar como texto simples
    console.log('Detectado texto simples');
    return conteudo;
  }
} 