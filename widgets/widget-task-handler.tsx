import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { ListsWidget } from './ListsWidget';
import { NotesWidget } from './NotesWidget';
import { loadListsWidgetItems, loadNotesWidgetItems } from './widgetData';

async function renderLists() {
  const items = await loadListsWidgetItems();
  return <ListsWidget items={items} />;
}

async function renderNotes() {
  const items = await loadNotesWidgetItems();
  return <NotesWidget items={items} />;
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const name = props.widgetInfo.widgetName;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      if (name === 'Lists') {
        props.renderWidget(await renderLists());
      } else if (name === 'Notes') {
        props.renderWidget(await renderNotes());
      }
      break;
    }
    case 'WIDGET_DELETED':
    case 'WIDGET_CLICK':
    default:
      break;
  }
}
