import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';

export default function LixeiraScreen() {
  const { colors, typography } = useTheme();
  const [trash, setTrash] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = async () => {
    try {
      setLoading(true);
      await StorageService.purgeLixeiraExpirada();
      const t = await StorageService.carregarLixeira();
      setTrash(t);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [])
  );

  const restaurar = async (id: string) => {
    try {
      const ok = await StorageService.restaurarDaLixeira(id);
      if (ok) {
        await carregar();
        Alert.alert('Sucesso', 'Item restaurado.');
      }
    } catch {
      Alert.alert('Erro', 'Falha ao restaurar item.');
    }
  };

  const excluir = async (id: string) => {
    Alert.alert('Excluir definitivamente', 'Remover permanentemente este item?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          try {
            await StorageService.excluirDaLixeira(id);
            await carregar();
          } catch {
            Alert.alert('Erro', 'Falha ao excluir item.');
          }
        }
      }
    ]);
  };

  const esvaziar = async () => {
    Alert.alert('Esvaziar lixeira', 'Remover permanentemente todos os itens?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Esvaziar',
        style: 'destructive',
        onPress: async () => {
          try {
            await StorageService.esvaziarLixeira();
            await carregar();
          } catch {
            Alert.alert('Erro', 'Falha ao esvaziar lixeira.');
          }
        }
      }
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, typography.titleMedium]}>Lixeira</Text>
        <TouchableOpacity style={styles.headerButton} onPress={esvaziar}>
          <MaterialIcons name="delete-forever" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <Text style={{ color: colors.text }}>Carregando...</Text>
        ) : trash.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="delete-outline" size={56} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Sem itens na lixeira</Text>
          </View>
        ) : (
          trash.map((t: any) => {
            const isNota = t.type === 'nota';
            const titulo = isNota ? (t.payload?.titulo || 'Sem título') : (t.payload?.nome || 'Sem nome');
            const data = t.deletedAt ? new Date(t.deletedAt).toLocaleString() : '';
            return (
              <View key={t.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: colors.text }]}>
                <View style={styles.cardInfo}>
                  <View style={styles.cardHeader}>
                    <MaterialIcons name={isNota ? 'description' : 'format-list-bulleted'} size={20} color={colors.primary} />
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {titulo}
                    </Text>
                  </View>
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>{isNota ? 'Nota' : 'Lista'} • Removido em {data}</Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => restaurar(t.id)}>
                    <Text style={{ color: colors.text }}>Restaurar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.border }]} onPress={() => excluir(t.id)}>
                    <Text style={{ color: '#FF3B30' }}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardInfo: {
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  cardMeta: {
    fontSize: 12,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

