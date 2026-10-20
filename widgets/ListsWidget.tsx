'use no memo';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

export type ListsWidgetItem = {
  id: string;
  nome: string;
  resumo: string;
};

type Props = {
  items: ListsWidgetItem[];
};

const BG = '#2f4366';
const ACCENT = '#e59e2c';
const TEXT = '#ffffff';
const MUTED = '#f3d58d';

export function ListsWidget({ items }: Props) {
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
      clickActionData={{ uri: 'liteus://' }}
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
          text="Liteus · Listas"
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
          clickActionData={{ uri: 'liteus://criar-lista' }}
        >
          <TextWidget text="+ Nova" style={{ fontSize: 13, color: BG, fontWeight: 'bold' }} />
        </FlexWidget>
      </FlexWidget>

      {items.length === 0 ? (
        <TextWidget
          text="Nenhuma lista ainda. Toque em + Nova"
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
            clickActionData={{ uri: `liteus://lista-detalhes?id=${encodeURIComponent(item.id)}` }}
          >
            <TextWidget
              text={item.nome}
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
