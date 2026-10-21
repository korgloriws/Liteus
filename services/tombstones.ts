import AsyncStorage from '@react-native-async-storage/async-storage';

export type TombstoneType = 'lista' | 'item' | 'nota' | 'tag';

export type Tombstone = {
  id: string;
  type: TombstoneType;
  deletedAt: string;
  listaId?: string;
};

export type TombstoneSet = {
  listas: Tombstone[];
  itens: Tombstone[];
  notas: Tombstone[];
  tags: Tombstone[];
};

const TOMBSTONES_KEY = '@liteus_tombstones';

export function emptyTombstones(): TombstoneSet {
  return { listas: [], itens: [], notas: [], tags: [] };
}

function bucket(type: TombstoneType): keyof TombstoneSet {
  if (type === 'item') return 'itens';
  if (type === 'lista') return 'listas';
  if (type === 'nota') return 'notas';
  return 'tags';
}

export function normalizeTombstones(input?: Partial<TombstoneSet> | null): TombstoneSet {
  return {
    listas: Array.isArray(input?.listas) ? input!.listas : [],
    itens: Array.isArray(input?.itens) ? input!.itens : [],
    notas: Array.isArray(input?.notas) ? input!.notas : [],
    tags: Array.isArray(input?.tags) ? input!.tags : [],
  };
}

/** Por id, fica a exclusão mais recente. */
export function mergeTombstoneSets(a: TombstoneSet, b: TombstoneSet): TombstoneSet {
  const merge = (left: Tombstone[], right: Tombstone[], type: TombstoneType): Tombstone[] => {
    const map = new Map<string, Tombstone>();
    for (const row of [...left, ...right]) {
      if (!row?.id) continue;
      const id = String(row.id);
      const next: Tombstone = {
        id,
        type,
        deletedAt: row.deletedAt || new Date().toISOString(),
        listaId: row.listaId ? String(row.listaId) : undefined,
      };
      const prev = map.get(id);
      if (!prev || Date.parse(next.deletedAt) >= Date.parse(prev.deletedAt || 0 as any)) {
        map.set(id, next);
      }
    }
    return Array.from(map.values());
  };

  return {
    listas: merge(a.listas, b.listas, 'lista'),
    itens: merge(a.itens, b.itens, 'item'),
    notas: merge(a.notas, b.notas, 'nota'),
    tags: merge(a.tags, b.tags, 'tag'),
  };
}

export function tombstoneMap(rows: Tombstone[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row?.id) continue;
    const ts = Date.parse(row.deletedAt || '');
    map.set(String(row.id), Number.isFinite(ts) ? ts : 0);
  }
  return map;
}

export function isCoveredByTombstone(entityTs: number, deletedAt: number | undefined): boolean {
  if (deletedAt == null) return false;
  return deletedAt >= entityTs;
}

export class TombstoneStore {
  static async load(): Promise<TombstoneSet> {
    try {
      const raw = await AsyncStorage.getItem(TOMBSTONES_KEY);
      return normalizeTombstones(raw ? JSON.parse(raw) : null);
    } catch {
      return emptyTombstones();
    }
  }

  static async save(set: TombstoneSet): Promise<void> {
    const pruned = pruneTombstones(set);
    await AsyncStorage.setItem(TOMBSTONES_KEY, JSON.stringify(pruned));
  }

  static async record(
    type: TombstoneType,
    id: string,
    extra?: { listaId?: string; deletedAt?: string }
  ): Promise<void> {
    if (!id) return;
    const current = await this.load();
    const key = bucket(type);
    const next: Tombstone = {
      id: String(id),
      type,
      deletedAt: extra?.deletedAt || new Date().toISOString(),
      listaId: extra?.listaId ? String(extra.listaId) : undefined,
    };
    current[key] = [
      ...current[key].filter((row) => String(row.id) !== next.id),
      next,
    ];
    await this.save(current);
  }

  static async forget(type: TombstoneType, id: string): Promise<void> {
    const current = await this.load();
    const key = bucket(type);
    current[key] = current[key].filter((row) => String(row.id) !== String(id));
    await this.save(current);
  }

  static async forgetMany(ids: { listas?: string[]; itens?: string[]; notas?: string[]; tags?: string[] }): Promise<void> {
    const current = await this.load();
    const drop = (rows: Tombstone[], list?: string[]) => {
      if (!list?.length) return rows;
      const set = new Set(list.map(String));
      return rows.filter((row) => !set.has(String(row.id)));
    };
    await this.save({
      listas: drop(current.listas, ids.listas),
      itens: drop(current.itens, ids.itens),
      notas: drop(current.notas, ids.notas),
      tags: drop(current.tags, ids.tags),
    });
  }
}

const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

export function pruneTombstones(set: TombstoneSet): TombstoneSet {
  const cutoff = Date.now() - THIRTY_DAYS;
  const keep = (rows: Tombstone[]) =>
    rows.filter((row) => {
      const ts = Date.parse(row.deletedAt || '');
      return Number.isFinite(ts) && ts >= cutoff;
    });
  return {
    listas: keep(set.listas),
    itens: keep(set.itens),
    notas: keep(set.notas),
    tags: keep(set.tags),
  };
}
