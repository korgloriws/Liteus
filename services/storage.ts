import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lista, Item, Categoria, Nota, GlobalTag } from '../types';
import { localSyncService } from './localSyncService';

const LISTAS_KEY = '@liteus_listas';
const NOTAS_KEY = '@liteus_notas';
const TRASH_KEY = '@liteus_trash';
const TAGS_KEY = '@liteus_tags';

type TrashType = 'lista' | 'nota';
interface TrashEntry {
  id: string; // trash entry id
  type: TrashType;
  payload: any; // Lista | Nota
  deletedAt: string;
}

export class StorageService {
  private static tagsMigrated = false;

  static async carregarTags(): Promise<GlobalTag[]> {
    try {
      const data = await AsyncStorage.getItem(TAGS_KEY);
      const tags: GlobalTag[] = data ? JSON.parse(data) : [];
      return tags.map((t: any) => ({
        id: String(t.id),
        nome: t.nome || '',
        cor: t.cor,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.updatedAt || new Date().toISOString(),
        ownerListId: t.ownerListId,
        listIds: Array.isArray(t.listIds) ? t.listIds.map(String) : [],
      }));
    } catch (error) {
      console.error('Erro ao carregar tags globais:', error);
      return [];
    }
  }

  static async salvarTags(tags: GlobalTag[]): Promise<void> {
    try {
      await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(tags));
    } catch (error) {
      console.error('Erro ao salvar tags globais:', error);
      throw error;
    }
  }

  static async atualizarTagGlobal(tagId: string, dados: Partial<Pick<GlobalTag, 'nome' | 'cor'>>): Promise<GlobalTag | null> {
    try {
      const tags = await this.carregarTags();
      const idx = tags.findIndex((t) => t.id === tagId);
      if (idx === -1) return null;

      tags[idx] = {
        ...tags[idx],
        ...dados,
        updatedAt: new Date().toISOString(),
      };

      await this.salvarTags(tags);
      return tags[idx];
    } catch (error) {
      console.error('Erro ao atualizar tag global:', error);
      throw error;
    }
  }

  static async removerTagGlobal(tagId: string): Promise<boolean> {
    try {
      const [tags, listas] = await Promise.all([this.carregarTags(), this.carregarListas()]);
      const idx = tags.findIndex((t) => t.id === tagId);
      if (idx === -1) return false;

      tags.splice(idx, 1);

      const listasAtualizadas = listas.map((lista) => ({
        ...lista,
        tagIds: (lista.tagIds || []).filter((id) => id !== tagId),
        categorias: (lista.categorias || []).filter((cat) => cat.id !== tagId),
        itens: (lista.itens || []).map((item) => ({
          ...item,
          categoria: item.categoria === tagId ? undefined : item.categoria,
          categorias: Array.isArray(item.categorias)
            ? item.categorias.filter((id) => id !== tagId)
            : item.categorias,
        })),
      }));

      await Promise.all([
        this.salvarTags(tags),
        this.salvarListas(listasAtualizadas),
      ]);

      return true;
    } catch (error) {
      console.error('Erro ao remover tag global:', error);
      throw error;
    }
  }

  private static buildTagKey(nome?: string, cor?: string): string {
    return `${(nome || '').trim().toLowerCase()}::${(cor || '').trim().toLowerCase()}`;
  }

  private static async ensureGlobalTagsMigrated(): Promise<void> {
    if (this.tagsMigrated) return;

    const [rawListasData, existingTags] = await Promise.all([
      AsyncStorage.getItem(LISTAS_KEY),
      this.carregarTags(),
    ]);

    const rawListas: Lista[] = rawListasData ? JSON.parse(rawListasData) : [];
    if (!Array.isArray(rawListas) || rawListas.length === 0) {
      this.tagsMigrated = true;
      return;
    }

    let tags = [...existingTags];
    const byKey = new Map<string, GlobalTag>();
    tags.forEach((t) => byKey.set(this.buildTagKey(t.nome, t.cor), t));
    let changed = false;

    const migratedListas = rawListas.map((lista: any) => {
      const categorias: Categoria[] = Array.isArray(lista.categorias) ? lista.categorias : [];
      const tagIds = new Set<string>(Array.isArray(lista.tagIds) ? lista.tagIds : []);
      const oldToGlobal = new Map<string, string>();

      for (const cat of categorias) {
        const key = this.buildTagKey(cat.nome, cat.cor);
        let tag = byKey.get(key);
        if (!tag) {
          tag = {
            id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            nome: cat.nome,
            cor: cat.cor,
            createdAt: cat.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ownerListId: lista.id,
            listIds: [lista.id],
          };
          byKey.set(key, tag);
          tags.push(tag);
          changed = true;
        } else if (!tag.listIds.includes(lista.id)) {
          tag.listIds.push(lista.id);
          tag.updatedAt = new Date().toISOString();
          changed = true;
        }

        oldToGlobal.set(String(cat.id), tag.id);
        tagIds.add(tag.id);
      }

      const itens = Array.isArray(lista.itens) ? lista.itens.map((item: any) => {
        const catIds = Array.isArray(item.categorias) ? item.categorias.map((id: string) => oldToGlobal.get(String(id)) || String(id)) : [];
        const single = item.categoria ? (oldToGlobal.get(String(item.categoria)) || String(item.categoria)) : item.categoria;
        return {
          ...item,
          categorias: catIds.length > 0 ? catIds : item.categorias,
          categoria: single,
        };
      }) : [];

      return {
        ...lista,
        itens,
        tagIds: Array.from(tagIds),
      };
    });

    if (changed || migratedListas.some((l: any) => !Array.isArray(l.tagIds))) {
      await Promise.all([
        AsyncStorage.setItem(LISTAS_KEY, JSON.stringify(migratedListas)),
        this.salvarTags(tags),
      ]);
    }

    this.tagsMigrated = true;
  }

  private static async syncCategoriasToGlobal(listaId: string, categorias: Categoria[]): Promise<{ categorias: Categoria[]; tagIds: string[] }> {
    const tags = await this.carregarTags();
    const byKey = new Map<string, GlobalTag>();
    tags.forEach((t) => byKey.set(this.buildTagKey(t.nome, t.cor), t));

    const normalizedCats: Categoria[] = [];
    const tagIds: string[] = [];

    for (const cat of categorias || []) {
      const key = this.buildTagKey(cat.nome, cat.cor);
      let tag = byKey.get(key);

      if (!tag) {
        tag = {
          id: cat.id || `tag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nome: cat.nome,
          cor: cat.cor,
          createdAt: cat.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerListId: listaId,
          listIds: [listaId],
        };
        tags.push(tag);
        byKey.set(key, tag);
      } else {
        if (!tag.listIds.includes(listaId)) {
          tag.listIds.push(listaId);
        }
        tag.updatedAt = new Date().toISOString();
      }

      tagIds.push(tag.id);
      normalizedCats.push({
        id: tag.id,
        nome: tag.nome,
        cor: tag.cor,
        createdAt: tag.createdAt,
      });
    }

    for (const tag of tags) {
      if (tag.listIds.includes(listaId) && !tagIds.includes(tag.id)) {
        tag.listIds = tag.listIds.filter((id) => id !== listaId);
        tag.updatedAt = new Date().toISOString();
      }
    }

    await this.salvarTags(tags);
    return { categorias: normalizedCats, tagIds: Array.from(new Set(tagIds)) };
  }
  // =============================
  // Lixeira - 30 dias
  // =============================
  private static async carregarLixeiraRaw(): Promise<TrashEntry[]> {
    try {
      const data = await AsyncStorage.getItem(TRASH_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }
  private static async salvarLixeira(entries: TrashEntry[]): Promise<void> {
    await AsyncStorage.setItem(TRASH_KEY, JSON.stringify(entries));
  }
  static async carregarLixeira(): Promise<TrashEntry[]> {
    await this.purgeLixeiraExpirada();
    return await this.carregarLixeiraRaw();
  }
  static async adicionarNaLixeira(type: TrashType, payload: any): Promise<void> {
    const entries = await this.carregarLixeiraRaw();
    const entry: TrashEntry = {
      id: Date.now().toString() + Math.random().toString(36).slice(2, 8),
      type,
      payload,
      deletedAt: new Date().toISOString(),
    };
    entries.unshift(entry);
    await this.salvarLixeira(entries);
  }
  static async excluirDaLixeira(trashId: string): Promise<boolean> {
    const entries = await this.carregarLixeiraRaw();
    const next = entries.filter(e => e.id !== trashId);
    if (next.length === entries.length) return false;
    await this.salvarLixeira(next);
    return true;
  }
  static async esvaziarLixeira(): Promise<void> {
    await this.salvarLixeira([]);
  }
  static async purgeLixeiraExpirada(): Promise<void> {
    const entries = await this.carregarLixeiraRaw();
    const now = Date.now();
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    const next = entries.filter(e => {
      const t = new Date(e.deletedAt).getTime();
      return isFinite(t) && (now - t) < THIRTY_DAYS;
    });
    if (next.length !== entries.length) {
      await this.salvarLixeira(next);
    }
  }
  static async restaurarDaLixeira(trashId: string): Promise<boolean> {
    const entries = await this.carregarLixeiraRaw();
    const idx = entries.findIndex(e => e.id === trashId);
    if (idx === -1) return false;
    const entry = entries[idx];
    // Restaurar conforme o tipo
    if (entry.type === 'lista') {
      const listas = await this.carregarListas();
      // se já existir id, gera novo
      const exists = listas.some(l => l.id === entry.payload?.id);
      const listaToRestore: Lista = {
        ...(entry.payload as Lista),
        id: exists ? Date.now().toString() : String(entry.payload?.id),
        dataModificacao: Date.now(),
      };
      listas.push(listaToRestore);
      await this.salvarListas(listas);
      try { await localSyncService.onListaCreated(listaToRestore); } catch {}
    } else if (entry.type === 'nota') {
      const notas = await this.carregarNotas();
      const exists = notas.some(n => n.id === entry.payload?.id);
      const notaToRestore: Nota = {
        ...(entry.payload as Nota),
        id: exists ? Date.now().toString() : String(entry.payload?.id),
        updatedAt: new Date().toISOString(),
      };
      notas.push(notaToRestore);
      await this.salvarNotas(notas);
      try { await localSyncService.onNotaCreated(notaToRestore); } catch {}
    }
    // remover da lixeira
    entries.splice(idx, 1);
    await this.salvarLixeira(entries);
    return true;
  }

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
      await this.ensureGlobalTagsMigrated();
      const data = await AsyncStorage.getItem(LISTAS_KEY);
      const listas = data ? JSON.parse(data) : [];

      const tags = await this.carregarTags();
      const tagsById = new Map(tags.map((t) => [t.id, t]));

      return listas.map((lista: any) => {
        const tagIds: string[] = Array.isArray(lista.tagIds) ? lista.tagIds : [];
        const categoriasFromTags: Categoria[] = tagIds
          .map((tagId) => tagsById.get(String(tagId)))
          .filter(Boolean)
          .map((tag) => ({
            id: tag!.id,
            nome: tag!.nome,
            cor: tag!.cor,
            createdAt: tag!.createdAt,
          }));

        return {
          ...lista,
          tagIds,
          categorias: categoriasFromTags.length > 0 ? categoriasFromTags : (lista.categorias || []),
          itens: lista.itens || [],
        };
      });
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
        tagIds: lista.tagIds || [],
        id: Date.now().toString(),
        dataCriacao: Date.now(),
        dataModificacao: Date.now(),
      };

      if (novaLista.categorias.length > 0) {
        const synced = await this.syncCategoriasToGlobal(novaLista.id, novaLista.categorias);
        novaLista.categorias = synced.categorias;
        novaLista.tagIds = synced.tagIds;
      }
      
      listas.push(novaLista);
      await this.salvarListas(listas);
      
      // Adicionar à fila de sincronização
      try {
        await localSyncService.onListaCreated(novaLista);
      } catch (syncError) {
        console.log('Erro ao adicionar à fila de sync:', syncError);
      }
      
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

      if (dados.categorias) {
        const synced = await this.syncCategoriasToGlobal(id, dados.categorias);
        listas[index].categorias = synced.categorias;
        listas[index].tagIds = synced.tagIds;
      }
      
      await this.salvarListas(listas);
      
      // Adicionar à fila de sincronização
      try {
        await localSyncService.onListaUpdated(listas[index]);
      } catch (syncError) {
        console.log('Erro ao adicionar à fila de sync:', syncError);
      }
      
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
      const listaRemovida = listas.find(lista => lista.id === id);
      const listasFiltradas = listas.filter(lista => lista.id !== id);
      
      if (listasFiltradas.length === listas.length) return false;
      
      await this.salvarListas(listasFiltradas);
      if (listaRemovida) {
        // Mover para lixeira
        await this.adicionarNaLixeira('lista', listaRemovida);
        // Notificar remoção
        try { await localSyncService.onListaDeleted(listaRemovida.id); } catch {}
      }
      
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
        tagIds: listaOriginal.tagIds || listaOriginal.categorias.map((c) => c.id),
        itens: listaOriginal.itens.map(item => ({
          ...item,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })),
      };

      const listas = await this.carregarListas();
      listas.push(listaDuplicada);
      if (listaDuplicada.categorias.length > 0) {
        const synced = await this.syncCategoriasToGlobal(listaDuplicada.id, listaDuplicada.categorias);
        listaDuplicada.categorias = synced.categorias;
        listaDuplicada.tagIds = synced.tagIds;
      }
      await this.salvarListas(listas);
      
      // Adicionar à fila de sincronização
      try {
        await localSyncService.onListaCreated(listaDuplicada);
      } catch (syncError) {
        console.log('Erro ao adicionar à fila de sync:', syncError);
      }
      
      return listaDuplicada;
    } catch (error) {
      console.error('Erro ao duplicar lista:', error);
      throw error;
    }
  }

  // Criar lista sem sincronização (para importação)
  static async criarLista(lista: Lista): Promise<void> {
    try {
      const listas = await this.carregarListas();
      listas.push(lista);
      if (lista.categorias.length > 0) {
        const synced = await this.syncCategoriasToGlobal(lista.id, lista.categorias);
        lista.categorias = synced.categorias;
        lista.tagIds = synced.tagIds;
      }
      await this.salvarListas(listas);
    } catch (error) {
      console.error('Erro ao criar lista:', error);
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


  static async atualizarCategoria(listaId: string, categoriaId: string, dados: Partial<Categoria>): Promise<Categoria | null> {
    try {
      const listas = await this.carregarListas();
      const listaIndex = listas.findIndex(lista => lista.id === listaId);
      
      if (listaIndex === -1) return null;
      
      const categoriaIndex = listas[listaIndex].categorias.findIndex(cat => cat.id === categoriaId);
      if (categoriaIndex === -1) return null;
      
      listas[listaIndex].categorias[categoriaIndex] = {
        ...listas[listaIndex].categorias[categoriaIndex],
        ...dados
      };
      
      listas[listaIndex].dataModificacao = Date.now();
      await this.salvarListas(listas);
      
      return listas[listaIndex].categorias[categoriaIndex];
    } catch (error) {
      console.error('Erro ao atualizar categoria:', error);
      throw error;
    }
  }

  // =============================
  // Notas - CRUD
  // =============================
  static async carregarNotas(): Promise<Nota[]> {
    try {
      const data = await AsyncStorage.getItem(NOTAS_KEY);
      const notas: Nota[] = data ? JSON.parse(data) : [];
      // Normalizar estrutura para compatibilidade futura
      return notas.map((n: any) => ({
        id: String(n.id),
        titulo: n.titulo || '',
        conteudo: n.conteudo || '',
        textoFormatado: n.textoFormatado || undefined,
        cor: n.cor,
        tags: n.tags || undefined,
        createdAt: n.createdAt || new Date().toISOString(),
        updatedAt: n.updatedAt || new Date().toISOString(),
        html: n.html,
      }));
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      return [];
    }
  }

  static async salvarNotas(notas: Nota[]): Promise<void> {
    try {
      await AsyncStorage.setItem(NOTAS_KEY, JSON.stringify(notas));
    } catch (error) {
      console.error('Erro ao salvar notas:', error);
      throw error;
    }
  }

  static async adicionarNota(nota: Omit<Nota, 'id' | 'createdAt' | 'updatedAt'>): Promise<Nota> {
    try {
      const notas = await this.carregarNotas();
      const novaNota: Nota = {
        ...nota,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      notas.push(novaNota);
      await this.salvarNotas(notas);
      try {
        await localSyncService.onNotaCreated(novaNota);
      } catch (syncError) {
        console.log('Erro ao adicionar nota à fila de sync:', syncError);
      }
      return novaNota;
    } catch (error) {
      console.error('Erro ao adicionar nota:', error);
      throw error;
    }
  }

  static async atualizarNota(id: string, dados: Partial<Nota>): Promise<Nota | null> {
    try {
      const notas = await this.carregarNotas();
      const index = notas.findIndex(n => n.id === id);
      if (index === -1) return null;
      notas[index] = {
        ...notas[index],
        ...dados,
        updatedAt: new Date().toISOString(),
      };
      await this.salvarNotas(notas);
      try {
        await localSyncService.onNotaUpdated(notas[index]);
      } catch (syncError) {
        console.log('Erro ao adicionar atualização de nota à fila de sync:', syncError);
      }
      return notas[index];
    } catch (error) {
      console.error('Erro ao atualizar nota:', error);
      throw error;
    }
  }

  static async removerNota(id: string): Promise<boolean> {
    try {
      const notas = await this.carregarNotas();
      const nota = notas.find(n => n.id === id);
      const filtradas = notas.filter(n => n.id !== id);
      if (filtradas.length === notas.length) return false;
      await this.salvarNotas(filtradas);
      if (nota) {
        await this.adicionarNaLixeira('nota', nota);
        try { await localSyncService.onNotaDeleted(id); } catch {}
      }
      return true;
    } catch (error) {
      console.error('Erro ao remover nota:', error);
      throw error;
    }
  }

  static async buscarNota(id: string): Promise<Nota | null> {
    try {
      const notas = await this.carregarNotas();
      const nota = notas.find(n => n.id === id) || null;
      return nota;
    } catch (error) {
      console.error('Erro ao buscar nota:', error);
      return null;
    }
  }

  static async duplicarNota(id: string): Promise<Nota | null> {
    try {
      const original = await this.buscarNota(id);
      if (!original) return null;

      const notaDuplicada: Nota = {
        ...original,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const notas = await this.carregarNotas();
      notas.push(notaDuplicada);
      await this.salvarNotas(notas);
      try {
        await localSyncService.onNotaCreated(notaDuplicada);
      } catch (syncError) {
        console.log('Erro ao adicionar duplicação de nota à fila de sync:', syncError);
      }
      return notaDuplicada;
    } catch (error) {
      console.error('Erro ao duplicar nota:', error);
      throw error;
    }
  }
} 