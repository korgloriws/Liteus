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
 * Sync com o Postgres (quando logado).
 * - Mudanças locais marcam dirty e fazem push
 * - Pull só aplica se NÃO houver mudanças locais pendentes (evita reverter import/criação)
 */
export class CloudSyncService {
  private static syncing = false;
  private static pendingPush = false;
  private static timer: ReturnType<typeof setTimeout> | null = null;
  private static pauseDepth = 0;
  private static dirty = false;
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

  static isPaused(): boolean {
    return this.pauseDepth > 0;
  }

  static hasPendingLocalChanges(): boolean {
    return this.dirty;
  }

  /** Marca que o local está à frente do servidor — pull não pode sobrescrever. */
  static markDirty(): void {
    this.dirty = true;
  }

  static pause(): void {
    this.pauseDepth += 1;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  static resume(): void {
    this.pauseDepth = Math.max(0, this.pauseDepth - 1);
  }

  /**
   * Import / operação em massa: para o polling e impede pull até o push.
   */
  static beginBulkLocalWrite(): void {
    this.stopLiveSync();
    this.pause();
    this.markDirty();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  static endBulkLocalWrite(pushedOk: boolean): void {
    if (pushedOk) {
      this.dirty = false;
    } else {
      this.dirty = true;
    }
    this.resume();
    this.isEnabled().then((ok) => {
      if (ok) this.startLiveSync();
    });
  }

  static schedulePush(delayMs = 800): void {
    this.markDirty();
    if (this.isPaused()) return;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.pushLocalSnapshot().catch((err) => {
        console.log('Cloud push falhou:', err?.message || err);
      });
    }, delayMs);
  }

  /** Sobe snapshot local para o servidor */
  static async pushLocalSnapshot(): Promise<{
    ok: boolean;
    skipped?: boolean;
    counts?: any;
    error?: string;
  }> {
    if (!(await this.isEnabled())) {
      return { ok: false, skipped: true };
    }

    if (this.syncing) {
      this.pendingPush = true;
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

      this.dirty = false;
      return { ok: true, counts: data.counts };
    } catch (error: any) {
      console.log('Cloud push falhou:', error?.message || error);
      this.dirty = true;
      return { ok: false, error: error?.message || 'Falha no push' };
    } finally {
      this.syncing = false;
      if (this.pendingPush) {
        this.pendingPush = false;
        if (!this.isPaused()) {
          this.schedulePush(300);
        }
      }
    }
  }

  /** Push com algumas tentativas (import grande / rede instável). */
  static async pushLocalSnapshotWithRetry(
    attempts = 3
  ): Promise<{ ok: boolean; skipped?: boolean; counts?: any; error?: string }> {
    let last: { ok: boolean; skipped?: boolean; counts?: any; error?: string } = {
      ok: false,
      error: 'Sem tentativas',
    };
    for (let i = 0; i < attempts; i++) {
      last = await this.pushLocalSnapshot();
      if (last.ok || last.skipped) return last;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
    return last;
  }

  /**
   * Baixa snapshot do servidor e substitui o cache local.
   * Nunca aplica se houver mudanças locais ainda não enviadas.
   */
  static async pullRemoteSnapshot(): Promise<{
    ok: boolean;
    skipped?: boolean;
    counts?: any;
    error?: string;
  }> {
    if (!(await this.isEnabled())) {
      return { ok: false, skipped: true };
    }
    if (this.syncing || this.isPaused() || this.dirty) {
      return { ok: false, skipped: true };
    }

    this.syncing = true;
    try {
      const data = await AccountService.authRequest<{
        ok: boolean;
        listas: Lista[];
        notas: Nota[];
        tags: GlobalTag[];
        counts: { tags: number; listas: number; notas: number; itens: number };
      }>('/sync/full', { method: 'GET' });

      // Re-checa dirty: local pode ter mudado durante o GET
      if (this.dirty || this.isPaused()) {
        return { ok: false, skipped: true };
      }

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
    }
  }

  /** Login: sobe dados locais e depois alinha com o servidor */
  static async syncAfterLogin(): Promise<void> {
    this.markDirty();
    await this.pushLocalSnapshotWithRetry(3);
    if (!this.dirty) {
      await this.pullRemoteSnapshot();
    }
    this.startLiveSync();
  }

  /** Ciclo contínuo: prioriza push de mudanças locais; só então puxa o servidor */
  static startLiveSync(): void {
    this.stopLiveSync();

    const tick = async () => {
      if (!(await this.isEnabled())) {
        this.stopLiveSync();
        return;
      }
      if (AppState.currentState !== 'active') return;
      if (this.isPaused()) return;

      if (this.dirty) {
        await this.pushLocalSnapshot();
      }
      if (!this.dirty) {
        await this.pullRemoteSnapshot();
      }
    };

    this.liveTimer = setInterval(() => {
      tick().catch(() => {});
    }, PULL_INTERVAL_MS);

    this.appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        tick().catch(() => {});
      }
    });

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
