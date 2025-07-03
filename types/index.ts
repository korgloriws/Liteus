export interface Item {
  id: string;
  texto: string;
  descricao?: string;
  imagem?: string;
  data?: string;
  prioridade?: number;
  categoria?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Lista {
  id: string;
  nome: string;
  descricao?: string;
  cor?: string;
  icone?: string;
  itens: Item[];
  permiteSelecaoAleatoria: boolean;
  tipoAnimacao?: 'roleta' | 'cubo';
  createdAt: string;
  updatedAt: string;
}

export type OrdenacaoTipo = 'alfabetica' | 'data' | 'prioridade' | 'categoria';
export type OrdenacaoDirecao = 'asc' | 'desc'; 