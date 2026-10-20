import { StorageService } from '../services/storage';
import type { ListsWidgetItem } from './ListsWidget';
import type { NotesWidgetItem } from './NotesWidget';

function stripHtml(html: string | undefined): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function loadListsWidgetItems(limit = 4): Promise<ListsWidgetItem[]> {
  const listas = await StorageService.carregarListas();
  return [...listas]
    .sort((a, b) => (b.dataModificacao || 0) - (a.dataModificacao || 0))
    .slice(0, limit)
    .map((lista) => {
      const total = lista.itens?.length || 0;
      const feitos = (lista.itens || []).filter((i) => i.concluido).length;
      const pendentes = total - feitos;
      return {
        id: String(lista.id),
        nome: lista.nome || 'Lista',
        resumo: total === 0 ? 'Vazia' : `${pendentes} pendente(s) · ${total} item(ns)`,
      };
    });
}

export async function loadNotesWidgetItems(limit = 4): Promise<NotesWidgetItem[]> {
  const notas = await StorageService.carregarNotas();
  return [...notas]
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt || 0).getTime() -
        new Date(a.updatedAt || a.createdAt || 0).getTime()
    )
    .slice(0, limit)
    .map((nota) => {
      const resumo =
        stripHtml(nota.html) ||
        (nota.conteudo || '').trim() ||
        'Sem conteúdo';
      return {
        id: String(nota.id),
        titulo: nota.titulo || 'Sem título',
        resumo: resumo.slice(0, 80),
      };
    });
}
