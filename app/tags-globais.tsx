import React, { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';
import { StorageService } from '../services/storage';
import { GlobalTag, Lista } from '../types';
import ColorWheelPicker from '../components/ColorWheelPicker';

export default function TagsGlobaisScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const [tags, setTags] = useState<GlobalTag[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [tagEditando, setTagEditando] = useState<GlobalTag | null>(null);
  const [nomeTag, setNomeTag] = useState('');
  const [corTag, setCorTag] = useState('#007AFF');
  const [buscaTags, setBuscaTags] = useState('');
  const [renameModal, setRenameModal] = useState(false);
  const [buscarLote, setBuscarLote] = useState('');
  const [substituirLote, setSubstituirLote] = useState('');

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [tagsCarregadas, listasCarregadas] = await Promise.all([
        StorageService.carregarTags(),
        StorageService.carregarListas(),
      ]);
      setTags(tagsCarregadas);
      setListas(listasCarregadas);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar as tags globais.');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      carregarDados();
    }, [])
  );

  const abrirEdicao = (tag: GlobalTag) => {
    setTagEditando(tag);
    setNomeTag(tag.nome);
    setCorTag(tag.cor || '#007AFF');
    setEditModal(true);
  };

  const abrirCriacao = () => {
    setTagEditando(null);
    setNomeTag('');
    setCorTag('#007AFF');
    setEditModal(true);
  };

  const salvarEdicao = async () => {
    if (!nomeTag.trim()) {
      Alert.alert('Aviso', 'Informe um nome para a tag.');
      return;
    }

    try {
      if (tagEditando) {
        await StorageService.atualizarTagGlobal(tagEditando.id, {
          nome: nomeTag.trim(),
          cor: corTag,
        });
      } else {
        const existentes = await StorageService.carregarTags();
        const duplicada = existentes.find(
          (t) => t.nome.trim().toLowerCase() === nomeTag.trim().toLowerCase()
        );
        if (duplicada) {
          Alert.alert('Aviso', 'Já existe uma tag global com esse nome.');
          return;
        }

        const novaTag: GlobalTag = {
          id: `tag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          nome: nomeTag.trim(),
          cor: corTag,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          listIds: [],
        };
        await StorageService.salvarTags([...existentes, novaTag]);
      }
      setEditModal(false);
      setTagEditando(null);
      await carregarDados();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a tag.');
    }
  };

  const removerTag = (tag: GlobalTag) => {
    const uso = (tag.listIds || []).length;
    Alert.alert(
      'Remover tag global',
      `A tag "${tag.nome}" será removida de ${uso} lista(s). Deseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removerTagGlobal(tag.id);
              await carregarDados();
            } catch {
              Alert.alert('Erro', 'Não foi possível remover a tag.');
            }
          },
        },
      ]
    );
  };

  const mesclarDuplicadas = () => {
    Alert.alert(
      'Mesclar tags duplicadas',
      'Esta ação vai unir tags com o mesmo nome (ignorando maiúsculas/minúsculas). Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Mesclar',
          onPress: async () => {
            try {
              const result = await StorageService.mesclarTagsDuplicadas();
              await carregarDados();
              Alert.alert(
                'Concluído',
                `${result.mergedTags} tag(s) mesclada(s) em ${result.affectedLists} lista(s).`
              );
            } catch {
              Alert.alert('Erro', 'Não foi possível mesclar tags duplicadas.');
            }
          },
        },
      ]
    );
  };

  const renomearEmLote = async () => {
    if (!buscarLote.trim()) {
      Alert.alert('Aviso', 'Informe o texto para buscar.');
      return;
    }
    try {
      const result = await StorageService.renomearTagsEmLote(buscarLote, substituirLote);
      await carregarDados();
      setRenameModal(false);
      setBuscarLote('');
      setSubstituirLote('');
      Alert.alert(
        'Concluído',
        `${result.updatedTags} tag(s) renomeada(s) em ${result.affectedLists} lista(s).`
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível renomear tags em lote.');
    }
  };

  const listasDaTag = (tag: GlobalTag) =>
    (tag.listIds || [])
      .map((id) => {
        const lista = listas.find((l) => l.id === id);
        if (!lista) return null;
        return { id: lista.id, nome: lista.nome };
      })
      .filter(Boolean) as Array<{ id: string; nome: string }>;

  const tagsFiltradas = tags.filter((tag) =>
    !buscaTags.trim()
      ? true
      : (tag.nome || '').toLowerCase().includes(buscaTags.trim().toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, typography.titleMedium]}>
          Tags Globais
        </Text>
        <TouchableOpacity style={styles.headerButton} onPress={abrirCriacao}>
          <MaterialIcons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: colors.textSecondary }, typography.body]}>
          Tags reutilizáveis entre listas. Edite uma vez e reflita em todas.
        </Text>

        <View style={styles.toolsRow}>
          <TouchableOpacity
            style={[styles.toolBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={mesclarDuplicadas}
          >
            <MaterialIcons name="merge-type" size={18} color={colors.primary} />
            <Text style={[styles.toolBtnText, { color: colors.text }]}>Mesclar duplicadas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toolBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            onPress={() => setRenameModal(true)}
          >
            <MaterialIcons name="drive-file-rename-outline" size={18} color={colors.primary} />
            <Text style={[styles.toolBtnText, { color: colors.text }]}>Renomear em lote</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface, marginBottom: 12 }]}
          value={buscaTags}
          onChangeText={setBuscaTags}
          placeholder="Buscar tags globais..."
          placeholderTextColor={getPlaceholderColor(isDarkMode)}
        />

        {loading ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Carregando...</Text>
        ) : tagsFiltradas.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {tags.length === 0
              ? 'Nenhuma tag global disponível ainda.'
              : 'Nenhuma tag encontrada para essa busca.'}
          </Text>
        ) : (
          tagsFiltradas.map((tag) => {
            const listasAssociadas = listasDaTag(tag);
            return (
              <View key={tag.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.left}>
                    <View style={[styles.dot, { backgroundColor: tag.cor || '#007AFF' }]} />
                    <View style={styles.titleWrap}>
                      <Text style={[styles.tagName, { color: colors.text }, typography.subtitleBold]}>
                        {tag.nome}
                      </Text>
                      <Text style={[styles.tagMeta, { color: colors.textSecondary }, typography.caption]}>
                        {(tag.listIds || []).length} lista(s) usando esta tag
                      </Text>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => abrirEdicao(tag)}>
                      <MaterialIcons name="edit" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => removerTag(tag)}>
                      <MaterialIcons name="delete" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                </View>

                {listasAssociadas.length > 0 && (
                  <View style={styles.chips}>
                    {listasAssociadas.slice(0, 8).map((listaAssociada) => (
                      <View key={`${tag.id}-${listaAssociada.id}`} style={[styles.chip, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.chipText, { color: colors.text }, typography.caption]}>{listaAssociada.nome}</Text>
                      </View>
                    ))}
                    {listasAssociadas.length > 8 && (
                      <View style={[styles.chip, { backgroundColor: colors.accent }]}>
                        <Text style={[styles.chipText, { color: colors.textSecondary }, typography.caption]}>
                          +{listasAssociadas.length - 8}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={editModal} transparent animationType="fade" onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
              {tagEditando ? 'Editar Tag Global' : 'Nova Tag Global'}
            </Text>

            <Text style={[styles.label, { color: colors.text }, typography.body]}>Nome da Tag</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.accent }]}
              value={nomeTag}
              onChangeText={setNomeTag}
              placeholder="Nome da tag"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            {!tagEditando &&
              tags.some((t) => t.nome.trim().toLowerCase() === nomeTag.trim().toLowerCase()) &&
              nomeTag.trim().length > 0 && (
                <Text style={{ color: '#FF9500', marginBottom: 8 }}>
                  Já existe uma tag com este nome.
                </Text>
              )}

            <ColorWheelPicker
              label="Cor da Tag"
              title="Cor da Tag Global"
              value={corTag}
              onChange={setCorTag}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setEditModal(false)}>
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={salvarEdicao}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={renameModal} transparent animationType="fade" onRequestClose={() => setRenameModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
              Renomear Tags em Lote
            </Text>

            <Text style={[styles.label, { color: colors.text }, typography.body]}>Buscar</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.accent }]}
              value={buscarLote}
              onChangeText={setBuscarLote}
              placeholder="Texto atual"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />

            <Text style={[styles.label, { color: colors.text }, typography.body]}>Substituir por</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.accent }]}
              value={substituirLote}
              onChangeText={setSubstituirLote}
              placeholder="Novo texto"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.btn, { borderColor: colors.border }]} onPress={() => setRenameModal(false)}>
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary, borderColor: colors.primary }]} onPress={renomearEmLote}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>Aplicar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerButton: { width: 32, alignItems: 'center' },
  headerTitle: { fontSize: 18 },
  content: { padding: 16, paddingBottom: 30 },
  subtitle: { marginBottom: 12 },
  toolsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  toolBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  toolBtnText: { fontSize: 12, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 30 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dot: { width: 16, height: 16, borderRadius: 8, marginRight: 10 },
  titleWrap: { flex: 1 },
  tagName: { fontSize: 16 },
  tagMeta: { marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  chipText: { fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: { width: '94%', borderRadius: 12, padding: 16 },
  modalTitle: { marginBottom: 12 },
  label: { marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
});

