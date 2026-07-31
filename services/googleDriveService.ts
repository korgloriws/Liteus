import { GoogleConfig } from './googleConfig';
import { googleAuthService } from './googleAuthService';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

type DriveFile = {
  id: string;
  name?: string;
  modifiedTime?: string;
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
      `${DRIVE_API}/files?q=${q}&spaces=drive&fields=files(id,name)`,
      { headers }
    );

    if (!listRes.ok) {
      throw new Error(`Falha ao listar pasta no Drive (${listRes.status})`);
    }

    const listData = await listRes.json();
    if (Array.isArray(listData.files) && listData.files.length > 0) {
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

  private async findSyncFile(folderId: string): Promise<DriveFile | null> {
    const headers = await this.authHeaders();
    const fileName = GoogleConfig.driveFileName;
    const q = encodeURIComponent(
      `name='${fileName}' and '${folderId}' in parents and trashed=false`
    );

    const res = await fetch(
      `${DRIVE_API}/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)`,
      { headers }
    );

    if (!res.ok) {
      throw new Error(`Falha ao localizar arquivo de sync (${res.status})`);
    }

    const data = await res.json();
    if (Array.isArray(data.files) && data.files.length > 0) {
      return data.files[0] as DriveFile;
    }
    return null;
  }

  async downloadSyncJson(): Promise<{ content: string | null; fileId?: string; modifiedTime?: string }> {
    const folderId = await this.ensureFolderId();
    const file = await this.findSyncFile(folderId);
    if (!file) {
      return { content: null };
    }

    const headers = await this.authHeaders();
    const res = await fetch(`${DRIVE_API}/files/${file.id}?alt=media`, { headers });

    if (res.status === 404) {
      return { content: null, fileId: file.id };
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

  async uploadSyncJson(content: string): Promise<{ fileId: string }> {
    const folderId = await this.ensureFolderId();
    const existing = await this.findSyncFile(folderId);
    const headers = await this.authHeaders();
    const fileName = GoogleConfig.driveFileName;

    if (existing?.id) {
      const res = await fetch(
        `${UPLOAD_API}/files/${existing.id}?uploadType=media`,
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

      return { fileId: existing.id };
    }

    const metadata = {
      name: fileName,
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

    const res = await fetch(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      throw new Error(`Falha ao criar sync no Drive (${res.status})`);
    }

    const data = await res.json();
    return { fileId: data.id as string };
  }
}

export const googleDriveService = new GoogleDriveServiceClass();
