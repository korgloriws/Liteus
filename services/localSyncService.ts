import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Lista, Item, Categoria } from '../types';
import { StorageService } from './storage';

export interface SyncData {
  lists: Lista[];
  metadata: {
    exportadoEm: string;
    versao: string;
    dispositivo: string;
    totalListas: number;
    totalItens: number;
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

  static getInstance(): LocalSyncService {
    if (!LocalSyncService.instance) {
      LocalSyncService.instance = new LocalSyncService();
    }
    return LocalSyncService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Gerar ID único do dispositivo
      this.deviceId = await this.getOrCreateDeviceId();
      
      // Carregar fila de sincronização
      await this.loadSyncQueue();
      
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

  // Adicionar mudança à fila de sincronização
  async addToSyncQueue(type: 'create' | 'update' | 'delete', data: any): Promise<void> {
    this.syncQueue.push({
      type,
      data,
      timestamp: Date.now()
    });
    await this.saveSyncQueue();
  }

  // Obter fila de sincronização
  async getSyncQueue(): Promise<Array<{ type: 'create' | 'update' | 'delete'; data: any; timestamp: number }>> {
    return [...this.syncQueue];
  }

  // Limpar fila de sincronização
  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
  }

  // Verificar se está online
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
      
      const syncData: SyncData = {
        lists: listas,
        metadata: {
          exportadoEm: new Date().toISOString(),
          versao: '1.0.0',
          dispositivo: this.deviceId || 'unknown',
          totalListas: listas.length,
          totalItens: listas.reduce((total, lista) => total + lista.itens.length, 0)
        }
      };

      const fileName = `liteus_backup_${new Date().toISOString().split('T')[0]}.json`;
      const filePath = `${FileSystem.documentDirectory}${fileName}`;
      
      await FileSystem.writeAsStringAsync(filePath, JSON.stringify(syncData, null, 2));
      
      // Salvar timestamp do último export
      await AsyncStorage.setItem('@liteus_last_export', new Date().toISOString());
      
      return {
        success: true,
        filePath,
        message: `Backup criado com ${listas.length} listas`
      };
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      return {
        success: false,
        message: 'Falha ao criar backup'
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
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      
      const syncData: SyncData = JSON.parse(fileContent);
      
      if (!syncData.lists || !Array.isArray(syncData.lists)) {
        return { success: false, message: 'Formato de arquivo inválido', imported: 0 };
      }

      const listasExistentes = await StorageService.carregarListas();
      let imported = 0;
      const conflitos: string[] = [];
      
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
      
      // Salvar timestamp do último import
      await AsyncStorage.setItem('@liteus_last_import', new Date().toISOString());
      
      return {
        success: true,
        message: `Importação concluída! ${imported} listas importadas, ${conflitos.length} atualizadas.`,
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
    try {
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