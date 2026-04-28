import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Lista, Item, Categoria, Nota, GlobalTag } from '../types';
import { StorageService } from './storage';

export interface SyncData {
  lists: Lista[];
  notes?: Nota[];
  tags?: GlobalTag[];
  metadata: {
    exportadoEm: string;
    versao: string;
    dispositivo: string;
    totalListas: number;
    totalItens: number;
    totalNotas?: number;
    totalTags?: number;
  };
}

export interface SyncStatus {
  lastSync: string | null;
  isOnline: boolean;
  pendingChanges: number;
  lastExport: string | null;
  lastImport: string | null;
}

class LocalSyncService {
  private static instance: LocalSyncService;
  private syncQueue: Array<{ type: 'create' | 'update' | 'delete'; data: any; timestamp: number }> = [];
  private deviceId: string | null = null;
  private isInitialized = false;
  private autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncInProgress = false;

  static getInstance(): LocalSyncService {
    if (!LocalSyncService.instance) {
      LocalSyncService.instance = new LocalSyncService();
    }
    return LocalSyncService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      
      this.deviceId = await this.getOrCreateDeviceId();
      
     
      await this.loadSyncQueue();
      this.scheduleAutoSync();
      
      this.isInitialized = true;
      console.log('LocalSyncService inicializado');
    } catch (error) {
      console.error('Erro ao inicializar LocalSyncService:', error);
    }
  }

  private async getOrCreateDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem('@liteus_device_id');
      if (!deviceId) {
        deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('@liteus_device_id', deviceId);
      }
      return deviceId;
    } catch (error) {
      console.error('Erro ao gerar device ID:', error);
      return `device_${Date.now()}`;
    }
  }

  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('@liteus_sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Erro ao carregar fila de sincronização:', error);
      this.syncQueue = [];
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('@liteus_sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Erro ao salvar fila de sincronização:', error);
    }
  }

  
  async addToSyncQueue(type: 'create' | 'update' | 'delete', data: any): Promise<void> {
    this.syncQueue.push({
      type,
      data,
      timestamp: Date.now()
    });
    await this.saveSyncQueue();
    this.scheduleAutoSync();
  }

  private scheduleAutoSync(delayMs: number = 700): void {
    if (this.autoSyncTimer) {
      clearTimeout(this.autoSyncTimer);
    }
    this.autoSyncTimer = setTimeout(() => {
      this.syncData().catch((error) => {
        console.error('Erro no auto-sync:', error);
      });
    }, delayMs);
  }


  async getSyncQueue(): Promise<Array<{ type: 'create' | 'update' | 'delete'; data: any; timestamp: number }>> {
    return [...this.syncQueue];
  }


  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

 
  async isOnline(): Promise<boolean> {
    try {
      const response = await fetch('https://www.google.com', { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Exportar dados para arquivo local
  async exportData(): Promise<{ success: boolean; filePath?: string; message: string }> {
    try {
      const listas = await StorageService.carregarListas();
      const notas = await StorageService.carregarNotas();
      const tags = await StorageService.carregarTags();
      
      const syncData: SyncData = {
        lists: listas,
        notes: notas,
        tags,
        metadata: {
          exportadoEm: new Date().toISOString(),
          versao: '1.0.0',
          dispositivo: this.deviceId || 'unknown',
          totalListas: listas.length,
          totalItens: listas.reduce((total, lista) => total + lista.itens.length, 0),
          totalNotas: notas.length,
          totalTags: tags.length,
        }
      };

      const fileName = `liteus_backup_${new Date().toISOString().split('T')[0]}.json`;
      const dir: string = (FileSystemLegacy as any).documentDirectory || (FileSystemLegacy as any).cacheDirectory || '';
      const filePath = `${dir}${fileName}`;
      
      await FileSystemLegacy.writeAsStringAsync(filePath, JSON.stringify(syncData, null, 2));
      
      // Salvar timestamp do último export
      await AsyncStorage.setItem('@liteus_last_export', new Date().toISOString());
      
      return {
        success: true,
        filePath,
        message: `Backup criado com ${listas.length} listas, ${notas.length} notas e ${tags.length} tags`
      };
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      return {
        success: false,
        message: 'Falha ao criar backup'
      };
    }
  }

  // Exportar apenas uma lista individual em formato compatível
  async exportSingleList(lista: Lista): Promise<{ success: boolean; filePath?: string; message: string }> {
    try {
      const notasVazias: Nota[] = [];
      const tags = await StorageService.carregarTags();
      const tagIds = new Set<string>((lista.tagIds || []).concat((lista.categorias || []).map((c) => c.id)));
      const tagsDaLista = tags.filter((t) => tagIds.has(t.id));

      const syncData: SyncData = {
        lists: [lista],
        notes: notasVazias,
        tags: tagsDaLista,
        metadata: {
          exportadoEm: new Date().toISOString(),
          versao: '1.0.0',
          dispositivo: this.deviceId || 'unknown',
          totalListas: 1,
          totalItens: lista.itens.length,
          totalNotas: 0,
          totalTags: tagsDaLista.length,
        },
      };

      const safeNome = (lista.nome || 'lista')
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, '_')
        .slice(0, 40);

      const fileName = `liteus_lista_${safeNome || 'sem_nome'}_${new Date()
        .toISOString()
        .split('T')[0]}.json`;
      const dir: string =
        (FileSystemLegacy as any).documentDirectory ||
        (FileSystemLegacy as any).cacheDirectory ||
        '';
      const filePath = `${dir}${fileName}`;

      await FileSystemLegacy.writeAsStringAsync(
        filePath,
        JSON.stringify(syncData, null, 2)
      );

      return {
        success: true,
        filePath,
        message: `Backup criado para a lista "${lista.nome}" com ${lista.itens.length} itens`,
      };
    } catch (error) {
      console.error('Erro ao exportar lista individual:', error);
      return {
        success: false,
        message: 'Falha ao criar backup da lista',
      };
    }
  }

  // Exportar apenas uma nota individual em formato compatível
  async exportSingleNote(nota: Nota): Promise<{ success: boolean; filePath?: string; message: string }> {
    try {
      const listasVazias: Lista[] = [];
      const tags = await StorageService.carregarTags();

      const syncData: SyncData = {
        lists: listasVazias,
        notes: [nota],
        tags,
        metadata: {
          exportadoEm: new Date().toISOString(),
          versao: '1.0.0',
          dispositivo: this.deviceId || 'unknown',
          totalListas: 0,
          totalItens: 0,
          totalNotas: 1,
          totalTags: tags.length,
        },
      };

      const safeTitulo = (nota.titulo || 'nota')
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, '_')
        .slice(0, 40);

      const fileName = `liteus_nota_${safeTitulo || 'sem_titulo'}_${new Date()
        .toISOString()
        .split('T')[0]}.json`;
      const dir: string =
        (FileSystemLegacy as any).documentDirectory ||
        (FileSystemLegacy as any).cacheDirectory ||
        '';
      const filePath = `${dir}${fileName}`;

      await FileSystemLegacy.writeAsStringAsync(
        filePath,
        JSON.stringify(syncData, null, 2)
      );

      return {
        success: true,
        filePath,
        message: `Backup criado para a nota "${nota.titulo || 'Sem título'}"`,
      };
    } catch (error) {
      console.error('Erro ao exportar nota individual:', error);
      return {
        success: false,
        message: 'Falha ao criar backup da nota',
      };
    }
  }

  // Compartilhar arquivo de backup
  async shareBackup(): Promise<{ success: boolean; message: string }> {
    try {
      const exportResult = await this.exportData();
      
      if (!exportResult.success || !exportResult.filePath) {
        return { success: false, message: exportResult.message };
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        return { success: false, message: 'Compartilhamento não disponível neste dispositivo' };
      }

      await Sharing.shareAsync(exportResult.filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Compartilhar Backup do Liteus'
      });

      return { success: true, message: 'Backup compartilhado com sucesso!' };
    } catch (error) {
      console.error('Erro ao compartilhar backup:', error);
      return { success: false, message: 'Erro ao compartilhar backup' };
    }
  }

  // Compartilhar apenas uma lista específica em JSON
  async shareList(lista: Lista): Promise<{ success: boolean; message: string }> {
    try {
      const exportResult = await this.exportSingleList(lista);

      if (!exportResult.success || !exportResult.filePath) {
        return { success: false, message: exportResult.message };
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        return {
          success: false,
          message: 'Compartilhamento não disponível neste dispositivo',
        };
      }

      await Sharing.shareAsync(exportResult.filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Compartilhar Lista (JSON) - Liteus',
      });

      return { success: true, message: 'Lista compartilhada com sucesso!' };
    } catch (error) {
      console.error('Erro ao compartilhar lista individual:', error);
      return { success: false, message: 'Erro ao compartilhar lista' };
    }
  }

  // Compartilhar apenas uma nota específica em JSON
  async shareNote(nota: Nota): Promise<{ success: boolean; message: string }> {
    try {
      const exportResult = await this.exportSingleNote(nota);

      if (!exportResult.success || !exportResult.filePath) {
        return { success: false, message: exportResult.message };
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        return {
          success: false,
          message: 'Compartilhamento não disponível neste dispositivo',
        };
      }

      await Sharing.shareAsync(exportResult.filePath, {
        mimeType: 'application/json',
        dialogTitle: 'Compartilhar Nota (JSON) - Liteus',
      });

      return { success: true, message: 'Nota compartilhada com sucesso!' };
    } catch (error) {
      console.error('Erro ao compartilhar nota individual:', error);
      return { success: false, message: 'Erro ao compartilhar nota' };
    }
  }

  // Importar dados de arquivo
  async importData(): Promise<{ success: boolean; message: string; imported: number }> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return { success: false, message: 'Nenhum arquivo selecionado', imported: 0 };
      }

      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystemLegacy.readAsStringAsync(fileUri, { encoding: 'utf8' as any });
      
      const syncData: SyncData = JSON.parse(fileContent);
      
      if (!syncData.lists || !Array.isArray(syncData.lists)) {
        return { success: false, message: 'Formato de arquivo inválido', imported: 0 };
      }

      const listasExistentes = await StorageService.carregarListas();
      const notasExistentes = await StorageService.carregarNotas();
      let imported = 0;
      const conflitos: string[] = [];

      if (Array.isArray(syncData.tags)) {
        const atuais = await StorageService.carregarTags();
        const map = new Map(atuais.map((t) => [t.id, t]));
        for (const tag of syncData.tags) {
          const existing = map.get(tag.id);
          if (!existing) {
            map.set(tag.id, {
              ...tag,
              listIds: Array.isArray(tag.listIds) ? tag.listIds : [],
              updatedAt: tag.updatedAt || new Date().toISOString(),
              createdAt: tag.createdAt || new Date().toISOString(),
            });
          } else {
            map.set(tag.id, {
              ...existing,
              ...tag,
              listIds: Array.from(new Set([...(existing.listIds || []), ...((tag.listIds || []))])),
              updatedAt: new Date().toISOString(),
            });
          }
        }
        await StorageService.salvarTags(Array.from(map.values()));
      }
      
      for (const lista of syncData.lists) {
        const listaExistente = listasExistentes.find(l => l.nome === lista.nome);
        
        if (listaExistente) {
          // Atualizar lista existente
          await StorageService.atualizarLista(listaExistente.id, lista);
          conflitos.push(`Lista "${lista.nome}" foi atualizada`);
        } else {
          // Criar nova lista
          await StorageService.criarLista(lista);
          imported++;
        }
      }

      // Importar notas (se houver no arquivo)
      if (Array.isArray(syncData.notes)) {
        const notasAtuais = await StorageService.carregarNotas();
        let notasAlteradas = 0;
        for (const nota of syncData.notes) {
          const byId = notasAtuais.find(n => n.id === nota.id);
          if (byId) {
            // atualizar existente pelo id
            await StorageService.atualizarNota(byId.id, {
              titulo: nota.titulo,
              conteudo: nota.conteudo,
              html: nota.html,
              cor: nota.cor,
              tags: nota.tags,
            });
            notasAlteradas++;
          } else {
            // criar nova preservando conteúdo
            await StorageService.adicionarNota({
              titulo: nota.titulo,
              conteudo: nota.conteudo,
              html: nota.html,
              cor: nota.cor,
              tags: nota.tags,
              textoFormatado: nota.textoFormatado,
            });
            notasAlteradas++;
          }
        }
        if (notasAlteradas > 0) {
          conflitos.push(`${notasAlteradas} notas importadas/atualizadas`);
        }
      }
      
      // Salvar timestamp do último import
      await AsyncStorage.setItem('@liteus_last_import', new Date().toISOString());
      
      return {
        success: true,
        message: `Importação concluída! ${imported} listas importadas. ${conflitos.join(' | ')}`,
        imported
      };
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return {
        success: false,
        message: 'Falha ao importar dados. Verifique o formato do arquivo.',
        imported: 0
      };
    }
  }

  // Sincronizar dados (processar fila)
  async syncData(): Promise<{ success: boolean; message: string; changes: number }> {
    if (this.isSyncInProgress) {
      return {
        success: true,
        message: 'Sincronização já em andamento',
        changes: 0,
      };
    }

    try {
      this.isSyncInProgress = true;
      const queue = await this.getSyncQueue();
      
      if (queue.length === 0) {
        return {
          success: true,
          message: 'Nenhuma mudança pendente para sincronizar',
          changes: 0
        };
      }

      console.log(`Processando ${queue.length} mudanças da fila`);
      
      // Limpar fila após processamento
      await this.clearSyncQueue();
      
      // Atualizar timestamp da última sincronização
      await this.updateLastSync();
      
      return {
        success: true,
        message: `${queue.length} mudanças sincronizadas com sucesso`,
        changes: queue.length
      };
    } catch (error) {
      console.error('Erro ao sincronizar dados:', error);
      return {
        success: false,
        message: 'Erro na sincronização',
        changes: 0
      };
    } finally {
      this.isSyncInProgress = false;
    }
  }

  private async updateLastSync(): Promise<void> {
    try {
      await AsyncStorage.setItem('@liteus_last_sync', new Date().toISOString());
    } catch (error) {
      console.error('Erro ao atualizar timestamp de sincronização:', error);
    }
  }

  // Obter status da sincronização
  async getSyncStatus(): Promise<SyncStatus> {
    try {
      const [lastSync, lastExport, lastImport, queue] = await Promise.all([
        AsyncStorage.getItem('@liteus_last_sync'),
        AsyncStorage.getItem('@liteus_last_export'),
        AsyncStorage.getItem('@liteus_last_import'),
        this.getSyncQueue()
      ]);

      return {
        lastSync,
        isOnline: await this.isOnline(),
        pendingChanges: queue.length,
        lastExport,
        lastImport
      };
    } catch (error) {
      console.error('Erro ao obter status de sincronização:', error);
      return {
        lastSync: null,
        isOnline: false,
        pendingChanges: 0,
        lastExport: null,
        lastImport: null
      };
    }
  }

  // Event handlers para mudanças nas listas
  async onListaCreated(lista: Lista): Promise<void> {
    await this.addToSyncQueue('create', lista);
  }

  async onListaUpdated(lista: Lista): Promise<void> {
    await this.addToSyncQueue('update', lista);
  }

  async onListaDeleted(listaId: string): Promise<void> {
    await this.addToSyncQueue('delete', { id: listaId });
  }

  // Event handlers para mudanças nas notas
  async onNotaCreated(nota: Nota): Promise<void> {
    await this.addToSyncQueue('create', { entity: 'nota', ...nota });
  }

  async onNotaUpdated(nota: Nota): Promise<void> {
    await this.addToSyncQueue('update', { entity: 'nota', ...nota });
  }

  async onNotaDeleted(notaId: string): Promise<void> {
    await this.addToSyncQueue('delete', { entity: 'nota', id: notaId });
  }

  // Limpar dados de sincronização
  async clearSyncData(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem('@liteus_sync_queue'),
        AsyncStorage.removeItem('@liteus_last_sync'),
        AsyncStorage.removeItem('@liteus_last_export'),
        AsyncStorage.removeItem('@liteus_last_import'),
        AsyncStorage.removeItem('@liteus_device_id')
      ]);
      
      this.syncQueue = [];
      this.deviceId = null;
      this.isInitialized = false;
      
      console.log('Dados de sincronização limpos');
    } catch (error) {
      console.error('Erro ao limpar dados de sincronização:', error);
    }
  }
}

export const localSyncService = LocalSyncService.getInstance(); 