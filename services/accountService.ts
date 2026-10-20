import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL_KEY = '@liteus_api_url';
const TOKEN_KEY = '@liteus_account_token';
const USER_KEY = '@liteus_account_user';

/** API de produção (VPS). Em Conta dá para trocar se precisar. */
export const DEFAULT_API_URL = 'http://31.97.167.75:4010';

export type AccountUser = {
  id: string;
  email: string;
  name?: string | null;
  createdAt?: string;
};

type AuthResponse = {
  user: AccountUser;
  token: string;
};

export class AccountService {
  static async getApiUrl(): Promise<string> {
    const saved = await AsyncStorage.getItem(API_URL_KEY);
    // Instalação antiga / debug pode ter guardado localhost — ignora em produção
    if (!saved || /localhost|127\.0\.0\.1/i.test(saved)) {
      return DEFAULT_API_URL;
    }
    return saved.replace(/\/$/, '');
  }

  static async setApiUrl(url: string): Promise<void> {
    const clean = url.trim().replace(/\/$/, '');
    await AsyncStorage.setItem(API_URL_KEY, clean || DEFAULT_API_URL);
  }

  static async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  }

  static async getSavedUser(): Promise<AccountUser | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static async isLoggedIn(): Promise<boolean> {
    const token = await this.getToken();
    return Boolean(token);
  }

  private static async saveSession(user: AccountUser, token: string): Promise<void> {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, token],
      [USER_KEY, JSON.stringify(user)],
    ]);
  }

  static async logout(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }

  /** Request autenticado (usado pelo cloud sync) */
  static async authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(path, options, true);
  }

  private static async request<T>(
    path: string,
    options: RequestInit = {},
    auth = false
  ): Promise<T> {
    const base = await this.getApiUrl();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> | undefined),
    };

    if (auth) {
      const token = await this.getToken();
      if (!token) {
        throw new Error('Faça login para continuar');
      }
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    const controller = new AbortController();
    const timeoutMs = path.includes('/sync/') ? 120000 : 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      response = await fetch(`${base}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (err: any) {
      const aborted = err?.name === 'AbortError';
      throw new Error(
        aborted
          ? `Tempo esgotado ao falar com a API (${base}${path}).`
          : `Não foi possível conectar à API (${base}). ` +
              `Confira a URL em Conta e se o celular tem internet. ` +
              `${err?.message || ''}`.trim()
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || `Erro ${response.status}`);
    }
    return data as T;
  }

  static async health(): Promise<boolean> {
    try {
      const data = await this.request<{ ok: boolean }>('/health');
      return Boolean(data.ok);
    } catch {
      return false;
    }
  }

  static async register(email: string, password: string, name?: string): Promise<AccountUser> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    await this.saveSession(data.user, data.token);
    return data.user;
  }

  static async login(email: string, password: string): Promise<AccountUser> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await this.saveSession(data.user, data.token);
    return data.user;
  }

  static async me(): Promise<AccountUser | null> {
    const token = await this.getToken();
    if (!token) return null;
    try {
      const data = await this.request<{ user: AccountUser }>('/auth/me', {}, true);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      await this.logout();
      return null;
    }
  }

  static async updateProfile(input: {
    name?: string | null;
    email?: string;
    password?: string;
    currentPassword?: string;
  }): Promise<AccountUser> {
    const data = await this.request<AuthResponse>(
      '/auth/me',
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
      true
    );
    await this.saveSession(data.user, data.token);
    return data.user;
  }

  static async deleteAccount(password?: string): Promise<void> {
    await this.request(
      '/auth/me',
      {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      },
      true
    );
    await this.logout();
  }
}
