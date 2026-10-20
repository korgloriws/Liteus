import { Platform } from 'react-native';
import React from 'react';

let timer: ReturnType<typeof setTimeout> | null = null;

/** Atualiza widgets da home após mudanças locais (só Android). */
export function scheduleWidgetRefresh() {
  if (Platform.OS !== 'android') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    refreshWidgets().catch((err) => {
      console.log('Falha ao atualizar widgets:', err);
    });
  }, 600);
}

export async function refreshWidgets() {
  if (Platform.OS !== 'android') return;

  const { requestWidgetUpdate } = await import('react-native-android-widget');
  const { loadListsWidgetItems, loadNotesWidgetItems } = await import('../widgets/widgetData');
  const { ListsWidget } = await import('../widgets/ListsWidget');
  const { NotesWidget } = await import('../widgets/NotesWidget');

  const [listItems, noteItems] = await Promise.all([
    loadListsWidgetItems(),
    loadNotesWidgetItems(),
  ]);

  await Promise.all([
    requestWidgetUpdate({
      widgetName: 'Lists',
      renderWidget: async () => React.createElement(ListsWidget, { items: listItems }),
    }),
    requestWidgetUpdate({
      widgetName: 'Notes',
      renderWidget: async () => React.createElement(NotesWidget, { items: noteItems }),
    }),
  ]);
}
