import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';
import { StorageService } from '../services/storage';
import { Nota } from '../types';
import { router } from 'expo-router';
import SyncStatus from '../components/SyncStatus';

export default function NotasScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [busca, setBusca] = useState('');
  const [modalEdit, setModalEdit] = useState<{ visible: boolean; nota: Nota | null }>({ visible: false, nota: null });
  const [editTitulo, setEditTitulo] = useState('');
  const [editCor, setEditCor] = useState<string | undefined>(undefined);
  const [modalOrdenacao, setModalOrdenacao] = useState(false);
  const [ordenacaoTipo, setOrdenacaoTipo] = useState<'alfabetica' | 'data' | 'ultimoModificado'>('ultimoModificado');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<'asc' | 'desc'>('desc');

  const CORES = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#D7BDE2', '#FF9F43'
  ];

  useEffect(() => {
    carregar();
  }, []);

  const carregar = async () => {
    try {
      const ns = await StorageService.carregarNotas();
      setNotas(ns);
    } catch (e) {
      // noop
    }
  };

  const criarNota = async () => {
    try {
      const nova = await StorageService.adicionarNota({
        titulo: 'Nova nota',
        conteudo: '',
        html: '',
        cor: colors.primary,
        tags: undefined,
        textoFormatado: undefined as any,
      } as any);
      await carregar();
      router.push({ pathname: 'nota-detalhes', params: { id: nova.id } });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar a nota');
    }
  };

  const removerNota = async (id: string) => {
    Alert.alert('Excluir', 'Deseja excluir esta nota?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          await StorageService.removerNota(id);
          await carregar();
        }
      }
    ]);
  };

  const duplicarNota = async (id: string) => {
    await StorageService.duplicarNota(id);
    await carregar();
  };

  const abrirEditar = (n: Nota) => {
    setModalEdit({ visible: true, nota: n });
    setEditTitulo(n.titulo);
    setEditCor(n.cor);
  };

  const salvarEdicao = async () => {
    if (!modalEdit.nota) return;
    await StorageService.atualizarNota(modalEdit.nota.id, {
      titulo: editTitulo.trim() || 'Sem título',
      cor: editCor,
    });
    setModalEdit({ visible: false, nota: null });
    await carregar();
  };

  const filtradas = (busca.trim().length > 0
    ? notas.filter(n => (n.titulo || '').toLowerCase().includes(busca.toLowerCase()) || (n.conteudo || '').toLowerCase().includes(busca.toLowerCase()))
    : notas
  ).slice().sort((a, b) => {
    const alphaA = (a.titulo || '').toLowerCase();
    const alphaB = (b.titulo || '').toLowerCase();
    const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    const modA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const modB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    let cmp = 0;
    switch (ordenacaoTipo) {
      case 'alfabetica':
        cmp = alphaA.localeCompare(alphaB, 'pt-BR');
        break;
      case 'data':
        cmp = createdA - createdB;
        break;
      case 'ultimoModificado':
      default:
        cmp = modA - modB;
        break;
    }
    return ordenacaoDirecao === 'asc' ? cmp : -cmp;
  });

  const handleOrdenacao = (tipo: 'alfabetica' | 'data' | 'ultimoModificado', direcao?: 'asc' | 'desc') => {
    setOrdenacaoTipo(tipo);
    if (direcao) setOrdenacaoDirecao(direcao);
  };

  const hasNotas = notas.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header com logo (mesmo padrão da tela principal) */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <Image
            source={isDarkMode 
              ? require('../assets/logo_horizontal_amarelo.png')
              : require('../assets/logo_horizontal_azul.png')
            }
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Status de Sincronização */}
      <SyncStatus onPress={() => router.push('/configuracoes')} />

      {/* Conteúdo com scroll (padrão da tela principal) */}
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho de conteúdo e busca só quando houver notas */}
        {hasNotas && (
          <>
            <View style={styles.contentHeader}>
              <Text style={[styles.contentTitle, { color: colors.text }, typography.titleMedium]}>Suas Notas</Text>
              <View style={styles.headerAcoes}>
                <TouchableOpacity
                  style={[styles.btnOrdenar, { backgroundColor: colors.accent }]}
                  onPress={() => setModalOrdenacao(true)}
                >
                  <MaterialIcons name="sort" size={20} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.buscaContainer}>
              <View style={[styles.buscaInputContainer, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.buscaInput, { color: colors.text }, typography.body]}
                  value={busca}
                  onChangeText={setBusca}
                  placeholder="Buscar notas..."
                  placeholderTextColor={getPlaceholderColor(isDarkMode)}
                />
                {busca.length > 0 && (
                  <TouchableOpacity onPress={() => setBusca('')}>
                    <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </>
        )}

        {/* Lista de notas */}
        <View style={styles.list}>
          {filtradas.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="notes" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }, typography.titleMedium]}>Nenhuma nota</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }, typography.subtitle]}>
                Crie sua primeira nota para começar
              </Text>
              <TouchableOpacity
                style={[styles.btnCriarPrimeira, { backgroundColor: colors.primary }]}
                onPress={criarNota}
              >
                <MaterialIcons name="note-add" size={24} color={colors.white} />
                <Text style={[styles.btnCriarPrimeiraText, { color: colors.white }, typography.button]}>Criar Nota</Text>
              </TouchableOpacity>
            </View>
          ) : (
            filtradas.map(n => (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, { backgroundColor: colors.surface, borderLeftColor: n.cor || colors.primary, shadowColor: colors.text }]}
                onPress={() => router.push({ pathname: 'nota-detalhes', params: { id: n.id } })}
              >
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardTitle, { color: colors.text }, typography.titleMedium]} numberOfLines={1}>{n.titulo || 'Sem título'}</Text>
                  {!!n.conteudo && (
                    <Text style={[styles.cardDesc, { color: colors.textSecondary }, typography.body]} numberOfLines={1}>{n.conteudo}</Text>
                  )}
                  <Text style={[styles.cardMeta, { color: colors.textSecondary }, typography.caption]}>
                    {n.updatedAt ? new Date(n.updatedAt).toLocaleString() : ''}
                  </Text>
                </View>
                <View style={styles.cardActions}>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => abrirEditar(n)}>
                    <MaterialIcons name="edit" size={18} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={() => duplicarNota(n.id)}>
                    <MaterialIcons name="content-copy" size={18} color={colors.secondary} />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.btnDanger} onPress={() => removerNota(n.id)}>
                    <MaterialIcons name="delete" size={18} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={criarNota}>
        <MaterialIcons name="note-add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* Modal de Ordenação */}
      <Modal
        visible={modalOrdenacao}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOrdenacao(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
              Ordenar Notas
            </Text>
            
            <View style={styles.opcoesOrdenacao}>
              <TouchableOpacity
                style={[
                  styles.opcaoOrdenacao,
                  ordenacaoTipo === 'alfabetica' && styles.opcaoSelecionada
                ]}
                onPress={() => handleOrdenacao('alfabetica', ordenacaoDirecao)}
              >
                <MaterialIcons 
                  name="sort-by-alpha" 
                  size={20} 
                  color={ordenacaoTipo === 'alfabetica' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.opcaoTexto, 
                  { color: colors.text }, 
                  ordenacaoTipo === 'alfabetica' && styles.opcaoTextoSelecionada
                ]}>
                  Alfabética
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.opcaoOrdenacao,
                  ordenacaoTipo === 'data' && styles.opcaoSelecionada
                ]}
                onPress={() => handleOrdenacao('data', ordenacaoDirecao)}
              >
                <MaterialIcons 
                  name="event" 
                  size={20} 
                  color={ordenacaoTipo === 'data' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.opcaoTexto, 
                  { color: colors.text }, 
                  ordenacaoTipo === 'data' && styles.opcaoTextoSelecionada
                ]}>
                  Data de Criação
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.opcaoOrdenacao,
                  ordenacaoTipo === 'ultimoModificado' && styles.opcaoSelecionada
                ]}
                onPress={() => handleOrdenacao('ultimoModificado', ordenacaoDirecao)}
              >
                <MaterialIcons 
                  name="update" 
                  size={20} 
                  color={ordenacaoTipo === 'ultimoModificado' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.opcaoTexto, 
                  { color: colors.text }, 
                  ordenacaoTipo === 'ultimoModificado' && styles.opcaoTextoSelecionada
                ]}>
                  Último Modificado
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.direcaoContainer}>
              <Text style={[styles.direcaoLabel, { color: colors.text }]}>Direção</Text>
              <TouchableOpacity
                style={[styles.btnDirecao, { backgroundColor: ordenacaoDirecao === 'asc' ? colors.accent : 'transparent' }]}
                onPress={() => setOrdenacaoDirecao('asc')}
              >
                <MaterialIcons name="arrow-upward" size={18} color={ordenacaoDirecao === 'asc' ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.btnDirecaoTexto, 
                  { color: ordenacaoDirecao === 'asc' ? colors.primary : colors.textSecondary },
                  ordenacaoDirecao === 'asc' && styles.btnDirecaoTextoSelecionada
                ]}>
                  Ascendente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnDirecao, { backgroundColor: ordenacaoDirecao === 'desc' ? colors.accent : 'transparent' }]}
                onPress={() => setOrdenacaoDirecao('desc')}
              >
                <MaterialIcons name="arrow-downward" size={18} color={ordenacaoDirecao === 'desc' ? colors.primary : colors.textSecondary} />
                <Text style={[
                  styles.btnDirecaoTexto, 
                  { color: ordenacaoDirecao === 'desc' ? colors.primary : colors.textSecondary },
                  ordenacaoDirecao === 'desc' && styles.btnDirecaoTextoSelecionada
                ]}>
                  Descendente
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btnFechar, { backgroundColor: colors.primary }]}
              onPress={() => setModalOrdenacao(false)}
            >
              <Text style={[styles.btnFecharTexto, { color: colors.white }]}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {modalEdit.visible && modalEdit.nota && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>Editar Nota</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
              value={editTitulo}
              onChangeText={setEditTitulo}
              placeholder="Título"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <Text style={[styles.sectionLabel, { color: colors.text }]}>Cor</Text>
            <View style={styles.colorsRow}>
              {CORES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorDot, { backgroundColor: c, borderColor: colors.border }, editCor === c && styles.colorDotSel]}
                  onPress={() => setEditCor(c)}
                />
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={() => setModalEdit({ visible: false, nota: null })}>
                <Text style={{ color: colors.text }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={salvarEdicao}>
                <Text style={{ color: colors.text }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 0 },
  logo: { height: 50, width: 150 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  contentHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  contentTitle: { fontSize: 20, fontWeight: '600' },
  headerAcoes: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btnOrdenar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  buscaContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  buscaInputContainer: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  buscaInput: { flex: 1, marginLeft: 8, fontSize: 16, paddingVertical: 8 },
  list: { flex: 1 },
  card: { borderRadius: 12, padding: 12, marginBottom: 12, borderLeftWidth: 4, shadowOpacity: 0.1, shadowRadius: 4, elevation: 1, flexDirection: 'row', alignItems: 'center' },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  cardDesc: { marginTop: 2, fontSize: 14 },
  cardMeta: { marginTop: 2, fontSize: 12 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  btnDanger: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: 'transparent' },
  fab: { position: 'absolute', right: 16, bottom: 24, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalContent: { width: '92%', borderRadius: 12, padding: 16 },
  modalTitle: { marginBottom: 12, fontSize: 18, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  sectionLabel: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  colorsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 1 },
  colorDotSel: { borderWidth: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 40 },
  emptyTitle: { marginTop: 16, marginBottom: 8 },
  emptySubtitle: { textAlign: 'center', marginBottom: 24 },
  btnCriarPrimeira: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  btnCriarPrimeiraText: { marginLeft: 8 },
  // Modal de ordenação
  opcoesOrdenacao: { marginBottom: 20 },
  opcaoOrdenacao: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, marginBottom: 8 },
  opcaoSelecionada: { backgroundColor: '#F0F8FF' },
  opcaoTexto: { marginLeft: 12 },
  opcaoTextoSelecionada: { fontWeight: '600' },
  direcaoContainer: { marginBottom: 20 },
  direcaoLabel: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  btnDirecao: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, marginBottom: 8 },
  btnDirecaoSelecionada: { backgroundColor: '#007AFF' },
  btnDirecaoTexto: { fontSize: 14, marginLeft: 8, color: '#8E8E93' },
  btnDirecaoTextoSelecionada: { fontWeight: '600' },
  btnFechar: { paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  btnFecharTexto: { fontSize: 16, fontWeight: '600' },
});


