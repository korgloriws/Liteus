import { AppState, AppStateStatus } from 'react-native';
import { Lista, Nota, GlobalTag } from '../types';
import { AccountService } from './accountService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  mergeListasLww,
  mergeNotasLww,
  mergeTagsLww,
} from './syncMerge';
import {
  TombstoneStore,
  emptyTombstones,
  mergeTombstoneSets,
  normalizeTombstones,
  type TombstoneSet,
} from './tombstones';

const LISTAS_KEY = '@liteus_listas';
const NOTAS_KEY = '@liteus_notas';
const TAGS_KEY = '@liteus_tags';
const PULL_INTERVAL_MS = 8000;

function snapshotSignature(data: { listas: Lista[]; notas: Nota[]; tags: GlobalTag[] }): string {
  const listas = (data.listas || [])
    .map((lista) => {
      const itens = (lista.itens || [])
        .map((item) => `${item.id}:${item.updatedAt || ''}:${item.concluido ? 1 : 0}:${item.texto || ''}`)
        .sort()
        .join(',');
      return `${lista.id}:${lista.dataModificacao}:${lista.nome}:${itens}`;
    })
    .sort()
    .join('|');
  const notas = (data.notas || [])
    .map((nota) => `${nota.id}:${nota.updatedAt || ''}:${nota.titulo || ''}`)
    .sort()
    .join('|');
  const tags = (data.tags || [])
    .map((tag) => `${tag.id}:${tag.updatedAt || ''}:${tag.nome || ''}`)
    .sort()
    .join('|');
  return `${listas}#${notas}#${tags}`;
}

type SyncListeners = Set<() => void>;

/**
 * Sincronização bidirecional (app ↔ admin/Postgres).
 * Regra: last-write-wins por entidade (timestamp mais recente vence).
 * Ciclo: GET remoto → mescla com local → grava local → POST mesclado.
 */
export class CloudSyncService {
  private static syncing = false;
  private static pendingSync = false;
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

  static emitDataChanged(): void {
    this.notify();
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

  static beginBulkLocalWrite(): void {
    this.stopLiveSync();
    this.pause();
    this.markDirty();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  static endBulkLocalWrite(syncedOk: boolean): void {
    this.dirty = !syncedOk;
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
      this.reconcile().catch((err) => {
        console.log('Cloud sync falhou:', err?.message || err);
      });
    }, delayMs);
  }

  /** Envia exclusões ao banco na hora — não espera o snapshot completo. */
  static async pushTombstonesNow(): Promise<void> {
    if (!(await this.isEnabled())) return;
    const tombstones = await TombstoneStore.load();
    const total =
      tombstones.listas.length +
      tombstones.itens.length +
      tombstones.notas.length +
      tombstones.tags.length;
    if (total === 0) return;
    await AccountService.authRequest('/sync/tombstones', {
      method: 'POST',
      body: JSON.stringify(tombstones),
    });
  }

  private static async readLocal(): Promise<{
    listas: Lista[];
    notas: Nota[];
    tags: GlobalTag[];
    tombstones: TombstoneSet;
  }> {
    const [listasRaw, notasRaw, tagsRaw, tombstones] = await Promise.all([
      AsyncStorage.getItem(LISTAS_KEY),
      AsyncStorage.getItem(NOTAS_KEY),
      AsyncStorage.getItem(TAGS_KEY),
      TombstoneStore.load(),
    ]);
    return {
      listas: listasRaw ? JSON.parse(listasRaw) : [],
      notas: notasRaw ? JSON.parse(notasRaw) : [],
      tags: tagsRaw ? JSON.parse(tagsRaw) : [],
      tombstones,
    };
  }

  private static async writeLocal(data: {
    listas: Lista[];
    notas: Nota[];
    tags: GlobalTag[];
    tombstones: TombstoneSet;
  }): Promise<void> {
    await AsyncStorage.multiSet([
      [LISTAS_KEY, JSON.stringify(data.listas)],
      [NOTAS_KEY, JSON.stringify(data.notas)],
      [TAGS_KEY, JSON.stringify(data.tags)],
    ]);
    await TombstoneStore.save(data.tombstones);
  }

  private static async postSnapshot(data: {
    listas: Lista[];
    notas: Nota[];
    tags: GlobalTag[];
    tombstones: TombstoneSet;
  }) {
    return AccountService.authRequest<{
      ok: boolean;
      counts: { tags: number; listas: number; notas: number; itens: number };
    }>('/sync/full', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Reconcilia app e servidor: mescla LWW e publica o resultado nos dois lados.
   */
  static async reconcile(): Promise<{
    ok: boolean;
    skipped?: boolean;
    counts?: any;
    error?: string;
    merged?: boolean;
  }> {
    if (!(await this.isEnabled())) {
      return { ok: false, skipped: true };
    }
    if (this.isPaused()) {
      return { ok: false, skipped: true };
    }
    if (this.syncing) {
      this.pendingSync = true;
      return { ok: false, skipped: true };
    }

    this.syncing = true;
    try {
      const remote = await AccountService.authRequest<{
        ok: boolean;
        listas: Lista[];
        notas: Nota[];
        tags: GlobalTag[];
        tombstones?: TombstoneSet;
      }>('/sync/full', { method: 'GET' });

      if (this.isPaused()) {
        return { ok: false, skipped: true };
      }

      const local = await this.readLocal();
      const tombstones = mergeTombstoneSets(
        local.tombstones,
        normalizeTombstones(remote.tombstones || emptyTombstones())
      );
      const merged = {
        listas: mergeListasLww(local.listas, remote.listas || [], tombstones),
        notas: mergeNotasLww(local.notas, remote.notas || [], tombstones),
        tags: mergeTagsLww(local.tags, remote.tags || [], tombstones),
        tombstones,
      };

      const localChanged = snapshotSignature(local) !== snapshotSignature(merged);
      await TombstoneStore.save(merged.tombstones);

      if (localChanged) {
        await this.writeLocal(merged);
        this.notify();
      }

      // Só reenvia o snapshot se houve mudança local ou o merge alterou dados
      if (this.dirty || localChanged) {
        await this.postSnapshot(merged);
      }
      this.dirty = false;

      return {
        ok: true,
        counts: posted.counts,
        merged: localChanged,
      };
    } catch (error: any) {
      console.log('Cloud reconcile falhou:', error?.message || error);
      this.dirty = true;
      return { ok: false, error: error?.message || 'Falha na sincronização' };
    } finally {
      this.syncing = false;
      if (this.pendingSync) {
        this.pendingSync = false;
        if (!this.isPaused()) {
          this.schedulePush(400);
        }
      }
    }
  }

  /** @deprecated use reconcile — mantido para chamadas antigas */
  static async pushLocalSnapshot(): Promise<{
    ok: boolean;
    skipped?: boolean;
    counts?: any;
    error?: string;
  }> {
    return this.reconcile();
  }

  static async pushLocalSnapshotWithRetry(
    attempts = 3
  ): Promise<{ ok: boolean; skipped?: boolean; counts?: any; error?: string }> {
    let last: { ok: boolean; skipped?: boolean; counts?: any; error?: string } = {
      ok: false,
      error: 'Sem tentativas',
    };
    for (let i = 0; i < attempts; i++) {
      last = await this.reconcile();
      if (last.ok || last.skipped) return last;
      await new Promise((r) => setTimeout(r, 800 * (i + 1)));
    }
    return last;
  }

  /** @deprecated use reconcile */
  static async pullRemoteSnapshot(): Promise<{
    ok: boolean;
    skipped?: boolean;
    counts?: any;
    error?: string;
  }> {
    return this.reconcile();
  }

  static async syncAfterLogin(): Promise<void> {
    this.markDirty();
    await this.pushLocalSnapshotWithRetry(3);
    this.startLiveSync();
  }

  static startLiveSync(): void {
    this.stopLiveSync();

    const tick = async () => {
      if (!(await this.isEnabled())) {
        this.stopLiveSync();
        return;
      }
      if (AppState.currentState !== 'active') return;
      if (this.isPaused()) return;
      await this.reconcile();
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
