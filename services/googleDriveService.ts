import AsyncStorage from '@react-native-async-storage/async-storage';
import { StorageService } from './storage';
import { Lista } from '../types';

interface GoogleDriveData {
  version: string;
  lastSync: string;
  user: {
    email: string;
    name: string;
  };
  lists: Lista[];
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
}

class GoogleDriveService {
  private static instance: GoogleDriveService;
  private accessToken: string | null = null;
  private driveFolderId: string | null = null;
  private readonly FOLDER_NAME = 'Liteus';
  private readonly DATA_FILE_NAME = 'liteus_data.json';

  static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  async initialize(accessToken: string): Promise<void> {
    this.accessToken = accessToken;
    await this.ensureDriveFolder();
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Access token não disponível');
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Drive API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private async ensureDriveFolder(): Promise<void> {
    try {
      // Buscar pasta existente
      const searchResponse = await this.makeRequest(
        `files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      );

      if (searchResponse.files && searchResponse.files.length > 0) {
        this.driveFolderId = searchResponse.files[0].id;
        console.log('Pasta Liteus encontrada:', this.driveFolderId);
        return;
      }

      // Criar nova pasta
      const createResponse = await this.makeRequest('files', {
        method: 'POST',
        body: JSON.stringify({
          name: this.FOLDER_NAME,
          mimeType: 'application/vnd.google-apps.folder',
        }),
      });

      this.driveFolderId = createResponse.id;
      console.log('Pasta Liteus criada:', this.driveFolderId);
    } catch (error) {
      console.error('Erro ao criar/verificar pasta:', error);
      throw new Error('Não foi possível criar a pasta no Google Drive');
    }
  }

  async uploadData(): Promise<void> {
    if (!this.driveFolderId) {
      throw new Error('Pasta do Drive não inicializada');
    }

    try {
      // Buscar dados atuais
      const listas = await StorageService.carregarListas();
      const googleUser = await AsyncStorage.getItem('googleUser');
      const user = googleUser ? JSON.parse(googleUser) : null;

      const data: GoogleDriveData = {
        version: '1.0.7',
        lastSync: new Date().toISOString(),
        user: {
          email: user?.email || 'unknown',
          name: user?.name || 'unknown',
        },
        lists: listas,
      };

      // Verificar se arquivo já existe
      const searchResponse = await this.makeRequest(
        `files?q=name='${this.DATA_FILE_NAME}' and '${this.driveFolderId}' in parents and trashed=false`
      );

      const fileId = searchResponse.files?.[0]?.id;
      const fileContent = JSON.stringify(data, null, 2);

      if (fileId) {
        // Atualizar arquivo existente
        await this.makeRequest(`files/${fileId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: this.DATA_FILE_NAME,
          }),
        });

        // Atualizar conteúdo
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        });
      } else {
        // Criar novo arquivo
        await this.makeRequest('files', {
          method: 'POST',
          body: JSON.stringify({
            name: this.DATA_FILE_NAME,
            parents: [this.driveFolderId],
            mimeType: 'application/json',
          }),
        });

        // Fazer upload do conteúdo
        const createResponse = await this.makeRequest('files', {
          method: 'POST',
          body: JSON.stringify({
            name: this.DATA_FILE_NAME,
            parents: [this.driveFolderId],
            mimeType: 'application/json',
          }),
        });

        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${createResponse.id}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: fileContent,
        });
      }

      console.log('Dados sincronizados com sucesso');
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      throw new Error('Falha ao sincronizar dados com Google Drive');
    }
  }

  async downloadData(): Promise<Lista[]> {
    if (!this.driveFolderId) {
      throw new Error('Pasta do Drive não inicializada');
    }

    try {
      // Buscar arquivo de dados
      const searchResponse = await this.makeRequest(
        `files?q=name='${this.DATA_FILE_NAME}' and '${this.driveFolderId}' in parents and trashed=false`
      );

      if (!searchResponse.files || searchResponse.files.length === 0) {
        console.log('Nenhum arquivo de dados encontrado no Drive');
        return [];
      }

      const fileId = searchResponse.files[0].id;

      // Baixar conteúdo do arquivo
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Falha ao baixar dados do Drive');
      }

      const data: GoogleDriveData = await response.json();
      console.log('Dados baixados do Drive:', data.lists.length, 'listas');

      return data.lists;
    } catch (error) {
      console.error('Erro ao baixar dados:', error);
      throw new Error('Falha ao baixar dados do Google Drive');
    }
  }

  async syncData(): Promise<{ uploaded: boolean; downloaded: boolean }> {
    try {
      // Fazer upload dos dados locais
      await this.uploadData();
      
      // Tentar baixar dados do Drive (para mesclar se necessário)
      const driveData = await this.downloadData();
      
      // Se há dados no Drive, mesclar com dados locais
      if (driveData.length > 0) {
        const localData = await StorageService.carregarListas();
        const mergedData = this.mergeData(localData, driveData);
        
        // Salvar dados mesclados localmente
        for (const lista of mergedData) {
          await StorageService.atualizarLista(lista.id, lista);
        }
      }

      return { uploaded: true, downloaded: driveData.length > 0 };
    } catch (error) {
      console.error('Erro na sincronização:', error);
      throw error;
    }
  }

  private mergeData(localData: Lista[], driveData: Lista[]): Lista[] {
    // Estratégia simples: priorizar dados mais recentes
    const merged = new Map<string, Lista>();
    
    // Adicionar dados locais
    localData.forEach(lista => {
      merged.set(lista.id, lista);
    });
    
    // Adicionar dados do Drive (sobrescrever se mais recente)
    driveData.forEach(lista => {
      const existing = merged.get(lista.id);
      if (!existing || lista.dataModificacao > existing.dataModificacao) {
        merged.set(lista.id, lista);
      }
    });
    
    return Array.from(merged.values());
  }

  async getSyncStatus(): Promise<{ lastSync: string | null; hasData: boolean }> {
    try {
      if (!this.driveFolderId) {
        return { lastSync: null, hasData: false };
      }

      const searchResponse = await this.makeRequest(
        `files?q=name='${this.DATA_FILE_NAME}' and '${this.driveFolderId}' in parents and trashed=false`
      );

      if (!searchResponse.files || searchResponse.files.length === 0) {
        return { lastSync: null, hasData: false };
      }

      const file = searchResponse.files[0];
      return {
        lastSync: file.modifiedTime,
        hasData: true,
      };
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      return { lastSync: null, hasData: false };
    }
  }

  async clearDriveData(): Promise<void> {
    try {
      if (!this.driveFolderId) return;

      const searchResponse = await this.makeRequest(
        `files?q=name='${this.DATA_FILE_NAME}' and '${this.driveFolderId}' in parents and trashed=false`
      );

      if (searchResponse.files && searchResponse.files.length > 0) {
        const fileId = searchResponse.files[0].id;
        await this.makeRequest(`files/${fileId}`, { method: 'DELETE' });
        console.log('Dados do Drive removidos');
      }
    } catch (error) {
      console.error('Erro ao limpar dados do Drive:', error);
      throw new Error('Falha ao limpar dados do Google Drive');
    }
  }
}

export const googleDriveService = GoogleDriveService.getInstance(); 