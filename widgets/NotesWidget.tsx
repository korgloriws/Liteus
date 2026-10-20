'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type NotesWidgetItem = {
  id: string;
  titulo: string;
  resumo: string;
};

type Props = {
  items: NotesWidgetItem[];
};

const BG = '#2f4366';
const ACCENT = '#e59e2c';
const TEXT = '#ffffff';
const MUTED = '#f3d58d';

export function NotesWidget({ items }: Props) {
  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: BG,
        borderRadius: 16,
        flexDirection: 'column',
        padding: 12,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'liteus://notas' }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        <TextWidget
          text="Liteus · Notas"
          style={{ fontSize: 16, color: ACCENT, fontWeight: 'bold' }}
        />
        <FlexWidget
          style={{
            backgroundColor: ACCENT,
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
          clickAction="OPEN_URI"
          clickActionData={{ uri: 'liteus://criar-nota' }}
        >
          <TextWidget text="+ Nova" style={{ fontSize: 13, color: BG, fontWeight: 'bold' }} />
        </FlexWidget>
      </FlexWidget>

      {items.length === 0 ? (
        <TextWidget
          text="Nenhuma nota ainda. Toque em + Nova"
          style={{ fontSize: 13, color: MUTED }}
        />
      ) : (
        items.map((item) => (
          <FlexWidget
            key={item.id}
            style={{
              width: 'match_parent',
              flexDirection: 'column',
              paddingVertical: 4,
            }}
            clickAction="OPEN_URI"
            clickActionData={{
              uri: `liteus://nota-detalhes?id=${encodeURIComponent(item.id)}`,
            }}
          >
            <TextWidget
              text={item.titulo || 'Sem título'}
              style={{ fontSize: 14, color: TEXT, fontWeight: 'bold' }}
              maxLines={1}
            />
            <TextWidget
              text={item.resumo}
              style={{ fontSize: 12, color: MUTED }}
              maxLines={1}
            />
          </FlexWidget>
        ))
      )}
    </FlexWidget>
  );
}
