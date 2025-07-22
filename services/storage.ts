import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lista, Item, Categoria } from '../types';

const LISTAS_KEY = '@liteus_listas';

export class StorageService {
  // Salvar todas as listas
  static async salvarListas(listas: Lista[]): Promise<void> {
    try {
      await AsyncStorage.setItem(LISTAS_KEY, JSON.stringify(listas));
    } catch (error) {
      console.error('Erro ao salvar listas:', error);
      throw error;
    }
  }

  static async carregarListas(): Promise<Lista[]> {
    try {
      const data = await AsyncStorage.getItem(LISTAS_KEY);
      const listas = data ? JSON.parse(data) : [];
      

      return listas.map((lista: any) => ({
        ...lista,
        categorias: lista.categorias || [],
        itens: lista.itens || [],
      }));
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
      return [];
    }
  }

  // Alias para buscarTodasListas
  static async buscarTodasListas(): Promise<Lista[]> {
    return this.carregarListas();
  }

  // Adicionar nova lista
  static async adicionarLista(lista: Omit<Lista, 'id'>): Promise<Lista> {
    try {
      const listas = await this.carregarListas();
      const novaLista: Lista = {
        ...lista,
        categorias: lista.categorias || [],
        id: Date.now().toString(),
        dataCriacao: Date.now(),
        dataModificacao: Date.now(),
      };
      
      listas.push(novaLista);
      await this.salvarListas(listas);
      return novaLista;
    } catch (error) {
      console.error('Erro ao adicionar lista:', error);
      throw error;
    }
  }

  // Atualizar lista
  static async atualizarLista(id: string, dados: Partial<Lista>): Promise<Lista | null> {
    try {
      const listas = await this.carregarListas();
      const index = listas.findIndex(lista => lista.id === id);
      
      if (index === -1) return null;
      
      listas[index] = {
        ...listas[index],
        ...dados,
        dataModificacao: Date.now(),
      };
      
      await this.salvarListas(listas);
      return listas[index];
    } catch (error) {
      console.error('Erro ao atualizar lista:', error);
      throw error;
    }
  }

  // Remover lista
  static async removerLista(id: string): Promise<boolean> {
    try {
      const listas = await this.carregarListas();
      const listasFiltradas = listas.filter(lista => lista.id !== id);
      
      if (listasFiltradas.length === listas.length) return false;
      
      await this.salvarListas(listasFiltradas);
      return true;
    } catch (error) {
      console.error('Erro ao remover lista:', error);
      throw error;
    }
  }

  // Adicionar item à lista
  static async adicionarItem(listaId: string, item: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>): Promise<Item | null> {
    try {
      const listas = await this.carregarListas();
      const listaIndex = listas.findIndex(lista => lista.id === listaId);
      
      if (listaIndex === -1) return null;
      
      const novoItem: Item = {
        ...item,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      listas[listaIndex].itens.push(novoItem);
      listas[listaIndex].dataModificacao = Date.now();
      
      await this.salvarListas(listas);
      return novoItem;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      throw error;
    }
  }

  // Atualizar item
  static async atualizarItem(listaId: string, itemId: string, dados: Partial<Item>): Promise<Item | null> {
    try {
      const listas = await this.carregarListas();
      const listaIndex = listas.findIndex(lista => lista.id === listaId);
      
      if (listaIndex === -1) return null;
      
      const itemIndex = listas[listaIndex].itens.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return null;
      
      listas[listaIndex].itens[itemIndex] = {
        ...listas[listaIndex].itens[itemIndex],
        ...dados,
        updatedAt: new Date().toISOString(),
      };
      
      listas[listaIndex].dataModificacao = Date.now();
      await this.salvarListas(listas);
      return listas[listaIndex].itens[itemIndex];
    } catch (error) {
      console.error('Erro ao atualizar item:', error);
      throw error;
    }
  }

  // Remover item
  static async removerItem(listaId: string, itemId: string): Promise<boolean> {
    try {
      const listas = await this.carregarListas();
      const listaIndex = listas.findIndex(lista => lista.id === listaId);
      
      if (listaIndex === -1) return false;
      
      const itemIndex = listas[listaIndex].itens.findIndex(item => item.id === itemId);
      if (itemIndex === -1) return false;
      
      listas[listaIndex].itens.splice(itemIndex, 1);
      listas[listaIndex].dataModificacao = Date.now();
      
      await this.salvarListas(listas);
      return true;
    } catch (error) {
      console.error('Erro ao remover item:', error);
      throw error;
    }
  }

  // Buscar lista por ID
  static async buscarLista(id: string): Promise<Lista | null> {
    try {
      const listas = await this.carregarListas();
      const lista = listas.find(lista => lista.id === id);
      
      if (!lista) return null;
      

      return {
        ...lista,
        categorias: lista.categorias || [],
        itens: lista.itens || [],
      };
    } catch (error) {
      console.error('Erro ao buscar lista:', error);
      return null;
    }
  }

  // Duplicar lista
  static async duplicarLista(id: string): Promise<Lista | null> {
    try {
      const listaOriginal = await this.buscarLista(id);
      if (!listaOriginal) return null;

      const listaDuplicada: Lista = {
        ...listaOriginal,
        id: Date.now().toString(),
        nome: listaOriginal.nome,
        dataCriacao: Date.now(),
        dataModificacao: Date.now(),
        itens: listaOriginal.itens.map(item => ({
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };

      const listas = await this.carregarListas();
      listas.push(listaDuplicada);
      await this.salvarListas(listas);
      
      return listaDuplicada;
    } catch (error) {
      console.error('Erro ao duplicar lista:', error);
      throw error;
    }
  }

  // Duplicar item
  static async duplicarItem(listaId: string, itemId: string): Promise<Item | null> {
    try {
      const listas = await this.carregarListas();
      const listaIndex = listas.findIndex(lista => lista.id === listaId);
      
      if (listaIndex === -1) return null;
      
      const itemOriginal = listas[listaIndex].itens.find(item => item.id === itemId);
      if (!itemOriginal) return null;
      
      const itemDuplicado: Item = {
        ...itemOriginal,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        texto: itemOriginal.texto,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      listas[listaIndex].itens.push(itemDuplicado);
      listas[listaIndex].dataModificacao = Date.now();
      
      await this.salvarListas(listas);
      return itemDuplicado;
    } catch (error) {
      console.error('Erro ao duplicar item:', error);
      throw error;
    }
  }

  // Adicionar categoria à lista
  static async adicionarCategoria(listaId: string, categoria: Omit<Categoria, 'id' | 'createdAt'>): Promise<Categoria | null> {
    try {
      const listas = await this.carregarListas();
      const listaIndex = listas.findIndex(lista => lista.id === listaId);
      
      if (listaIndex === -1) return null;
      
      const novaCategoria: Categoria = {
        ...categoria,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };
      
      listas[listaIndex].categorias.push(novaCategoria);
      listas[listaIndex].dataModificacao = Date.now();
      
      await this.salvarListas(listas);
      return novaCategoria;
    } catch (error) {
      console.error('Erro ao adicionar categoria:', error);
      throw error;
    }
  }

  // Remover categoria da lista
  static async removerCategoria(listaId: string, categoriaId: string): Promise<boolean> {
    try {
      const listas = await this.carregarListas();
      const listaIndex = listas.findIndex(lista => lista.id === listaId);
      
      if (listaIndex === -1) return false;
      
      const categoriaIndex = listas[listaIndex].categorias.findIndex(cat => cat.id === categoriaId);
      if (categoriaIndex === -1) return false;
      
      listas[listaIndex].categorias.splice(categoriaIndex, 1);
      listas[listaIndex].dataModificacao = Date.now();
      
      await this.salvarListas(listas);
      return true;
    } catch (error) {
      console.error('Erro ao remover categoria:', error);
      throw error;
    }
  }
} 