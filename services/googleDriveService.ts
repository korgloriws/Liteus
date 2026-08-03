import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { GoogleConfig } from './googleConfig';
import { googleAuthService } from './googleAuthService';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FILE_ID_KEY = '@liteus_drive_sync_file_id';

type DriveFile = {
  id: string;
  name?: string;
  modifiedTime?: string;
  parents?: string[];
};

class GoogleDriveServiceClass {
  private async authHeaders(): Promise<HeadersInit> {
    const token = await googleAuthService.getValidAccessToken();
    if (!token) {
      throw new Error('Conta Google não conectada');
    }
    return {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
  }

  private async ensureFolderId(): Promise<string> {
    const headers = await this.authHeaders();
    const folderName = GoogleConfig.driveFolderName;
    const q = encodeURIComponent(
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    );

    const listRes = await fetch(
      `${DRIVE_API}/files?q=${q}&spaces=drive&fields=files(id,name,createdTime)&orderBy=createdTime`,
      { headers }
    );

    if (!listRes.ok) {
      throw new Error(`Falha ao listar pasta no Drive (${listRes.status})`);
    }

    const listData = await listRes.json();
    if (Array.isArray(listData.files) && listData.files.length > 0) {
      // Sempre a pasta mais antiga — evita cada aparelho criar/usar pasta diferente
      return listData.files[0].id as string;
    }

    const createRes = await fetch(`${DRIVE_API}/files`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Falha ao criar pasta no Drive (${createRes.status})`);
    }

    const created = await createRes.json();
    return created.id as string;
  }

  /** Todos os liteus_sync.json da conta (mais recente primeiro). */
  private async listSyncFiles(): Promise<DriveFile[]> {
    const headers = await this.authHeaders();
    const fileName = GoogleConfig.driveFileName;
    const q = encodeURIComponent(`name='${fileName}' and trashed=false`);

    const res = await fetch(
      `${DRIVE_API}/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime,parents)&orderBy=modifiedTime desc`,
      { headers }
    );

    if (!res.ok) {
      throw new Error(`Falha ao localizar arquivo de sync (${res.status})`);
    }

    const data = await res.json();
    return Array.isArray(data.files) ? (data.files as DriveFile[]) : [];
  }

  private async resolveSyncFile(): Promise<DriveFile | null> {
    const files = await this.listSyncFiles();
    if (files.length === 0) return null;

    // Arquivo mais recentemente modificado = fonte da verdade entre aparelhos
    const newest = files[0];
    await AsyncStorage.setItem(FILE_ID_KEY, newest.id);
    return newest;
  }

  async downloadSyncJson(): Promise<{
    content: string | null;
    fileId?: string;
    modifiedTime?: string;
  }> {
    const file = await this.resolveSyncFile();
    if (!file) {
      return { content: null };
    }

    const headers = await this.authHeaders();
    const res = await fetch(`${DRIVE_API}/files/${file.id}?alt=media`, { headers });

    if (res.status === 404) {
      await AsyncStorage.removeItem(FILE_ID_KEY);
      return { content: null };
    }

    if (!res.ok) {
      throw new Error(`Falha ao baixar sync do Drive (${res.status})`);
    }

    const content = await res.text();
    return {
      content,
      fileId: file.id,
      modifiedTime: file.modifiedTime,
    };
  }

  async uploadSyncJson(content: string): Promise<{ fileId: string; modifiedTime?: string }> {
    const headers = await this.authHeaders();
    const existing = await this.resolveSyncFile();

    if (existing?.id) {
      const res = await fetch(
        `${UPLOAD_API}/files/${existing.id}?uploadType=media&fields=id,modifiedTime`,
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: content,
        }
      );

      if (!res.ok) {
        throw new Error(`Falha ao atualizar sync no Drive (${res.status})`);
      }

      const data = await res.json();
      await AsyncStorage.setItem(FILE_ID_KEY, existing.id);
      return { fileId: existing.id, modifiedTime: data.modifiedTime };
    }

    const folderId = await this.ensureFolderId();
    const metadata = {
      name: GoogleConfig.driveFileName,
      parents: [folderId],
      mimeType: 'application/json',
    };

    const boundary = `liteus_${Date.now()}`;
    const body =
      `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: application/json\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--`;

    const res = await fetch(
      `${UPLOAD_API}/files?uploadType=multipart&fields=id,modifiedTime`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    );

    if (!res.ok) {
      throw new Error(`Falha ao criar sync no Drive (${res.status})`);
    }

    const data = await res.json();
    await AsyncStorage.setItem(FILE_ID_KEY, data.id);
    return { fileId: data.id as string, modifiedTime: data.modifiedTime };
  }
}

export const LITEUS_SYNC_EVENT = 'liteus-data-synced';

export function emitLiteusSyncEvent(payload: {
  direction: 'push' | 'pull' | 'noop';
  message: string;
}) {
  DeviceEventEmitter.emit(LITEUS_SYNC_EVENT, payload);
}

export const googleDriveService = new GoogleDriveServiceClass();
