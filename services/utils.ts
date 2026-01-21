import { Item, Lista, OrdenacaoTipo, OrdenacaoDirecao, FiltroBusca } from '../types';

export class UtilsService {
  // Ordenar itens por diferentes critérios
  static ordenarItens(itens: Item[], tipo: OrdenacaoTipo, direcao: OrdenacaoDirecao = 'asc'): Item[] {
    const itensOrdenados = [...itens];

    switch (tipo) {
      case 'alfabetica':
        itensOrdenados.sort((a, b) => {
          const comparacao = a.texto.localeCompare(b.texto, 'pt-BR');
          return direcao === 'asc' ? comparacao : -comparacao;
        });
        break;

      case 'data':
        itensOrdenados.sort((a, b) => {
          const dataA = new Date(a.createdAt).getTime();
          const dataB = new Date(b.createdAt).getTime();
          return direcao === 'asc' ? dataA - dataB : dataB - dataA;
        });
        break;

      case 'ultimoModificado':
        itensOrdenados.sort((a, b) => {
          const dataA = new Date(a.updatedAt).getTime();
          const dataB = new Date(b.updatedAt).getTime();
          return direcao === 'asc' ? dataA - dataB : dataB - dataA;
        });
        break;

      case 'prioridade':
        itensOrdenados.sort((a, b) => {
          const prioridadeA = a.prioridade || 0;
          const prioridadeB = b.prioridade || 0;
          return direcao === 'asc' ? prioridadeA - prioridadeB : prioridadeB - prioridadeA;
        });
        break;

      case 'categoria':
        itensOrdenados.sort((a, b) => {
          // Considerar tanto categoria única quanto múltiplas categorias
          const categoriaA = a.categoria || (a.categorias && a.categorias.length > 0 ? a.categorias[0] : '');
          const categoriaB = b.categoria || (b.categorias && b.categorias.length > 0 ? b.categorias[0] : '');
          const comparacao = categoriaA.localeCompare(categoriaB, 'pt-BR');
          return direcao === 'asc' ? comparacao : -comparacao;
        });
        break;
    }

    return itensOrdenados;
  }

  // Ordenar listas por diferentes critérios
  static ordenarListas(listas: Lista[], tipo: OrdenacaoTipo, direcao: OrdenacaoDirecao = 'asc'): Lista[] {
    const listasOrdenadas = [...listas];

    switch (tipo) {
      case 'alfabetica':
        listasOrdenadas.sort((a, b) => {
          const comparacao = a.nome.localeCompare(b.nome, 'pt-BR');
          return direcao === 'asc' ? comparacao : -comparacao;
        });
        break;

      case 'data':
        listasOrdenadas.sort((a, b) => {
          const dataA = a.dataCriacao;
          const dataB = b.dataCriacao;
          return direcao === 'asc' ? dataA - dataB : dataB - dataA;
        });
        break;

      case 'ultimoModificado':
        listasOrdenadas.sort((a, b) => {
          const dataA = a.dataModificacao;
          const dataB = b.dataModificacao;
          return direcao === 'asc' ? dataA - dataB : dataB - dataA;
        });
        break;

      case 'categoria':
        // Para listas, ordenar por quantidade de itens
        listasOrdenadas.sort((a, b) => {
          const quantidadeA = a.itens.length;
          const quantidadeB = b.itens.length;
          return direcao === 'asc' ? quantidadeA - quantidadeB : quantidadeB - quantidadeA;
        });
        break;
    }

    return listasOrdenadas;
  }

  // Buscar itens por texto, categoria e tags
  static buscarItens(itens: Item[], filtro: FiltroBusca): Item[] {
    return itens.filter(item => {
      // Busca por texto (nome e descrição)
      const textoBusca = filtro.texto.toLowerCase();
      const textoItem = item.texto.toLowerCase();
      const descricaoItem = (item.descricao || '').toLowerCase();
      
      const matchTexto = textoItem.includes(textoBusca) || descricaoItem.includes(textoBusca);

      // Busca por categoria (suporta múltiplas categorias)
      const matchCategoria = !filtro.categoria || 
        item.categoria === filtro.categoria || 
        (item.categorias && item.categorias.includes(filtro.categoria));

      // Busca por tags
      const matchTags = !filtro.tags || filtro.tags.length === 0 || 
        (item.tags && filtro.tags.some(tag => item.tags!.includes(tag)));

      return matchTexto && matchCategoria && matchTags;
    });
  }

  // Buscar listas por texto
  static buscarListas(listas: Lista[], texto: string): Lista[] {
    const textoBusca = texto.toLowerCase();
    
    return listas.filter(lista => {
      const nomeLista = lista.nome.toLowerCase();
      const descricaoLista = (lista.descricao || '').toLowerCase();
      
      return nomeLista.includes(textoBusca) || descricaoLista.includes(textoBusca);
    });
  }

  // Obter categorias únicas dos itens
  static obterCategorias(itens: Item[]): string[] {
    const categorias: string[] = [];
    
    itens.forEach(item => {
      // Adicionar categoria única se existir
      if (item.categoria && item.categoria.trim() !== '' && !categorias.includes(item.categoria)) {
        categorias.push(item.categoria);
      }
      
      // Adicionar múltiplas categorias se existirem
      if (item.categorias) {
        item.categorias.forEach(categoriaId => {
          if (categoriaId && categoriaId.trim() !== '' && !categorias.includes(categoriaId)) {
            categorias.push(categoriaId);
          }
        });
      }
    });
    
    return categorias.sort();
  }

  // Obter tags únicas dos itens
  static obterTags(itens: Item[]): string[] {
    const todasTags = itens
      .flatMap(item => item.tags || [])
      .filter(tag => tag && tag.trim() !== '');
    
    return [...new Set(todasTags)].sort();
  }

  // Formatar data para exibição
  static formatarData(data: string): string {
    const dataObj = new Date(data);
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    if (dataObj.toDateString() === hoje.toDateString()) {
      return 'Hoje';
    } else if (dataObj.toDateString() === ontem.toDateString()) {
      return 'Ontem';
    } else {
      return dataObj.toLocaleDateString('pt-BR');
    }
  }


  static filtrarEOrdenarItens(
    itens: Item[], 
    filtro: FiltroBusca, 
    ordenacao: { tipo: OrdenacaoTipo; direcao: OrdenacaoDirecao }
  ): Item[] {
    // Primeiro filtrar
    const itensFiltrados = this.buscarItens(itens, filtro);
    
    // Depois ordenar
    return this.ordenarItens(itensFiltrados, ordenacao.tipo, ordenacao.direcao);
  }
} 