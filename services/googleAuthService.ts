import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleConfig } from './googleConfig';

const SESSION_KEY = '@liteus_google_session';
const AUTO_SYNC_KEY = '@liteus_google_auto_sync';

export interface GoogleUserInfo {
  id?: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleSession {
  accessToken: string;
  refreshToken?: string | null;
  expiresAt?: number | null;
  idToken?: string | null;
  user?: GoogleUserInfo | null;
  connectedAt: string;
}

class GoogleAuthServiceClass {
  private session: GoogleSession | null = null;

  async loadSession(): Promise<GoogleSession | null> {
    try {
      if (this.session) return this.session;
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      this.session = JSON.parse(raw) as GoogleSession;
      return this.session;
    } catch {
      return null;
    }
  }

  async saveSession(session: GoogleSession): Promise<void> {
    this.session = session;
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  async clearSession(): Promise<void> {
    this.session = null;
    await AsyncStorage.removeItem(SESSION_KEY);
  }

  async isConnected(): Promise<boolean> {
    const session = await this.loadSession();
    return Boolean(session?.accessToken);
  }

  async getAutoSyncEnabled(): Promise<boolean> {
    const value = await AsyncStorage.getItem(AUTO_SYNC_KEY);
    return value !== '0';
  }

  async setAutoSyncEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(AUTO_SYNC_KEY, enabled ? '1' : '0');
  }

  async getValidAccessToken(): Promise<string | null> {
    const session = await this.loadSession();
    if (!session?.accessToken) return null;

    const stillValid =
      !session.expiresAt || session.expiresAt > Date.now() + 60_000;

    if (stillValid) {
      return session.accessToken;
    }

    if (!session.refreshToken) {
      return session.accessToken;
    }

    const refreshed = await this.refreshAccessToken(session.refreshToken);
    if (!refreshed) return null;
    return refreshed.accessToken;
  }

  private async refreshAccessToken(refreshToken: string): Promise<GoogleSession | null> {
    try {
      const clientId = GoogleConfig.webClientId || GoogleConfig.androidClientId;
      if (!clientId) return null;

      const body = new URLSearchParams({
        client_id: clientId,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      });

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });

      if (!response.ok) {
        console.error('Falha ao renovar token Google', await response.text());
        return null;
      }

      const data = await response.json();
      const current = (await this.loadSession()) || {
        accessToken: '',
        connectedAt: new Date().toISOString(),
      };

      const next: GoogleSession = {
        ...current,
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_in
          ? Date.now() + Number(data.expires_in) * 1000
          : current.expiresAt,
        idToken: data.id_token || current.idToken,
      };

      await this.saveSession(next);
      return next;
    } catch (error) {
      console.error('Erro ao renovar token Google:', error);
      return null;
    }
  }

  async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo | null> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) return null;
      const data = await response.json();
      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
      };
    } catch {
      return null;
    }
  }

  async persistAuthResult(auth: {
    accessToken?: string | null;
    refreshToken?: string | null;
    expiresIn?: number | null;
    idToken?: string | null;
  }): Promise<GoogleSession | null> {
    if (!auth.accessToken) return null;

    const user = await this.fetchUserInfo(auth.accessToken);
    const session: GoogleSession = {
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken || null,
      expiresAt: auth.expiresIn
        ? Date.now() + Number(auth.expiresIn) * 1000
        : Date.now() + 3500 * 1000,
      idToken: auth.idToken || null,
      user,
      connectedAt: new Date().toISOString(),
    };

    await this.saveSession(session);
    return session;
  }
}

export const googleAuthService = new GoogleAuthServiceClass();
