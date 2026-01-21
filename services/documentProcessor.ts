import { FormatoTexto } from '../types';

export class DocumentProcessor {
  // Processar arquivo Word (.docx) com formatação
  static async processarDocumentoWord(conteudo: string): Promise<string[]> {
    try {

      const linhas = conteudo.split('\n')
        .map(linha => linha.trim())
        .filter(linha => linha.length > 0);

      const itens: string[] = [];
      
      linhas.forEach(linha => {

        const itemLimpo = linha
          .replace(/^[-•*]\s*/, '') 
          .replace(/^\d+\.\s*/, '')
          .replace(/^[a-zA-Z]\.\s*/, '') 
          .trim();

        if (itemLimpo.length > 0) {
          itens.push(itemLimpo);
        }
      });

      return itens;
    } catch (error) {
      console.error('Erro ao processar documento Word:', error);
      return [];
    }
  }

  // Extrair formatação de texto rico
  static extrairFormatacao(texto: string): FormatoTexto[] {
    const formatacoes: FormatoTexto[] = [];
    
    // Padrões para detectar formatação
    const padroes = [
      { regex: /\*\*(.*?)\*\*/g, negrito: true }, // **texto**
      { regex: /\*(.*?)\*/g, italico: true }, // *texto*
      { regex: /__(.*?)__/g, negrito: true }, // __texto__
      { regex: /_(.*?)_/g, italico: true }, // _texto_
    ];

    let textoProcessado = texto;
    let posicaoAtual = 0;
    
    // Encontrar todas as ocorrências de formatação
    const matches: Array<{match: string, conteudo: string, tipo: string, start: number, end: number}> = [];
    
    padroes.forEach((padrao, index) => {
      const tipo = padrao.negrito ? 'negrito' : 'italico';
      let match;
      while ((match = padrao.regex.exec(texto)) !== null) {
        matches.push({
          match: match[0],
          conteudo: match[1],
          tipo,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    });

    // Ordenar matches por posição
    matches.sort((a, b) => a.start - b.start);

    // Processar matches em ordem
    matches.forEach(match => {
      // Adicionar texto antes da formatação
      if (match.start > posicaoAtual) {
        const textoAntes = texto.substring(posicaoAtual, match.start);
        if (textoAntes.trim()) {
          formatacoes.push({
            texto: textoAntes,
          });
        }
      }

      // Adicionar texto formatado
      formatacoes.push({
        texto: match.conteudo,
        negrito: match.tipo === 'negrito',
        italico: match.tipo === 'italico',
      });

      posicaoAtual = match.end;
    });

    // Adicionar texto restante
    if (posicaoAtual < texto.length) {
      const textoRestante = texto.substring(posicaoAtual);
      if (textoRestante.trim()) {
        formatacoes.push({
          texto: textoRestante,
        });
      }
    }

    // Se não há formatação específica, retorna o texto normal
    if (formatacoes.length === 0) {
      formatacoes.push({
        texto: textoProcessado,
      });
    }

    return formatacoes;
  }

  // Processar texto com formatação rica
  static processarTextoComFormatacao(texto: string): { texto: string; formato?: FormatoTexto[] } {
    const formato = this.extrairFormatacao(texto);
    
    // Criar texto limpo removendo formatação
    const textoLimpo = formato.map(f => f.texto).join('');

    return {
      texto: textoLimpo,
      formato: formato.length > 0 ? formato : undefined,
    };
  }

  // Detectar se o texto tem formatação
  static temFormatacao(texto: string): boolean {
    return /\*\*.*?\*\*|\*.*?\*|__.*?__|_.*?_/.test(texto);
  }
} 