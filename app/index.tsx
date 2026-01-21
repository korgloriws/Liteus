import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Lista, OrdenacaoTipo, OrdenacaoDirecao, Item, Nota } from '../types';
import { StorageService } from '../services/storage';
import { UtilsService } from '../services/utils';
import { DocumentProcessor } from '../services/documentProcessor';
import { useTheme } from '../services/ThemeContext';
import { SyncService } from '../services/syncService';
import { getPlaceholderColor } from '../services/theme';
import SyncStatus from '../components/SyncStatus';
import QuillInlineEditor from '../components/QuillInlineEditor';

export default function ListasScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const [listas, setListas] = useState<Lista[]>([]);
  const [listasFiltradas, setListasFiltradas] = useState<Lista[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [textoBusca, setTextoBusca] = useState('');
  const [ordenacaoTipo, setOrdenacaoTipo] = useState<OrdenacaoTipo>('ultimoModificado');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<OrdenacaoDirecao>('desc');
  const [modalOrdenacao, setModalOrdenacao] = useState(false);
  

  const [modalEditarLista, setModalEditarLista] = useState(false);
  const [listaEditando, setListaEditando] = useState<Lista | null>(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [editandoDescricao, setEditandoDescricao] = useState('');
  const [editandoDescricaoHtml, setEditandoDescricaoHtml] = useState<string>('');
  const [editandoCor, setEditandoCor] = useState('#007AFF');
  const [editandoPermiteSelecaoAleatoria, setEditandoPermiteSelecaoAleatoria] = useState(true);

  const [editandoCategorias, setEditandoCategorias] = useState<any[]>([]);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [novaCategoriaCor, setNovaCategoriaCor] = useState('#007AFF');
  

  const [categoriaEditando, setCategoriaEditando] = useState<any | null>(null);
  const [modalEditarCategoria, setModalEditarCategoria] = useState(false);
  const [nomeCategoriaEditando, setNomeCategoriaEditando] = useState('');
  const [corCategoriaEditando, setCorCategoriaEditando] = useState('#007AFF');

  // Edição de Nota
  const [modalEditarNota, setModalEditarNota] = useState(false);
  const [notaEditando, setNotaEditando] = useState<Nota | null>(null);
  const [editandoNotaTitulo, setEditandoNotaTitulo] = useState('');
  const [editandoNotaCor, setEditandoNotaCor] = useState('#007AFF');


  const [modalOpcoesAleatoria, setModalOpcoesAleatoria] = useState(false);
  const [modalSelecaoAleatoria, setModalSelecaoAleatoria] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const [animandoSelecao, setAnimandoSelecao] = useState(false);
  const [listaParaSelecao, setListaParaSelecao] = useState<Lista | null>(null);


  useFocusEffect(
    React.useCallback(() => {
    carregarListas();
    }, [])
  );

  const carregarListas = async () => {
    try {
      setLoading(true);
      const listasCarregadas = await StorageService.carregarListas();
      const notasCarregadas = await StorageService.carregarNotas();
      setListas(listasCarregadas);
      setNotas(notasCarregadas);
      aplicarFiltrosEOrdenacao(listasCarregadas, textoBusca, ordenacaoTipo, ordenacaoDirecao);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar as listas');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltrosEOrdenacao = (
    listasParaFiltrar: Lista[],
    busca: string,
    tipo: OrdenacaoTipo,
    direcao: OrdenacaoDirecao
  ) => {

    let listasFiltradas = busca.trim() 
      ? UtilsService.buscarListas(listasParaFiltrar, busca)
      : listasParaFiltrar;


    listasFiltradas = UtilsService.ordenarListas(listasFiltradas, tipo, direcao);
    
    setListasFiltradas(listasFiltradas);
  };

  const handleBusca = (texto: string) => {
    setTextoBusca(texto);
    aplicarFiltrosEOrdenacao(listas, texto, ordenacaoTipo, ordenacaoDirecao);
  };

  const handleOrdenacao = (tipo: OrdenacaoTipo, direcao: OrdenacaoDirecao) => {
    setOrdenacaoTipo(tipo);
    setOrdenacaoDirecao(direcao);
    aplicarFiltrosEOrdenacao(listas, textoBusca, tipo, direcao);
    setModalOrdenacao(false);
  };

  const removerLista = async (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removerLista(id);
              await carregarListas();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a lista');
            }
          },
        },
      ]
    );
  };

  const duplicarLista = async (id: string) => {
    try {
      await StorageService.duplicarLista(id);
      await carregarListas();
      Alert.alert('Sucesso', 'Lista duplicada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível duplicar a lista');
    }
  };

  const duplicarNota = async (id: string) => {
    try {
      await StorageService.duplicarNota(id);
      await carregarListas();
      Alert.alert('Sucesso', 'Nota duplicada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível duplicar a nota');
    }
  };

  const removerNota = async (id: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir esta nota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removerNota(id);
              await carregarListas();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir a nota');
            }
          },
        },
      ]
    );
  };


  const abrirModalEditar = (lista: Lista) => {
    setListaEditando(lista);
    setEditandoNome(lista.nome);
    setEditandoDescricao(lista.descricao || '');
    setEditandoDescricaoHtml(lista.descricaoHtml || (lista.descricao ? `<p>${lista.descricao}</p>` : ''));
    setEditandoCor(lista.cor || '#007AFF');
    setEditandoPermiteSelecaoAleatoria(lista.permiteSelecaoAleatoria || false);
    setEditandoCategorias(lista.categorias || []);
    setModalEditarLista(true);
  };

  const abrirModalEditarNota = (nota: Nota) => {
    setNotaEditando(nota);
    setEditandoNotaTitulo(nota.titulo || '');
    setEditandoNotaCor(nota.cor || '#007AFF');
    setModalEditarNota(true);
  };

  const salvarEdicao = async () => {
    if (!listaEditando || !editandoNome.trim()) {
      Alert.alert('Erro', 'O nome da lista é obrigatório');
      return;
    }

    try {
      await StorageService.atualizarLista(listaEditando.id, {
        nome: editandoNome.trim(),
        descricao: editandoDescricao.trim() || undefined,
        descricaoHtml: editandoDescricaoHtml || undefined,
        cor: editandoCor,
        permiteSelecaoAleatoria: editandoPermiteSelecaoAleatoria,
        categorias: editandoCategorias,
      });

      // Limpar formulário de edição
      limparFormularioEdicao();
      
      setModalEditarLista(false);
      setListaEditando(null);
      await carregarListas();
      Alert.alert('Sucesso', 'Lista atualizada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a lista');
    }
  };

  const salvarEdicaoNota = async () => {
    if (!notaEditando || !editandoNotaTitulo.trim()) {
      Alert.alert('Erro', 'O título da nota é obrigatório');
      return;
    }

    try {
      await StorageService.atualizarNota(notaEditando.id, {
        titulo: editandoNotaTitulo.trim(),
        cor: editandoNotaCor,
      });

      setModalEditarNota(false);
      setNotaEditando(null);
      await carregarListas();
      Alert.alert('Sucesso', 'Nota atualizada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a nota');
    }
  };

  const limparFormularioEdicao = () => {
    setEditandoNome('');
    setEditandoDescricao('');
    setEditandoDescricaoHtml('');
    setEditandoCor('#007AFF');
    setEditandoPermiteSelecaoAleatoria(true);
    setEditandoCategorias([]);
  };

  const limparFormularioCategoria = () => {
    setNovaCategoriaNome('');
    setNovaCategoriaCor('#007AFF');
  };

  const adicionarCategoria = () => {
    if (!novaCategoriaNome.trim()) {
      Alert.alert('Erro', 'O nome da categoria é obrigatório');
      return;
    }

    const novaCategoria = {
      id: Date.now().toString(),
      nome: novaCategoriaNome.trim(),
      cor: novaCategoriaCor,
      createdAt: new Date().toISOString(),
    };

    setEditandoCategorias([...editandoCategorias, novaCategoria]);
    limparFormularioCategoria();
    setModalCategoria(false);
  };

  const removerCategoria = (id: string) => {
    setEditandoCategorias(editandoCategorias.filter(cat => cat.id !== id));
  };

  const editarCategoria = (categoria: any) => {
    setCategoriaEditando(categoria);
    setNomeCategoriaEditando(categoria.nome);
    setCorCategoriaEditando(categoria.cor || '#007AFF');
    setModalEditarCategoria(true);
  };

  // Funções para seleção aleatória
  const abrirModalOpcoesAleatoria = (lista: Lista) => {
    setListaParaSelecao(lista);
    setModalOpcoesAleatoria(true);
  };

  const selecionarAleatoriamente = (excluirConcluidos: boolean = false) => {
    if (!listaParaSelecao || listaParaSelecao.itens.length === 0) {
      Alert.alert('Aviso', 'Não há itens na lista para selecionar');
      return;
    }

    let itensFiltrados = listaParaSelecao.itens;
    let filtrosAtivos = [];

    // Filtrar itens concluídos se solicitado
    if (excluirConcluidos) {
      const itensAntes = itensFiltrados.length;
      itensFiltrados = itensFiltrados.filter(item => !item.concluido);
      const itensRemovidos = itensAntes - itensFiltrados.length;
      if (itensRemovidos > 0) {
        filtrosAtivos.push(`Excluídos ${itensRemovidos} itens concluídos`);
      }
    }

    if (itensFiltrados.length === 0) {
      Alert.alert('Aviso', 'Nenhum item encontrado com os filtros ativos');
      return;
    }

    setAnimandoSelecao(true);
    setModalSelecaoAleatoria(true);
    setItemSelecionado(null);

    // Simular animação de seleção
    let contador = 0;
    const maxIteracoes = 20;
    const intervalo = setInterval(() => {
      const itemAleatorio = itensFiltrados[Math.floor(Math.random() * itensFiltrados.length)];
      setItemSelecionado(itemAleatorio);
      contador++;

      if (contador >= maxIteracoes) {
        clearInterval(intervalo);
        setAnimandoSelecao(false);
      }
    }, 100);
  };

  const reiniciarSelecaoAleatoria = () => {
    setItemSelecionado(null);
    setModalSelecaoAleatoria(false);
    setAnimandoSelecao(false);
    setListaParaSelecao(null);
  };


  const renderItem = ({ item }: { item: Lista }) => (
    <TouchableOpacity
      style={[styles.listaItem, { 
        borderLeftColor: item.cor || colors.primary,
        backgroundColor: colors.surface,
        shadowColor: colors.text,
      }]}
      onPress={() => router.push({
        pathname: '/lista-detalhes',
        params: { id: item.id }
      })}
    >
      <View style={styles.listaInfo}>
        <Text style={[styles.listaNome, { color: colors.text }, typography.titleMedium]}>{item.nome}</Text>
        {item.descricao && (
          <Text style={[styles.listaDescricao, { color: colors.textSecondary }, typography.body]}>{item.descricao}</Text>
        )}
        <Text style={[styles.listaItens, { color: colors.textSecondary }, typography.caption]}>
          {item.itens.length} item{item.itens.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <View style={styles.listaAcoes}>
        <TouchableOpacity
          style={[styles.btnEditar, { backgroundColor: colors.accent }]}
          onPress={() => abrirModalEditar(item)}
        >
          <MaterialIcons name="edit" size={20} color={colors.primary} />
        </TouchableOpacity>
        {item.permiteSelecaoAleatoria && (
          <TouchableOpacity
            style={[styles.btnAleatorio, { backgroundColor: colors.accent }]}
            onPress={() => abrirModalOpcoesAleatoria(item)}
          >
            <MaterialIcons name="casino" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.btnDuplicar, { backgroundColor: colors.accent }]}
          onPress={() => duplicarLista(item.id)}
        >
          <MaterialIcons name="content-copy" size={20} color={colors.secondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnExcluir}
          onPress={() => removerLista(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="hourglass-empty" size={48} color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }, typography.subtitle]}>Carregando...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header fixo */}
      <View style={[styles.header, { 
        backgroundColor: colors.surface,
        borderBottomColor: colors.border
      }]}>
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
      
      {/* Conteúdo com scroll */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {listas.length === 0 && notas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="list" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }, typography.titleMedium]}>Nenhuma lista ou nota</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }, typography.subtitle]}>
              Crie sua primeira lista ou nota para começar
            </Text>
            <TouchableOpacity
              style={[styles.btnCriarPrimeira, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/criar-lista')}
            >
              <MaterialIcons name="add" size={24} color={colors.white} />
              <Text style={[styles.btnCriarPrimeiraText, { color: colors.white }, typography.button]}>Criar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Barra de Busca */}
            <View style={styles.buscaContainer}>
              <View style={[styles.buscaInputContainer, { backgroundColor: colors.accent, borderColor: colors.border }]}>
                <MaterialIcons name="search" size={20} color={colors.textSecondary} />
                <TextInput
                  style={[styles.buscaInput, { 
                    color: colors.text
                  }, typography.body]}
                  placeholder="Buscar listas..."
                  placeholderTextColor={getPlaceholderColor(isDarkMode)}
                  value={textoBusca}
                  onChangeText={handleBusca}
                />
                {textoBusca.length > 0 && (
                  <TouchableOpacity onPress={() => handleBusca('')}>
                    <MaterialIcons name="close" size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[styles.btnOrdenar, { backgroundColor: colors.accent }]}
                onPress={() => setModalOrdenacao(true)}
              >
                <MaterialIcons name="sort" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.contentHeader}>
              <Text style={[styles.contentTitle, { color: colors.text }, typography.titleMedium]}>Suas Listas</Text>
              <View style={styles.headerAcoes} />
            </View>

            {/* Somente listas */}
            <View style={styles.listContainer}>
              {(() => {
                const busca = textoBusca.trim().toLowerCase();
                const entradas = listasFiltradas.map(l => ({
                  id: l.id,
                  titulo: l.nome,
                  descricao: l.descricao,
                  cor: l.cor,
                  extra: `${l.itens.length} item${l.itens.length !== 1 ? 's' : ''}`,
                  lista: l,
                  mod: l.dataModificacao || 0,
                  created: l.dataCriacao || 0,
                  alpha: (l.nome || '').toLowerCase(),
                  categoryCount: l.itens.length,
                }));

                const sorted = [...entradas].sort((a, b) => {
                  switch (ordenacaoTipo) {
                    case 'alfabetica': {
                      const cmp = a.alpha.localeCompare(b.alpha, 'pt-BR');
                      return ordenacaoDirecao === 'asc' ? cmp : -cmp;
                    }
                    case 'data': {
                      const cmp = a.created - b.created;
                      return ordenacaoDirecao === 'asc' ? cmp : -cmp;
                    }
                    case 'categoria': {
                      
                      const cmp = a.categoryCount - b.categoryCount;
                      return ordenacaoDirecao === 'asc' ? cmp : -cmp;
                    }
                    case 'ultimoModificado':
                    default: {
                      const cmp = a.mod - b.mod;
                      return ordenacaoDirecao === 'asc' ? cmp : -cmp;
                    }
                  }
                });

                return sorted.map((e) => (
                  <TouchableOpacity
                    key={e.id}
                    style={[styles.listaItem, { 
                      borderLeftColor: e.cor || colors.primary,
                      backgroundColor: colors.surface,
                      shadowColor: colors.text,
                    }]}
                    onPress={() => router.push({ pathname: '/lista-detalhes', params: { id: e.id } })}
                  >
                    <View style={styles.listaInfo}>
                      <Text style={[styles.listaNome, { color: colors.text }, typography.titleMedium]} numberOfLines={1}>{e.titulo}</Text>
                      {e.descricao ? (
                        <Text style={[styles.listaDescricao, { color: colors.textSecondary }, typography.body]} numberOfLines={1}>{e.descricao}</Text>
                      ) : null}
                      {e.extra ? (
                        <Text style={[styles.listaItens, { color: colors.textSecondary }, typography.caption]}>{e.extra}</Text>
                      ) : null}
                    </View>
                    <View style={styles.listaAcoes}>
                      <>
                        <TouchableOpacity
                          style={[styles.btnEditar, { backgroundColor: colors.accent }]}
                          onPress={() => abrirModalEditar(e.lista)}
                        >
                          <MaterialIcons name="edit" size={20} color={colors.primary} />
                        </TouchableOpacity>
                        {e.lista.permiteSelecaoAleatoria && (
                          <TouchableOpacity
                            style={[styles.btnAleatorio, { backgroundColor: colors.accent }]}
                            onPress={() => abrirModalOpcoesAleatoria(e.lista)}
                          >
                            <MaterialIcons name="casino" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[styles.btnDuplicar, { backgroundColor: colors.accent }]}
                          onPress={() => duplicarLista(e.lista.id)}
                        >
                          <MaterialIcons name="content-copy" size={20} color={colors.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.btnExcluir}
                          onPress={() => removerLista(e.lista.id)}
                        >
                          <MaterialIcons name="delete" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </>
                    </View>
                  </TouchableOpacity>
                ));
              })()}
            </View>
          </>
        )}
      </ScrollView>
      
      {/* FAB criar lista */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/criar-lista')}
      >
        <MaterialIcons name="add" size={26} color="#fff" />
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
              Ordenar Listas
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
                  typography.subtitle,
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
                  name="schedule" 
                  size={20} 
                  color={ordenacaoTipo === 'data' ? colors.primary : colors.textSecondary} 
                />
                <Text style={[
                  styles.opcaoTexto,
                  { color: colors.text },
                  typography.subtitle,
                  ordenacaoTipo === 'data' && styles.opcaoTextoSelecionada
                ]}>
                  Data de Criação
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.opcaoOrdenacao,
                  ordenacaoTipo === 'categoria' && styles.opcaoSelecionada
                ]}
                onPress={() => handleOrdenacao('categoria', ordenacaoDirecao)}
              >
                <MaterialIcons 
                  name="category" 
                  size={20} 
                  color={ordenacaoTipo === 'categoria' ? colors.primary : colors.textSecondary}
                />
                <Text style={[
                  styles.opcaoTexto,
                  { color: isDarkMode ? '#fff' : '#1C1C1E' },
                  ordenacaoTipo === 'categoria' && styles.opcaoTextoSelecionada
                ]}>
                  Quantidade de Itens
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
                  typography.subtitle,
                  ordenacaoTipo === 'ultimoModificado' && styles.opcaoTextoSelecionada
                ]}>
                  Último Modificado
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.direcaoContainer}>
              <Text style={[styles.direcaoLabel, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                Direção:
              </Text>
              <TouchableOpacity
                style={[
                  styles.btnDirecao,
                  ordenacaoDirecao === 'asc' && styles.btnDirecaoSelecionada
                ]}
                onPress={() => handleOrdenacao(ordenacaoTipo, 'asc')}
              >
                <MaterialIcons 
                  name="arrow-upward" 
                  size={16} 
                  color={ordenacaoDirecao === 'asc' ? '#fff' : '#8E8E93'} 
                />
                <Text style={[
                  styles.btnDirecaoTexto,
                  ordenacaoDirecao === 'asc' && styles.btnDirecaoTextoSelecionada
                ]}>
                  Crescente
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.btnDirecao,
                  ordenacaoDirecao === 'desc' && styles.btnDirecaoSelecionada
                ]}
                onPress={() => handleOrdenacao(ordenacaoTipo, 'desc')}
              >
                <MaterialIcons 
                  name="arrow-downward" 
                  size={16} 
                  color={ordenacaoDirecao === 'desc' ? '#fff' : '#8E8E93'} 
                />
                <Text style={[
                  styles.btnDirecaoTexto,
                  ordenacaoDirecao === 'desc' && styles.btnDirecaoTextoSelecionada
                ]}>
                  Decrescente
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btnFechar}
              onPress={() => setModalOrdenacao(false)}
            >
              <Text style={styles.btnFecharTexto}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Editar Nota */}
      <Modal
        visible={modalEditarNota}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalEditarNota(false);
          setNotaEditando(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }] }>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>Editar Nota</Text>

            <View style={styles.editarGrupo}>
              <Text style={[styles.editarLabel, { color: colors.text }]}>Título *</Text>
              <TextInput
                style={[styles.editarInput, { backgroundColor: colors.accent, color: colors.text, borderColor: colors.border }]}
                value={editandoNotaTitulo}
                onChangeText={setEditandoNotaTitulo}
                placeholder="Digite o título da nota"
                placeholderTextColor={getPlaceholderColor(isDarkMode)}
                maxLength={80}
              />
            </View>

            <View style={styles.editarGrupo}>
              <Text style={[styles.editarLabel, { color: colors.text }]}>Cor</Text>
              <View style={styles.coresContainer}>
                {['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D92', '#5AC8FA', '#FFCC02', '#FF6B35'].map((cor) => (
                  <TouchableOpacity
                    key={cor}
                    style={[styles.corItem, { backgroundColor: cor }, editandoNotaCor === cor && styles.corSelecionada]}
                    onPress={() => setEditandoNotaCor(cor)}
                  >
                    {editandoNotaCor === cor && (
                      <MaterialIcons name="check" size={16} color="#fff" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalEditarBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => {
                  setModalEditarNota(false);
                  setNotaEditando(null);
                }}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={salvarEdicaoNota}
              >
                <Text style={styles.btnSalvarText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Editar Lista */}
      <Modal
        visible={modalEditarLista}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setModalEditarLista(false);
          limparFormularioEdicao();
        }}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalEditarContent, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
              <Text style={[styles.modalEditarTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                Editar Lista
              </Text>

              {/* Nome da Lista */}
              <View style={styles.editarGrupo}>
                <Text style={[styles.editarLabel, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Nome da Lista *</Text>
                <TextInput
                  style={[styles.editarInput, { 
                    backgroundColor: isDarkMode ? '#38383A' : '#fff',
                    color: isDarkMode ? '#fff' : '#1C1C1E',
                    borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
                  }]}
                  value={editandoNome}
                  onChangeText={setEditandoNome}
                  placeholder="Digite o nome da lista"
                  placeholderTextColor={getPlaceholderColor(isDarkMode)}
                  maxLength={50}
                />
              </View>

              {/* Descrição */}
              <View style={styles.editarGrupo}>
                <Text style={[styles.editarLabel, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Descrição (opcional)</Text>
                <QuillInlineEditor
                  initialHtml={editandoDescricaoHtml}
                  placeholder="Digite uma descrição para a lista"
                  onChange={(text, html) => {
                    setEditandoDescricao(text);
                    setEditandoDescricaoHtml(html);
                  }}
                  minHeight={160}
                />
              </View>

              {/* Cor */}
              <View style={styles.editarGrupo}>
                <Text style={[styles.editarLabel, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Cor da Lista</Text>
                <View style={styles.coresContainer}>
                  {['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D92', '#5AC8FA', '#FFCC02', '#FF6B35'].map((cor) => (
                    <TouchableOpacity
                      key={cor}
                      style={[
                        styles.corItem,
                        { backgroundColor: cor },
                        editandoCor === cor && styles.corSelecionada,
                      ]}
                      onPress={() => setEditandoCor(cor)}
                    >
                      {editandoCor === cor && (
                        <MaterialIcons name="check" size={16} color="#fff" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Categorias */}
              <View style={styles.editarGrupo}>
                <Text style={[styles.editarLabel, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Categorias</Text>
                {editandoCategorias.length > 0 && (
                  <View style={styles.categoriasContainer}>
                    {editandoCategorias.map((categoria) => (
                      <View key={categoria.id} style={styles.categoriaItem}>
                        <View style={[styles.categoriaCor, { backgroundColor: categoria.cor }]} />
                        <Text style={[styles.categoriaNome, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                          {categoria.nome}
                        </Text>
                        <View style={styles.categoriaBotoes}>
                          <TouchableOpacity
                            style={styles.btnEditarCategoria}
                            onPress={() => editarCategoria(categoria)}
                          >
                            <MaterialIcons name="edit" size={16} color="#007AFF" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.btnRemoverCategoria}
                            onPress={() => removerCategoria(categoria.id)}
                          >
                            <MaterialIcons name="close" size={16} color="#FF3B30" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.btnAdicionarCategoria, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                  onPress={() => setModalCategoria(true)}
                >
                  <MaterialIcons name="add" size={20} color={colors.primary} />
                  <Text style={[styles.btnAdicionarCategoriaTexto, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                    Adicionar Categoria
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Seleção Aleatória */}
              <View style={styles.editarGrupo}>
                <View style={styles.switchContainer}>
                  <Text style={[styles.editarLabel, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>Permitir Seleção Aleatória</Text>
                  <Switch
                    value={editandoPermiteSelecaoAleatoria}
                    onValueChange={setEditandoPermiteSelecaoAleatoria}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              </View>

              {/* Tipo de Animação */}


              {/* Botões */}
              <View style={styles.modalEditarBotoes}>
                <TouchableOpacity
                  style={styles.btnCancelar}
                  onPress={() => {
                    setModalEditarLista(false);
                    limparFormularioEdicao();
                  }}
                >
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.btnSalvar}
                  onPress={salvarEdicao}
                >
                  <Text style={styles.btnSalvarText}>Salvar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal para Adicionar Categoria */}
      <Modal
        visible={modalCategoria}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setModalCategoria(false);
          limparFormularioCategoria();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
              Adicionar Categoria
            </Text>
            
            <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
              Nome da Categoria
            </Text>
            <TextInput
              style={[styles.editarInput, { 
                backgroundColor: colors.accent,
                color: colors.text,
                borderColor: colors.border
              }]}
              placeholder="Digite o nome da categoria"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
              value={novaCategoriaNome}
              onChangeText={setNovaCategoriaNome}
              maxLength={30}
            />

            <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
              Cor da Categoria
            </Text>
            <View style={styles.coresContainer}>
              {['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D92', '#5AC8FA', '#FFCC02', '#FF6B35'].map((cor) => (
                <TouchableOpacity
                  key={cor}
                  style={[
                    styles.corItem,
                    { backgroundColor: cor },
                    novaCategoriaCor === cor && styles.corSelecionada,
                  ]}
                  onPress={() => setNovaCategoriaCor(cor)}
                >
                  {novaCategoriaCor === cor && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => {
                  setModalCategoria(false);
                  limparFormularioCategoria();
                }}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={adicionarCategoria}
              >
                <Text style={styles.btnSalvarText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Importação */}
      <Modal
        visible={false} 
        transparent
        animationType="slide"
        onRequestClose={() => {}} 
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalEditarContent, { backgroundColor: colors.surface }]}>
              <Text style={[styles.modalEditarTitle, { color: colors.text }, typography.titleMedium]}>
                Importar Lista
              </Text>
              
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, typography.body]}>
                Formatos suportados: TXT, JSON, DOCX, ODT, RTF, PDF
              </Text>

              {/* Seleção de Arquivo */}
              <View style={styles.editarGrupo}>
                <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
                  Selecionar Arquivo
                </Text>
                <TouchableOpacity
                  style={[styles.btnSelecionarArquivo, { backgroundColor: colors.accent }]}
                  onPress={() => {}} // Remover função de selecionar arquivo
                >
                  <MaterialIcons name="file-upload" size={24} color={colors.primary} />
                  <Text style={[styles.btnSelecionarArquivoText, { color: colors.text }, typography.body]}>
                    Escolher arquivo
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Informações da Lista */}
              {/* Remover estados e lógica de importação */}
              {/* Remover botões e modais de importação/exportação de arquivos. */}

              {/* Botões */}
              <View style={styles.modalEditarBotoes}>
                <TouchableOpacity
                  style={styles.btnCancelar}
                  onPress={() => {}} // Remover função de limpar importação
                >
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnSalvar, { opacity: 0.5 }]} 
                  onPress={() => {}}
                  disabled={true}
                >
                  <Text style={styles.btnSalvarText}>Criar Lista</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de edição de categoria */}
      <Modal
        visible={modalEditarCategoria}
        transparent
        animationType="fade"
        onRequestClose={() => setModalEditarCategoria(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}> 
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
              Editar Categoria
            </Text>
            <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
              Nome da Categoria
            </Text>
            <TextInput
              style={[styles.editarInput, { backgroundColor: colors.accent, color: colors.text, borderColor: colors.border }]}
              placeholder="Digite o nome da categoria"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
              value={nomeCategoriaEditando}
              onChangeText={setNomeCategoriaEditando}
              maxLength={30}
            />
            <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
              Cor da Categoria
            </Text>
            <View style={styles.coresContainer}>
              {['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D92', '#5AC8FA', '#FFCC02', '#FF6B35'].map((cor) => (
                <TouchableOpacity
                  key={cor}
                  style={[
                    styles.corItem,
                    { backgroundColor: cor },
                    corCategoriaEditando === cor && styles.corSelecionada,
                  ]}
                  onPress={() => setCorCategoriaEditando(cor)}
                >
                  {corCategoriaEditando === cor && (
                    <MaterialIcons name="check" size={16} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalEditarCategoria(false)}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={async () => {
                  if (!nomeCategoriaEditando.trim() || !categoriaEditando || !listaEditando) return;
                  
                  try {
                    // Atualizar categoria no StorageService
                    const categoriaAtualizada = await StorageService.atualizarCategoria(
                      listaEditando.id,
                      categoriaEditando.id,
                      {
                        nome: nomeCategoriaEditando.trim(),
                        cor: corCategoriaEditando
                      }
                    );

                    if (categoriaAtualizada) {
                      // Atualizar categoria na lista local
                      setEditandoCategorias(editandoCategorias.map(cat =>
                        cat.id === categoriaEditando.id
                          ? { ...cat, nome: nomeCategoriaEditando.trim(), cor: corCategoriaEditando }
                          : cat
                      ));
                      
                      // Atualizar categoria na lista principal
                      setListas(listasAntigas => listasAntigas.map(lista => {
                        if (lista.id === listaEditando.id) {
                          return {
                            ...lista,
                            categorias: lista.categorias.map(cat =>
                              cat.id === categoriaEditando.id
                                ? { ...cat, nome: nomeCategoriaEditando.trim(), cor: corCategoriaEditando }
                                : cat
                            )
                          };
                        }
                        return lista;
                      }));
                    }
                    
                    setModalEditarCategoria(false);
                  } catch (error) {
                    console.error('Erro ao atualizar categoria:', error);
                    Alert.alert('Erro', 'Falha ao atualizar categoria');
                  }
                }}
              >
                <Text style={styles.btnSalvarText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Opções de Seleção Aleatória */}
      <Modal
        visible={modalOpcoesAleatoria}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalOpcoesAleatoria(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleLarge]}>
              Opções de Seleção Aleatória
            </Text>
            
            <View style={styles.opcoesContainer}>
              <TouchableOpacity
                style={[styles.opcaoItem, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setModalOpcoesAleatoria(false);
                  selecionarAleatoriamente(false);
                }}
              >
                <MaterialIcons name="casino" size={24} color={colors.primary} />
                <View style={styles.opcaoContent}>
                  <Text style={[styles.opcaoTitle, { color: colors.text }, typography.titleMedium]}>
                    Incluir todos os itens
                  </Text>
                  <Text style={[styles.opcaoSubtitle, { color: colors.textSecondary }, typography.caption]}>
                    Considerar itens concluídos e não concluídos
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.opcaoItem, { backgroundColor: colors.accent }]}
                onPress={() => {
                  setModalOpcoesAleatoria(false);
                  selecionarAleatoriamente(true);
                }}
              >
                <MaterialIcons name="filter-list" size={24} color={colors.primary} />
                <View style={styles.opcaoContent}>
                  <Text style={[styles.opcaoTitle, { color: colors.text }, typography.titleMedium]}>
                    Excluir itens concluídos
                  </Text>
                  <Text style={[styles.opcaoSubtitle, { color: colors.textSecondary }, typography.caption]}>
                    Selecionar apenas itens não concluídos
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setModalOpcoesAleatoria(false)}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção Aleatória */}
      <Modal
        visible={modalSelecaoAleatoria}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setModalSelecaoAleatoria(false);
          reiniciarSelecaoAleatoria();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleLarge]}>
              {animandoSelecao ? 'Selecionando...' : 'Item Selecionado!'}
            </Text>
            
            {itemSelecionado && (
              <View style={[styles.itemSelecionadoContainer, { 
                borderColor: colors.primary,
                backgroundColor: colors.accent 
              }]}>
                <View style={styles.itemSelecionadoHeader}>
                  <MaterialIcons 
                    name="star" 
                    size={24} 
                    color={colors.primary} 
                  />
                  <Text style={[styles.itemSelecionadoTitle, { color: colors.text }, typography.titleMedium]}>
                    {itemSelecionado.texto}
                  </Text>
                </View>
                
                {itemSelecionado.descricao && (
                  <Text style={[styles.itemSelecionadoDescricao, { color: colors.textSecondary }, typography.body]}>
                    {itemSelecionado.descricao}
                  </Text>
                )}
                
                {itemSelecionado.categoria && listaParaSelecao && (
                  <View style={styles.itemSelecionadoCategoria}>
                    <Text style={[styles.itemSelecionadoCategoriaText, { color: colors.primary }, typography.caption]}>
                      Categoria: {listaParaSelecao.categorias.find(cat => cat.id === itemSelecionado.categoria)?.nome || itemSelecionado.categoria}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={[styles.btnCancelar, { flex: 1 }]}
                onPress={() => {
                  setModalSelecaoAleatoria(false);
                  reiniciarSelecaoAleatoria();
                }}
              >
                <Text style={styles.btnCancelarText}>Fechar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.btnSalvar, { flex: 1 }]}
                onPress={() => {
                  setModalSelecaoAleatoria(false);
                  reiniciarSelecaoAleatoria();
                  if (listaParaSelecao) {
                    router.push({
                      pathname: '/lista-detalhes',
                      params: { id: listaParaSelecao.id }
                    });
                  }
                }}
              >
                <Text style={styles.btnSalvarText}>Ver na Lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logo: {
    height: 50,
    width: 150,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    marginLeft: 44,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  buscaInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
  },
  buscaInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 8,
  },
  btnOrdenar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  btnAdicionar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  listaItem: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listaInfo: {
    flex: 1,
  },
  listaNome: {
    marginBottom: 4,
  },
  listaDescricao: {
    marginBottom: 4,
  },
  listaItens: {
  },
  listaAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  noteBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  btnAleatorio: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  btnDuplicar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  btnExcluir: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFE5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    textAlign: 'center',
    marginBottom: 32,
  },
  btnCriarPrimeira: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  btnCriarPrimeiraText: {
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  // Estilos do Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  opcoesOrdenacao: {
    marginBottom: 20,
  },
  opcaoOrdenacao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  opcaoSelecionada: {
    backgroundColor: '#F0F8FF',
  },
  opcaoTexto: {
    marginLeft: 12,
  },
  opcaoTextoSelecionada: {
    fontWeight: '600',
  },
  direcaoContainer: {
    marginBottom: 20,
  },
  direcaoLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  btnDirecao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  btnDirecaoSelecionada: {
    backgroundColor: '#007AFF',
  },
  btnDirecaoTexto: {
    fontSize: 14,
    marginLeft: 8,
    color: '#8E8E93',
  },
  btnDirecaoTextoSelecionada: {
    fontWeight: '600',
  },
  btnFechar: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnFecharTexto: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para edição de lista
  btnEditar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  modalScrollView: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalEditarContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    minHeight: 200,
  },
  modalEditarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  editarGrupo: {
    marginBottom: 20,
  },
  editarLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  editarInput: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 44,
  },
  editarTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  coresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  corItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  corSelecionada: {
    borderColor: '#1C1C1E',
  },
  categoriasContainer: {
    marginTop: 12,
    marginBottom: 16,
  },
  categoriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  categoriaCor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoriaNome: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  btnRemoverCategoria: {
    padding: 4,
  },
  btnAdicionarCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  btnAdicionarCategoriaTexto: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animacaoContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  animacaoOption: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  animacaoSelecionada: {
    borderWidth: 2,
  },
  animacaoText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  animacaoTextSelecionada: {
    fontWeight: '600',
  },
  modalEditarBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  modalBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  btnCancelar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnCancelarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  btnSalvar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSalvarText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para importação
  headerAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnImportar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSelecionarArquivo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  btnSelecionarArquivoText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  previewContainer: {
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  previewScroll: {
    flex: 1,
  },
  previewItem: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  previewMore: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  
  btnEditarCategoria: {
    padding: 4,
    marginRight: 4,
  },
  categoriaBotoes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Estilos para modal de opções de seleção aleatória
  opcoesContainer: {
    marginVertical: 20,
    gap: 12,
  },
  opcaoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  opcaoContent: {
    flex: 1,
  },
  opcaoTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  opcaoSubtitle: {
    lineHeight: 18,
  },
  // Estilos para seleção aleatória
  itemSelecionadoContainer: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderWidth: 2,
  },
  itemSelecionadoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemSelecionadoTitle: {
    flex: 1,
    marginLeft: 12,
    fontWeight: '600',
  },
  itemSelecionadoDescricao: {
    marginBottom: 8,
    fontStyle: 'italic',
  },
  itemSelecionadoCategoria: {
    marginTop: 8,
  },
  itemSelecionadoCategoriaText: {
    fontWeight: '500',
  },

}); 