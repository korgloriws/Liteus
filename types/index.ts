export interface FormatoTexto {
  texto: string;
  negrito?: boolean;
  italico?: boolean;
  cor?: string;
  tamanho?: number;
}

export interface Item {
  id: string;
  texto: string;
  html?: string;
  textoFormatado?: FormatoTexto[];
  descricao?: string;
  imagem?: string;
  data?: string;
  prioridade?: number;
  categoria?: string;
  categorias?: string[];
  tags?: string[];
  concluido?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Categoria {
  id: string;
  nome: string;
  cor?: string;
  createdAt: string;
}

export interface Lista {
  id: string;
  nome: string;
  descricao?: string;
  descricaoHtml?: string;
  cor: string;
  icone: string;
  dataCriacao: number;
  dataModificacao: number;
  itens: Item[];
  categorias: Categoria[];
  permiteSelecaoAleatoria?: boolean;
  tipoAnimacao?: 'simples';
}

export type OrdenacaoTipo = 'alfabetica' | 'data' | 'prioridade' | 'categoria' | 'ultimoModificado';
export type OrdenacaoDirecao = 'asc' | 'desc'; 

export interface FiltroBusca {
  texto: string;
  categoria?: string;
  tags?: string[];
}

export interface OpcoesOrdenacao {
  tipo: OrdenacaoTipo;
  direcao: OrdenacaoDirecao;
} 


export interface Nota {
  id: string;
  titulo: string;
  conteudo: string; 
  textoFormatado?: FormatoTexto[]; 
  cor?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  html?: string;
}