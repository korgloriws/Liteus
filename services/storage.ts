import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lista, Item } from '../types';

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
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar listas:', error);
      return [];
    }
  }

  // Adicionar nova lista
  static async adicionarLista(lista: Omit<Lista, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lista> {
    try {
      const listas = await this.carregarListas();
      const novaLista: Lista = {
        ...lista,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
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
        updatedAt: new Date().toISOString(),
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
      listas[listaIndex].updatedAt = new Date().toISOString();
      
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
      
      listas[listaIndex].updatedAt = new Date().toISOString();
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
      listas[listaIndex].updatedAt = new Date().toISOString();
      
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
      return listas.find(lista => lista.id === id) || null;
    } catch (error) {
      console.error('Erro ao buscar lista:', error);
      return null;
    }
  }
} 