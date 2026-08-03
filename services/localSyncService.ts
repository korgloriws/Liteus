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
  /** Evita reenfileirar mudanças geradas por merge remoto (Drive). */
  private suppressSyncEnqueue = false;

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
    if (this.suppressSyncEnqueue) return;
    this.syncQueue.push({
      type,
      data,
      timestamp: Date.now()
    });
    await this.saveSyncQueue();
    await AsyncStorage.setItem('@liteus_drive_dirty', '1');
    await AsyncStorage.setItem('@liteus_drive_local_changed_at', new Date().toISOString());
    this.scheduleAutoSync();
  }

  private async isDriveDirty(): Promise<boolean> {
    return (await AsyncStorage.getItem('@liteus_drive_dirty')) === '1';
  }

  private async clearDriveDirty(): Promise<void> {
    await AsyncStorage.multiSet([
      ['@liteus_drive_dirty', '0'],
    ]);
  }

  private async getDriveLocalChangedAt(): Promise<string | null> {
    return AsyncStorage.getItem('@liteus_drive_local_changed_at');
  }

  private async getLastSeenRemoteMtime(): Promise<string | null> {
    return AsyncStorage.getItem('@liteus_drive_last_remote_mtime');
  }

  private async setLastSeenRemoteMtime(mtime: string | null | undefined): Promise<void> {
    if (!mtime) return;
    await AsyncStorage.setItem('@liteus_drive_last_remote_mtime', mtime);
  }

  private toMillis(value?: string | null): number {
    if (!value) return 0;
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : 0;
  }

  private scheduleAutoSync(delayMs: number = 2500): void {
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

  private collectTagIdsFromLista(lista: Lista): Set<string> {
    const ids = new Set<string>();
    (lista.tagIds || []).forEach((id) => ids.add(String(id)));
    (lista.categorias || []).forEach((cat) => {
      if (cat?.id) ids.add(String(cat.id));
    });
    for (const item of lista.itens || []) {
      if (item.categoria) ids.add(String(item.categoria));
      (item.categorias || []).forEach((id) => ids.add(String(id)));
    }
    return ids;
  }

  private async resolveTagsForLista(lista: Lista): Promise<GlobalTag[]> {
    const tags = await StorageService.carregarTags();
    const byId = new Map(tags.map((t) => [t.id, t]));
    const ids = this.collectTagIdsFromLista(lista);
    const resolved: GlobalTag[] = [];

    for (const id of ids) {
      const fromStore = byId.get(id);
      if (fromStore) {
        resolved.push(fromStore);
        continue;
      }

      const fromLista = (lista.categorias || []).find((c) => String(c.id) === id);
      if (fromLista) {
        resolved.push({
          id: String(fromLista.id),
          nome: fromLista.nome,
          cor: fromLista.cor,
          createdAt: fromLista.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ownerListId: lista.id,
          listIds: [lista.id],
        });
      }
    }

    return resolved;
  }

  private collectTagsFromImportPayload(syncData: SyncData): GlobalTag[] {
    const map = new Map<string, GlobalTag>();

    for (const tag of syncData.tags || []) {
      if (!tag?.id) continue;
      map.set(String(tag.id), {
        ...tag,
        id: String(tag.id),
        listIds: Array.isArray(tag.listIds) ? tag.listIds.map(String) : [],
        createdAt: tag.createdAt || new Date().toISOString(),
        updatedAt: tag.updatedAt || new Date().toISOString(),
      });
    }

    for (const lista of syncData.lists || []) {
      for (const cat of lista.categorias || []) {
        if (!cat?.id) continue;
        const id = String(cat.id);
        if (!map.has(id)) {
          map.set(id, {
            id,
            nome: cat.nome,
            cor: cat.cor,
            createdAt: cat.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            ownerListId: lista.id,
            listIds: [lista.id],
          });
        } else {
          const existing = map.get(id)!;
          if (!existing.listIds.includes(lista.id)) {
            existing.listIds.push(lista.id);
          }
        }
      }

      // Tags referenciadas só nos itens, sem entrada em categorias/tags
      for (const item of lista.itens || []) {
        const refs = [
          ...(item.categoria ? [item.categoria] : []),
          ...(item.categorias || []),
        ].map(String);

        for (const refId of refs) {
          if (map.has(refId)) continue;
          const fromCat = (lista.categorias || []).find((c) => String(c.id) === refId);
          if (fromCat) {
            map.set(refId, {
              id: refId,
              nome: fromCat.nome,
              cor: fromCat.cor,
              createdAt: fromCat.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ownerListId: lista.id,
              listIds: [lista.id],
            });
          }
        }
      }
    }

    return Array.from(map.values());
  }

  async buildSyncPayload(): Promise<SyncData> {
    const listas = await StorageService.carregarListas();
    const notas = await StorageService.carregarNotas();
    const tags = await StorageService.carregarTags();

    const tagsMap = new Map(tags.map((t) => [t.id, t]));
    for (const lista of listas) {
      const resolved = await this.resolveTagsForLista(lista);
      resolved.forEach((t) => tagsMap.set(t.id, t));
    }
    const tagsCompletas = Array.from(tagsMap.values());

    return {
      lists: listas,
      notes: notas,
      tags: tagsCompletas,
      metadata: {
        exportadoEm: new Date().toISOString(),
        versao: '1.0.0',
        dispositivo: this.deviceId || 'unknown',
        totalListas: listas.length,
        totalItens: listas.reduce((total, lista) => total + lista.itens.length, 0),
        totalNotas: notas.length,
        totalTags: tagsCompletas.length,
      },
    };
  }

  // Exportar dados para arquivo local
  async exportData(): Promise<{ success: boolean; filePath?: string; message: string }> {
    try {
      const syncData = await this.buildSyncPayload();

      const fileName = `liteus_backup_${new Date().toISOString().split('T')[0]}.json`;
      const dir: string = (FileSystemLegacy as any).documentDirectory || (FileSystemLegacy as any).cacheDirectory || '';
      const filePath = `${dir}${fileName}`;
      
      await FileSystemLegacy.writeAsStringAsync(filePath, JSON.stringify(syncData, null, 2));
      
      // Salvar timestamp do último export
      await AsyncStorage.setItem('@liteus_last_export', new Date().toISOString());
      
      return {
        success: true,
        filePath,
        message: `Backup criado com ${syncData.lists.length} listas, ${syncData.notes?.length || 0} notas e ${syncData.tags?.length || 0} tags`
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
      const tagsDaLista = await this.resolveTagsForLista(lista);
      const tagIds = Array.from(this.collectTagIdsFromLista(lista));

      // Garante categorias/tagIds embutidos no JSON da lista
      const categoriasDaLista =
        (lista.categorias || []).length > 0
          ? lista.categorias
          : tagsDaLista.map((t) => ({
              id: t.id,
              nome: t.nome,
              cor: t.cor,
              createdAt: t.createdAt,
            }));

      const listaExport: Lista = {
        ...lista,
        tagIds: tagIds.length > 0 ? tagIds : (lista.tagIds || categoriasDaLista.map((c) => c.id)),
        categorias: categoriasDaLista,
      };

      const syncData: SyncData = {
        lists: [listaExport],
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
        message: `Backup criado para a lista "${lista.nome}" com ${lista.itens.length} itens e ${tagsDaLista.length} tags`,
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
      const notaTagRefs = new Set((nota.tags || []).map(String));
      const tagsDaNota = tags.filter(
        (t) => notaTagRefs.has(t.id) || notaTagRefs.has(t.nome)
      );

      const syncData: SyncData = {
        lists: listasVazias,
        notes: [nota],
        tags: tagsDaNota,
        metadata: {
          exportadoEm: new Date().toISOString(),
          versao: '1.0.0',
          dispositivo: this.deviceId || 'unknown',
          totalListas: 0,
          totalItens: 0,
          totalNotas: 1,
          totalTags: tagsDaNota.length,
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

  /** Mescla payload SyncData no armazenamento local (last-write-wins por nome/id). */
  async importFromSyncData(
    syncData: SyncData
  ): Promise<{ success: boolean; message: string; imported: number }> {
    try {
      if (!syncData.lists || !Array.isArray(syncData.lists)) {
        return { success: false, message: 'Formato de arquivo inválido', imported: 0 };
      }

      const listasExistentes = await StorageService.carregarListas();
      let imported = 0;
      const conflitos: string[] = [];
      let tagsImportadas = 0;

      const tagsDoArquivo = this.collectTagsFromImportPayload(syncData);
      if (tagsDoArquivo.length > 0) {
        const atuais = await StorageService.carregarTags();
        const map = new Map(atuais.map((t) => [t.id, t]));

        for (const tag of tagsDoArquivo) {
          const existing = map.get(tag.id);
          if (!existing) {
            map.set(tag.id, {
              ...tag,
              listIds: Array.isArray(tag.listIds) ? tag.listIds : [],
              updatedAt: tag.updatedAt || new Date().toISOString(),
              createdAt: tag.createdAt || new Date().toISOString(),
            });
            tagsImportadas++;
          } else {
            map.set(tag.id, {
              ...existing,
              nome: tag.nome || existing.nome,
              cor: tag.cor || existing.cor,
              listIds: Array.from(
                new Set([...(existing.listIds || []), ...(tag.listIds || [])])
              ),
              updatedAt: new Date().toISOString(),
            });
          }
        }

        await StorageService.salvarTags(Array.from(map.values()));
      }

      for (const lista of syncData.lists) {
        const listaExistente = listasExistentes.find((l) => l.nome === lista.nome);
        const categorias = Array.isArray(lista.categorias) ? lista.categorias : [];
        const tagIds =
          Array.isArray(lista.tagIds) && lista.tagIds.length > 0
            ? lista.tagIds
            : categorias.map((c) => c.id);

        const payloadLista: Lista = {
          ...lista,
          categorias,
          tagIds,
          itens: Array.isArray(lista.itens) ? lista.itens : [],
        };

        if (listaExistente) {
          await StorageService.atualizarLista(listaExistente.id, {
            ...payloadLista,
            id: listaExistente.id,
          });
          conflitos.push(`Lista "${lista.nome}" foi atualizada`);
        } else {
          await StorageService.criarLista(payloadLista);
          imported++;
        }
      }

      if (Array.isArray(syncData.notes)) {
        const notasAtuais = await StorageService.carregarNotas();
        const matchedLocalIds = new Set<string>();
        let notasAtualizadas = 0;
        let notasCriadas = 0;

        for (const nota of syncData.notes) {
          const tituloNorm = (nota.titulo || '').trim().toLowerCase();
          const byId = notasAtuais.find(
            (n) => n.id === nota.id && !matchedLocalIds.has(n.id)
          );
          const byTitulo = !byId
            ? notasAtuais.find(
                (n) =>
                  (n.titulo || '').trim().toLowerCase() === tituloNorm &&
                  tituloNorm.length > 0 &&
                  !matchedLocalIds.has(n.id)
              )
            : undefined;

          const existente = byId || byTitulo;

          if (existente) {
            matchedLocalIds.add(existente.id);
            await StorageService.atualizarNota(existente.id, {
              titulo: nota.titulo,
              conteudo: nota.conteudo,
              html: nota.html,
              cor: nota.cor,
              tags: nota.tags,
              textoFormatado: nota.textoFormatado,
            });
            const idx = notasAtuais.findIndex((n) => n.id === existente.id);
            if (idx >= 0) {
              notasAtuais[idx] = {
                ...notasAtuais[idx],
                titulo: nota.titulo,
                conteudo: nota.conteudo,
                html: nota.html,
                cor: nota.cor,
                tags: nota.tags,
                textoFormatado: nota.textoFormatado,
              };
            }
            notasAtualizadas++;
          } else {
            const novaId = String(
              nota.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
            );
            await StorageService.criarNota({
              ...nota,
              id: novaId,
              titulo: nota.titulo || '',
              conteudo: nota.conteudo || '',
              createdAt: nota.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            matchedLocalIds.add(novaId);
            notasAtuais.push({
              ...nota,
              id: novaId,
              titulo: nota.titulo || '',
              conteudo: nota.conteudo || '',
              createdAt: nota.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            notasCriadas++;
          }
        }

        if (notasAtualizadas > 0 || notasCriadas > 0) {
          conflitos.push(
            `${notasAtualizadas} notas atualizadas, ${notasCriadas} notas criadas`
          );
        }
      }

      if (tagsImportadas > 0) {
        conflitos.push(`${tagsImportadas} tags globais criadas`);
      }

      await AsyncStorage.setItem('@liteus_last_import', new Date().toISOString());

      return {
        success: true,
        message: `Importação concluída! ${imported} listas importadas. ${conflitos.join(' | ')}`,
        imported,
      };
    } catch (error) {
      console.error('Erro ao mesclar dados de sync:', error);
      return {
        success: false,
        message: 'Falha ao importar dados. Verifique o formato do arquivo.',
        imported: 0,
      };
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
      return this.importFromSyncData(syncData);
    } catch (error) {
      console.error('Erro ao importar dados:', error);
      return {
        success: false,
        message: 'Falha ao importar dados. Verifique o formato do arquivo.',
        imported: 0
      };
    }
  }

  private async getLastAppliedHash(): Promise<string | null> {
    return AsyncStorage.getItem('@liteus_drive_last_hash');
  }

  private async setLastAppliedHash(hash: string): Promise<void> {
    await AsyncStorage.setItem('@liteus_drive_last_hash', hash);
  }

  private hashContent(content: string): string {
    // Hash simples e estável o suficiente para detectar mudança de payload
    let h = 0;
    for (let i = 0; i < content.length; i++) {
      h = (Math.imul(31, h) + content.charCodeAt(i)) | 0;
    }
    return `h${content.length}_${h}`;
  }

  /**
   * Sync com Google Drive (mesma conta nos 2 aparelhos).
   *
   * - Edições locais (dirty) → substitui o JSON compartilhado (push).
   * - Sem edição local e Drive diferente do último aplicado → baixa (pull).
   * - Os dois aparelhos usam o liteus_sync.json mais recente da conta.
   */
  async syncWithGoogleDrive(): Promise<{
    success: boolean;
    message: string;
    direction?: 'push' | 'pull' | 'noop';
  }> {
    try {
      const { googleAuthService } = await import('./googleAuthService');
      const {
        googleDriveService,
        emitLiteusSyncEvent,
      } = await import('./googleDriveService');

      const connected = await googleAuthService.isConnected();
      if (!connected) {
        return { success: false, message: 'Conecte uma conta Google em Configurações' };
      }

      const queueLen = (await this.getSyncQueue()).length;
      const dirtyFlag = await this.isDriveDirty();
      const dirty = dirtyFlag || queueLen > 0;
      if (dirty && !dirtyFlag) {
        await AsyncStorage.setItem('@liteus_drive_dirty', '1');
        await AsyncStorage.setItem(
          '@liteus_drive_local_changed_at',
          new Date().toISOString()
        );
      }

      const remote = await googleDriveService.downloadSyncJson();
      const lastHash = await this.getLastAppliedHash();

      // Sem arquivo remoto → sobe o local (cria a base compartilhada)
      if (!remote.content) {
        const payload = await this.buildSyncPayload();
        const serialized = JSON.stringify(payload, null, 2);
        const uploaded = await googleDriveService.uploadSyncJson(serialized);
        await this.setLastSeenRemoteMtime(
          uploaded.modifiedTime || payload.metadata.exportadoEm
        );
        await this.setLastAppliedHash(this.hashContent(serialized));
        await this.clearDriveDirty();
        await AsyncStorage.setItem('@liteus_last_google_sync', new Date().toISOString());
        await this.updateLastSync();
        const message = `Base criada no Drive (${payload.lists.length} listas, ${payload.notes?.length || 0} notas)`;
        emitLiteusSyncEvent({ direction: 'push', message });
        return { success: true, message, direction: 'push' };
      }

      const remoteHash = this.hashContent(remote.content);

      // Edições locais → substitui o arquivo compartilhado
      if (dirty) {
        const payload = await this.buildSyncPayload();
        const serialized = JSON.stringify(payload, null, 2);
        const uploaded = await googleDriveService.uploadSyncJson(serialized);
        await this.setLastSeenRemoteMtime(
          uploaded.modifiedTime || payload.metadata.exportadoEm
        );
        await this.setLastAppliedHash(this.hashContent(serialized));
        await this.clearDriveDirty();
        await AsyncStorage.setItem('@liteus_last_google_sync', new Date().toISOString());
        await this.updateLastSync();
        const message = `Drive atualizado com este aparelho (${payload.lists.length} listas, ${payload.notes?.length || 0} notas)`;
        emitLiteusSyncEvent({ direction: 'push', message });
        return { success: true, message, direction: 'push' };
      }

      // Sem edição local: se o Drive mudou (outro aparelho), aplica aqui
      if (remoteHash !== lastHash) {
        try {
          const remoteData = JSON.parse(remote.content) as SyncData;
          this.suppressSyncEnqueue = true;
          try {
            const merge = await this.importFromSyncData(remoteData);
            if (!merge.success) {
              return { success: false, message: merge.message };
            }
          } finally {
            this.suppressSyncEnqueue = false;
          }
        } catch {
          this.suppressSyncEnqueue = false;
          return {
            success: false,
            message: 'Arquivo de sync no Drive está inválido',
          };
        }

        await this.setLastSeenRemoteMtime(remote.modifiedTime);
        await this.setLastAppliedHash(remoteHash);
        await this.clearDriveDirty();
        await AsyncStorage.setItem('@liteus_last_google_sync', new Date().toISOString());
        await this.updateLastSync();
        const message =
          'Dados recebidos do outro aparelho via Drive — listas/notas atualizadas';
        emitLiteusSyncEvent({ direction: 'pull', message });
        return { success: true, message, direction: 'pull' };
      }

      await AsyncStorage.setItem('@liteus_last_google_sync', new Date().toISOString());
      const message = 'Já sincronizado com o Drive (nada novo)';
      emitLiteusSyncEvent({ direction: 'noop', message });
      return { success: true, message, direction: 'noop' };
    } catch (error: any) {
      console.error('Erro no sync com Google Drive:', error);
      return {
        success: false,
        message: error?.message || 'Falha ao sincronizar com o Google Drive',
      };
    }
  }

  // Sincronizar dados (processar fila + Drive se conectado e auto sync ligado)
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
      const changes = queue.length;

      if (changes > 0) {
        console.log(`Processando ${changes} mudanças da fila`);
        // Garante dirty ANTES de limpar a fila — o Drive sync depende disso
        await AsyncStorage.setItem('@liteus_drive_dirty', '1');
        await AsyncStorage.setItem(
          '@liteus_drive_local_changed_at',
          new Date().toISOString()
        );
        await this.clearSyncQueue();
        await this.updateLastSync();
      }

      if (changes > 0) {
        try {
          const { googleAuthService } = await import('./googleAuthService');
          const connected = await googleAuthService.isConnected();
          const autoEnabled = await googleAuthService.getAutoSyncEnabled();
          if (connected && autoEnabled) {
            const drive = await this.syncWithGoogleDrive();
            return {
              success: drive.success,
              message: drive.success
                ? `${changes} mudanças locais. ${drive.message}`
                : drive.message,
              changes,
            };
          }
        } catch (driveError) {
          console.error('Auto-sync Drive ignorado:', driveError);
        }
      }

      if (changes === 0) {
        return {
          success: true,
          message: 'Nenhuma mudança pendente para sincronizar',
          changes: 0,
        };
      }

      return {
        success: true,
        message: `${changes} mudanças sincronizadas com sucesso`,
        changes,
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
  async getSyncStatus(): Promise<SyncStatus & { lastGoogleSync?: string | null }> {
    try {
      const [lastSync, lastExport, lastImport, lastGoogleSync, queue] = await Promise.all([
        AsyncStorage.getItem('@liteus_last_sync'),
        AsyncStorage.getItem('@liteus_last_export'),
        AsyncStorage.getItem('@liteus_last_import'),
        AsyncStorage.getItem('@liteus_last_google_sync'),
        this.getSyncQueue()
      ]);

      return {
        lastSync,
        isOnline: await this.isOnline(),
        pendingChanges: queue.length,
        lastExport,
        lastImport,
        lastGoogleSync,
      };
    } catch (error) {
      console.error('Erro ao obter status de sincronização:', error);
      return {
        lastSync: null,
        isOnline: false,
        pendingChanges: 0,
        lastExport: null,
        lastImport: null,
        lastGoogleSync: null,
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
        AsyncStorage.removeItem('@liteus_device_id'),
        AsyncStorage.removeItem('@liteus_last_google_sync'),
        AsyncStorage.removeItem('@liteus_drive_dirty'),
        AsyncStorage.removeItem('@liteus_drive_local_changed_at'),
        AsyncStorage.removeItem('@liteus_drive_last_remote_mtime'),
        AsyncStorage.removeItem('@liteus_drive_last_hash'),
        AsyncStorage.removeItem('@liteus_drive_sync_file_id'),
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