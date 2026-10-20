import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';

/** Rota usada pelo widget (+ Nova nota): cria e abre a nota. */
export default function CriarNotaScreen() {
  const { colors } = useTheme();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const nova = await StorageService.adicionarNota({
          titulo: 'Nova nota',
          conteudo: '',
          html: '',
          cor: colors.primary,
        } as any);
        router.replace({ pathname: '/nota-detalhes', params: { id: nova.id } });
      } catch {
        router.replace('/notas');
      }
    })();
  }, [colors.primary]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}
