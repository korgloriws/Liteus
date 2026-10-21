import { Lista, Nota, GlobalTag, Item } from '../types';
import {
  TombstoneSet,
  emptyTombstones,
  isCoveredByTombstone,
  tombstoneMap,
} from './tombstones';

/** Converte data/número/ISO em ms epoch. */
export function toMs(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const asNum = Number(value);
    if (Number.isFinite(asNum) && /^\d+$/.test(value.trim())) return asNum;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return 0;
}

export function itemTs(item: Item): number {
  return Math.max(toMs(item.updatedAt), toMs(item.createdAt));
}

export function listaTs(lista: Lista): number {
  const self = Math.max(
    toMs(lista.dataModificacao),
    toMs((lista as any).updatedAt),
    toMs((lista as any).createdAt),
    toMs(lista.dataCriacao)
  );
  const items = (lista.itens || []).reduce((max, item) => Math.max(max, itemTs(item)), 0);
  return Math.max(self, items);
}

export function notaTs(nota: Nota): number {
  return Math.max(toMs(nota.updatedAt), toMs(nota.createdAt));
}

export function tagTs(tag: GlobalTag): number {
  return Math.max(toMs(tag.updatedAt), toMs(tag.createdAt));
}

function mergeItems(local: Item[] = [], remote: Item[] = [], deletedAtById: Map<string, number>): Item[] {
  const map = new Map<string, Item>();
  for (const item of remote) {
    if (!item?.id) continue;
    map.set(String(item.id), item);
  }
  for (const item of local) {
    if (!item?.id) continue;
    const id = String(item.id);
    const other = map.get(id);
    if (!other || itemTs(item) >= itemTs(other)) {
      map.set(id, item);
    }
  }
  return Array.from(map.values()).filter(
    (item) => !isCoveredByTombstone(itemTs(item), deletedAtById.get(String(item.id)))
  );
}

function mergeOneLista(local: Lista, remote: Lista, itemTombstones: Map<string, number>): Lista {
  const localNewer = listaTs(local) >= listaTs(remote);
  const base = localNewer ? local : remote;
  return {
    ...base,
    itens: mergeItems(local.itens || [], remote.itens || [], itemTombstones),
    dataModificacao: Math.max(listaTs(local), listaTs(remote)),
  };
}

/**
 * Last-write-wins por id. Exclusão também entra na regra:
 * se a lápide for no mínimo tão recente quanto o registro, ele some.
 */
export function mergeListasLww(
  local: Lista[],
  remote: Lista[],
  tombstones: TombstoneSet = emptyTombstones()
): Lista[] {
  const deletedListas = tombstoneMap(tombstones.listas);
  const deletedItens = tombstoneMap(tombstones.itens);
  const map = new Map<string, Lista>();
  for (const lista of remote) {
    if (!lista?.id) continue;
    map.set(String(lista.id), lista);
  }
  for (const lista of local) {
    if (!lista?.id) continue;
    const id = String(lista.id);
    const other = map.get(id);
    if (!other) {
      map.set(id, lista);
    } else {
      map.set(id, mergeOneLista(lista, other, deletedItens));
    }
  }
  return Array.from(map.values())
    .filter((lista) => !isCoveredByTombstone(listaTs(lista), deletedListas.get(String(lista.id))))
    .map((lista) => ({
      ...lista,
      itens: mergeItems(lista.itens || [], [], deletedItens),
    }));
}

export function mergeNotasLww(
  local: Nota[],
  remote: Nota[],
  tombstones: TombstoneSet = emptyTombstones()
): Nota[] {
  const deleted = tombstoneMap(tombstones.notas);
  const map = new Map<string, Nota>();
  for (const nota of remote) {
    if (!nota?.id) continue;
    map.set(String(nota.id), nota);
  }
  for (const nota of local) {
    if (!nota?.id) continue;
    const id = String(nota.id);
    const other = map.get(id);
    if (!other || notaTs(nota) >= notaTs(other)) {
      map.set(id, nota);
    }
  }
  return Array.from(map.values()).filter(
    (nota) => !isCoveredByTombstone(notaTs(nota), deleted.get(String(nota.id)))
  );
}

export function mergeTagsLww(
  local: GlobalTag[],
  remote: GlobalTag[],
  tombstones: TombstoneSet = emptyTombstones()
): GlobalTag[] {
  const deleted = tombstoneMap(tombstones.tags);
  const map = new Map<string, GlobalTag>();
  for (const tag of remote) {
    if (!tag?.id) continue;
    map.set(String(tag.id), {
      ...tag,
      listIds: Array.isArray(tag.listIds) ? tag.listIds.map(String) : [],
    });
  }
  for (const tag of local) {
    if (!tag?.id) continue;
    const id = String(tag.id);
    const other = map.get(id);
    if (!other || tagTs(tag) >= tagTs(other)) {
      const listIds = Array.from(
        new Set([
          ...(Array.isArray(tag.listIds) ? tag.listIds.map(String) : []),
          ...(other && Array.isArray(other.listIds) ? other.listIds.map(String) : []),
        ])
      );
      map.set(id, { ...tag, listIds });
    } else if (other) {
      const listIds = Array.from(
        new Set([
          ...(other.listIds || []).map(String),
          ...(Array.isArray(tag.listIds) ? tag.listIds.map(String) : []),
        ])
      );
      map.set(id, { ...other, listIds });
    }
  }
  return Array.from(map.values()).filter(
    (tag) => !isCoveredByTombstone(tagTs(tag), deleted.get(String(tag.id)))
  );
}

/** Marca entidades como "agora" para vencer LWW após import de backup antigo. */
export function bumpSyncTimestamps(input: {
  listas: Lista[];
  notas: Nota[];
  tags: GlobalTag[];
}): { listas: Lista[]; notas: Nota[]; tags: GlobalTag[] } {
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  return {
    listas: input.listas.map((lista) => ({
      ...lista,
      dataModificacao: nowMs,
      itens: (lista.itens || []).map((item) => ({
        ...item,
        updatedAt: nowIso,
      })),
    })),
    notas: input.notas.map((nota) => ({
      ...nota,
      updatedAt: nowIso,
    })),
    tags: input.tags.map((tag) => ({
      ...tag,
      updatedAt: nowIso,
    })),
  };
}
