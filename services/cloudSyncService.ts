import { AppState, AppStateStatus } from 'react-native';
import { Lista, Nota, GlobalTag } from '../types';
import { AccountService } from './accountService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LISTAS_KEY = '@liteus_listas';
const NOTAS_KEY = '@liteus_notas';
const TAGS_KEY = '@liteus_tags';
const PULL_INTERVAL_MS = 15000;

type SyncListeners = Set<() => void>;

/**
 * Sync bidirecional com o Postgres (quando logado).
 * - Push: app → servidor (ao salvar / importar)
 * - Pull: servidor → app (login, foco, polling)
 * Servidor é a fonte da verdade compartilhada com o admin.
 */
export class CloudSyncService {
  private static syncing = false;
  private static pending = false;
  private static timer: ReturnType<typeof setTimeout> | null = null;
  private static paused = false;
  private static liveTimer: ReturnType<typeof setInterval> | null = null;
  private static appStateSub: { remove: () => void } | null = null;
  private static listeners: SyncListeners = new Set();

  static onDataChanged(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private static notify() {
    this.listeners.forEach((fn) => {
      try {
        fn();
      } catch {}
    });
  }

  static async isEnabled(): Promise<boolean> {
    return AccountService.isLoggedIn();
  }

  static pause(): void {
    this.paused = true;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  static resume(): void {
    this.paused = false;
  }

  static schedulePush(delayMs = 800): void {
    if (this.paused) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.pushLocalSnapshot().catch((err) => {
        console.log('Cloud push falhou:', err?.message || err);
      });
    }, delayMs);
  }

  /** Sobe snapshot local para o servidor */
  static async pushLocalSnapshot(): Promise<{ ok: boolean; skipped?: boolean; counts?: any; error?: string }> {
    if (!(await this.isEnabled())) {
      return { ok: false, skipped: true };
    }

    if (this.syncing) {
      this.pending = true;
      return { ok: false, skipped: true };
    }

    this.syncing = true;
    try {
      const [listasRaw, notasRaw, tagsRaw] = await Promise.all([
        AsyncStorage.getItem(LISTAS_KEY),
        AsyncStorage.getItem(NOTAS_KEY),
        AsyncStorage.getItem(TAGS_KEY),
      ]);

      const listas: Lista[] = listasRaw ? JSON.parse(listasRaw) : [];
      const notas: Nota[] = notasRaw ? JSON.parse(notasRaw) : [];
      const tags: GlobalTag[] = tagsRaw ? JSON.parse(tagsRaw) : [];

      const data = await AccountService.authRequest<{
        ok: boolean;
        counts: { tags: number; listas: number; notas: number; itens: number };
      }>('/sync/full', {
        method: 'POST',
        body: JSON.stringify({ listas, notas, tags }),
      });

      return { ok: true, counts: data.counts };
    } catch (error: any) {
      console.log('Cloud push falhou:', error?.message || error);
      return { ok: false, error: error?.message || 'Falha no push' };
    } finally {
      this.syncing = false;
      if (this.pending) {
        this.pending = false;
        this.schedulePush(300);
      }
    }
  }

  /** Baixa snapshot do servidor e substitui o cache local */
  static async pullRemoteSnapshot(): Promise<{ ok: boolean; skipped?: boolean; counts?: any; error?: string }> {
    if (!(await this.isEnabled())) {
      return { ok: false, skipped: true };
    }
    if (this.syncing || this.paused) {
      return { ok: false, skipped: true };
    }

    this.syncing = true;
    this.pause();
    try {
      const data = await AccountService.authRequest<{
        ok: boolean;
        listas: Lista[];
        notas: Nota[];
        tags: GlobalTag[];
        counts: { tags: number; listas: number; notas: number; itens: number };
      }>('/sync/full', { method: 'GET' });

      await AsyncStorage.multiSet([
        [LISTAS_KEY, JSON.stringify(data.listas || [])],
        [NOTAS_KEY, JSON.stringify(data.notas || [])],
        [TAGS_KEY, JSON.stringify(data.tags || [])],
      ]);

      this.notify();
      return { ok: true, counts: data.counts };
    } catch (error: any) {
      console.log('Cloud pull falhou:', error?.message || error);
      return { ok: false, error: error?.message || 'Falha no pull' };
    } finally {
      this.syncing = false;
      this.resume();
    }
  }

  /** Login: sobe dados locais e depois alinha com o servidor */
  static async syncAfterLogin(): Promise<void> {
    await this.pushLocalSnapshot();
    await this.pullRemoteSnapshot();
    this.startLiveSync();
  }

  /** Ciclo contínuo enquanto o app está em uso e logado */
  static startLiveSync(): void {
    this.stopLiveSync();

    const tick = async () => {
      if (!(await this.isEnabled())) {
        this.stopLiveSync();
        return;
      }
      if (AppState.currentState !== 'active') return;
      await this.pullRemoteSnapshot();
    };

    this.liveTimer = setInterval(() => {
      tick().catch(() => {});
    }, PULL_INTERVAL_MS);

    this.appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        tick().catch(() => {});
      }
    });

    // primeiro pull imediato
    tick().catch(() => {});
  }

  static stopLiveSync(): void {
    if (this.liveTimer) {
      clearInterval(this.liveTimer);
      this.liveTimer = null;
    }
    if (this.appStateSub) {
      this.appStateSub.remove();
      this.appStateSub = null;
    }
  }
}
