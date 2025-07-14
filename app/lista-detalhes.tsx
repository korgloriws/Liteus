import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Lista, Item, OrdenacaoTipo, OrdenacaoDirecao, FormatoTexto } from '../types';
import { StorageService } from '../services/storage';
import { UtilsService } from '../services/utils';
import { FormattedText } from '../services/FormattedText';
import { RichTextEditor } from '../services/RichTextEditor';
import { SyncService } from '../services/syncService';
import { useTheme } from '../services/ThemeContext';

export default function ListaDetalhesScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lista, setLista] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalAdicionar, setModalAdicionar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [itemEditando, setItemEditando] = useState<Item | null>(null);
  const [novoTexto, setNovoTexto] = useState('');
  const [novoTextoFormatado, setNovoTextoFormatado] = useState<FormatoTexto[]>([]);
  const [novaDescricao, setNovaDescricao] = useState('');
  const [novaCategoria, setNovaCategoria] = useState('');
  const [textoBusca, setTextoBusca] = useState('');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroCategoria, setFiltroCategoria] = useState<string>('');
  const [ordenacaoTipo, setOrdenacaoTipo] = useState<OrdenacaoTipo>('alfabetica');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<OrdenacaoDirecao>('asc');
  const [modalSelecaoAleatoria, setModalSelecaoAleatoria] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const [animandoSelecao, setAnimandoSelecao] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      carregarLista();
    }, [id])
  );

  const carregarLista = async () => {
    try {
      setLoading(true);
      const listaCarregada = await StorageService.buscarLista(id);
      setLista(listaCarregada);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a lista');
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = async () => {
    if (!novoTexto.trim()) {
      Alert.alert('Erro', 'O texto do item é obrigatório');
      return;
    }

    try {
      await StorageService.adicionarItem(id, {
        texto: novoTexto.trim(),
        textoFormatado: novoTextoFormatado,
        descricao: novaDescricao.trim() || undefined,
        categoria: novaCategoria || undefined,
      });

      setNovoTexto('');
      setNovoTextoFormatado([]);
      setNovaDescricao('');
      setNovaCategoria('');
      setModalAdicionar(false);
      await carregarLista();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  const editarItem = async () => {
    if (!itemEditando || !novoTexto.trim()) {
      Alert.alert('Erro', 'O texto do item é obrigatório');
      return;
    }

          try {
        await StorageService.atualizarItem(id, itemEditando.id, {
          texto: novoTexto.trim(),
          textoFormatado: novoTextoFormatado,
          descricao: novaDescricao.trim() || undefined,
          categoria: novaCategoria || undefined,
        });

      setNovoTexto('');
      setNovoTextoFormatado([]);
      setNovaDescricao('');
      setNovaCategoria('');
      setItemEditando(null);
      setModalEditar(false);
      await carregarLista();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível editar o item');
    }
  };

  const removerItem = async (itemId: string) => {
    Alert.alert(
      'Remover Item',
      'Tem certeza que deseja remover este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removerItem(id, itemId);
              await carregarLista();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível remover o item');
            }
          },
        },
      ]
    );
  };

  const duplicarItem = async (itemId: string) => {
    try {
      const item = lista?.itens.find(i => i.id === itemId);
      if (item) {
        await StorageService.adicionarItem(id, {
          texto: item.texto,
          textoFormatado: item.textoFormatado,
          descricao: item.descricao,
          categoria: item.categoria,
        });
        await carregarLista();
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível duplicar o item');
    }
  };

  const alternarConcluido = async (itemId: string) => {
          try {
        const item = lista?.itens.find(i => i.id === itemId);
        if (item) {
          await StorageService.atualizarItem(id, itemId, {
            ...item,
            concluido: !item.concluido,
          });
          await carregarLista();
        }
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível alterar o status do item');
      }
  };

  const abrirModalEditar = (item: Item) => {
    setItemEditando(item);
    setNovoTexto(item.texto);
    setNovoTextoFormatado(item.textoFormatado || []);
    setNovaDescricao(item.descricao || '');
    setNovaCategoria(item.categoria || '');
    setModalEditar(true);
  };

  const abrirModalAdicionar = () => {
    setNovoTexto('');
    setNovoTextoFormatado([]);
    setNovaDescricao('');
    setNovaCategoria('');
    setModalAdicionar(true);
  };

  const limparFiltros = () => {
    setTextoBusca('');
    setFiltroCategoria('');
    setOrdenacaoTipo('alfabetica');
    setOrdenacaoDirecao('asc');
  };

  const alternarOrdenacao = () => {
    setOrdenacaoDirecao(ordenacaoDirecao === 'asc' ? 'desc' : 'asc');
  };

  const selecionarAleatoriamente = () => {
    if (!lista || lista.itens.length === 0) {
      Alert.alert('Aviso', 'Não há itens na lista para selecionar');
      return;
    }

    // Filtrar itens baseado nos filtros ativos
    let itensFiltrados = lista.itens;
    
    if (textoBusca) {
      itensFiltrados = itensFiltrados.filter(item => 
        item.texto.toLowerCase().includes(textoBusca.toLowerCase())
      );
    }
    
    if (filtroCategoria) {
      itensFiltrados = itensFiltrados.filter(item => 
        item.categoria === filtroCategoria
      );
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

  const exportarLista = async () => {
    if (!lista) return;

    try {
      // Usar o novo sistema de sincronização
      const dadosJson = await SyncService.exportarLista(lista.id);
      
      // Criar nome do arquivo
      const nomeArquivo = `${lista.nome.replace(/[^a-zA-Z0-9]/g, '_')}.json`;
      
      // Criar caminho do arquivo temporário
      const fileUri = `${FileSystem.documentDirectory}${nomeArquivo}`;
      
      // Escrever o arquivo
      await FileSystem.writeAsStringAsync(fileUri, dadosJson, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Verificar se o compartilhamento está disponível
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Compartilhar o arquivo
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: `Exportar ${lista.nome}`,
          UTI: 'public.json',
        });
      } else {
        // Fallback para mostrar dados
        Alert.alert(
          'Dados para Exportação',
          'Copie os dados abaixo e salve em um arquivo .json:',
          [{ text: 'OK' }]
        );
        console.log('Dados para exportação:', dadosJson);
      }

    } catch (error) {
      console.error('Erro na exportação:', error);
      Alert.alert('Erro', 'Não foi possível exportar a lista');
    }
  };

  const exportarParaGoogleDocs = async () => {
    if (!lista) return;

    try {
      const template = SyncService.gerarTemplateGoogleDocs(lista);
      
      // Criar nome do arquivo
      const nomeArquivo = `${lista.nome.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
      
      // Criar caminho do arquivo temporário
      const fileUri = `${FileSystem.documentDirectory}${nomeArquivo}`;
      
      // Escrever o arquivo
      await FileSystem.writeAsStringAsync(fileUri, template, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Verificar se o compartilhamento está disponível
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Compartilhar o arquivo
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: `Exportar ${lista.nome} para Google Docs`,
          UTI: 'public.plain-text',
        });
      } else {
        // Fallback para mostrar dados
        Alert.alert(
          'Template para Google Docs',
          'Copie o conteúdo abaixo e cole no Google Docs:',
          [{ text: 'OK' }]
        );
        console.log('Template para Google Docs:', template);
      }

    } catch (error) {
      console.error('Erro na exportação:', error);
      Alert.alert('Erro', 'Não foi possível exportar a lista');
    }
  };

  // Filtrar e ordenar itens
  const itensFiltrados = lista ? UtilsService.buscarItens(lista.itens, {
    texto: textoBusca,
    categoria: filtroCategoria,
  }) : [];

  const itensOrdenados = UtilsService.ordenarItens(itensFiltrados, ordenacaoTipo, ordenacaoDirecao);

  const renderItem = ({ item }: { item: Item }) => {
    const categoriasSelecionadas = item.categorias 
      ? lista?.categorias?.filter(cat => item.categorias?.includes(cat.id)) || []
      : item.categoria 
        ? lista?.categorias?.filter(cat => cat.id === item.categoria) || []
        : [];
    
    return (
      <View style={[styles.itemContainer, { 
        backgroundColor: colors.surface,
        shadowColor: colors.text,
        opacity: item.concluido ? 0.6 : 1,
      }]}>
        <View style={styles.itemInfo}>
          <View style={styles.itemHeader}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => alternarConcluido(item.id)}
            >
              <MaterialIcons 
                name={item.concluido ? "check-box" : "check-box-outline-blank"} 
                size={24} 
                color={item.concluido ? "#34C759" : (isDarkMode ? "#8e8e93" : "#8e8e93")} 
              />
            </TouchableOpacity>
            
            <View style={styles.itemTextContainer}>
              <FormattedText 
                texto={item.texto}
                textoFormatado={item.textoFormatado}
                style={styles.itemTexto}
                isDarkMode={isDarkMode}
              />
              {categoriasSelecionadas.length > 0 && (
                <View style={styles.categoriasContainer}>
                  {categoriasSelecionadas.map((categoria) => (
                    <View key={categoria.id} style={[styles.categoriaTag, { backgroundColor: categoria.cor || '#007AFF' }]}>
                      <Text style={styles.categoriaTagText}>{categoria.nome}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          {item.descricao && (
            <Text style={[styles.itemDescricao, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>{item.descricao}</Text>
          )}
          <Text style={[styles.itemData, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
            Criado em: {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.itemAcoes}>
          <TouchableOpacity
            style={styles.btnEditar}
            onPress={() => abrirModalEditar(item)}
          >
            <MaterialIcons name="edit" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnDuplicar}
            onPress={() => duplicarItem(item.id)}
          >
            <MaterialIcons name="content-copy" size={20} color="#34C759" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnExcluir}
            onPress={() => removerItem(item.id)}
          >
            <MaterialIcons name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  if (!lista) {
    return (
      <View style={styles.container}>
        <Text>Lista não encontrada</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: lista.cor || '#007AFF' }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{lista.nome}</Text>
          {lista.descricao && (
            <Text style={styles.headerSubtitle}>{lista.descricao}</Text>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.btnExportar}
            onPress={selecionarAleatoriamente}
          >
            <MaterialIcons name="casino" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnExportar}
            onPress={exportarLista}
          >
            <MaterialIcons name="file-download" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnExportar}
            onPress={exportarParaGoogleDocs}
          >
            <MaterialIcons name="cloud-upload" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        {/* Estatísticas */}
        <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
              {lista.itens.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
              Total
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
              {lista.itens.filter(item => item.concluido).length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
              Concluídos
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }, typography.titleMedium]}>
              {lista.categorias.length}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }, typography.caption]}>
              Categorias
            </Text>
          </View>
        </View>

        {/* Barra de Busca */}
        <View style={[styles.buscaContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.buscaInput}>
            <MaterialIcons name="search" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.buscaTextInput, { color: colors.text }, typography.body]}
              placeholder="Buscar itens..."
              placeholderTextColor={colors.textSecondary}
              value={textoBusca}
              onChangeText={setTextoBusca}
            />
            {textoBusca.length > 0 && (
              <TouchableOpacity onPress={() => setTextoBusca('')}>
                <MaterialIcons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.btnFiltros, { backgroundColor: colors.accent }]}
            onPress={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <MaterialIcons 
              name="tune" 
              size={20} 
              color={mostrarFiltros ? colors.primary : colors.text} 
            />
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        {mostrarFiltros && (
          <View style={[styles.filtrosContainer, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            {/* Filtro por Categoria */}
            <View style={styles.filtroGrupo}>
              <Text style={[styles.filtroLabel, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                Filtrar por categoria
              </Text>
              <View style={styles.categoriasFiltro}>
                <TouchableOpacity
                  style={[
                    styles.categoriaFiltro,
                    { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                    filtroCategoria === '' && styles.categoriaFiltroAtivo
                  ]}
                  onPress={() => setFiltroCategoria('')}
                >
                  <Text style={[styles.categoriaFiltroText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                    Todas
                  </Text>
                </TouchableOpacity>
                {lista.categorias.map((categoria) => (
                  <TouchableOpacity
                    key={categoria.id}
                    style={[
                      styles.categoriaFiltro,
                      { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                      filtroCategoria === categoria.id && styles.categoriaFiltroAtivo
                    ]}
                    onPress={() => setFiltroCategoria(categoria.id)}
                  >
                    <Text style={[styles.categoriaFiltroText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                      {categoria.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Ordenação */}
            <View style={styles.filtroGrupo}>
              <Text style={[styles.filtroLabel, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                Ordenar por
              </Text>
              <View style={styles.ordenacaoContainer}>
                <TouchableOpacity
                  style={[
                    styles.ordenacaoOption,
                    { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                    ordenacaoTipo === 'alfabetica' && styles.ordenacaoOptionAtivo
                  ]}
                  onPress={() => setOrdenacaoTipo('alfabetica')}
                >
                  <Text style={[styles.ordenacaoOptionText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                    Alfabética
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.ordenacaoOption,
                    { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                    ordenacaoTipo === 'data' && styles.ordenacaoOptionAtivo
                  ]}
                  onPress={() => setOrdenacaoTipo('data')}
                >
                  <Text style={[styles.ordenacaoOptionText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                    Data
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.ordenacaoOption,
                    { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                    ordenacaoTipo === 'categoria' && styles.ordenacaoOptionAtivo
                  ]}
                  onPress={() => setOrdenacaoTipo('categoria')}
                >
                  <Text style={[styles.ordenacaoOptionText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                    Categoria
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.btnOrdenacao, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                onPress={alternarOrdenacao}
              >
                <MaterialIcons 
                  name={ordenacaoDirecao === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                  size={16} 
                  color={isDarkMode ? '#fff' : '#1c1c1e'}
                />
              </TouchableOpacity>
            </View>

            {/* Limpar Filtros */}
            <TouchableOpacity
              style={[styles.btnLimparFiltros, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
              onPress={limparFiltros}
            >
              <Text style={[styles.btnLimparFiltrosText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                Limpar Filtros
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de Itens */}
        <FlatList
          data={itensOrdenados}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listaContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={48} color={isDarkMode ? '#8e8e93' : '#8e8e93'} />
              <Text style={[styles.emptyText, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                {textoBusca || filtroCategoria ? 'Nenhum item encontrado' : 'Nenhum item na lista'}
              </Text>
            </View>
          }
        />

        {/* Botão Adicionar */}
        <TouchableOpacity
          style={[styles.btnAdicionar, { backgroundColor: lista.cor || '#007AFF' }]}
          onPress={abrirModalAdicionar}
        >
          <MaterialIcons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Modal Adicionar Item */}
      <Modal
        visible={modalAdicionar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalAdicionar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitulo, { color: colors.text }, typography.titleMedium]}>
              Adicionar Item
            </Text>

            <Text style={[styles.label, { color: colors.text }, typography.subtitleBold]}>
              Texto do Item *
            </Text>
            <RichTextEditor
              value={novoTexto}
              textoFormatado={novoTextoFormatado}
              onChange={(texto, formato) => {
                setNovoTexto(texto);
                setNovoTextoFormatado(formato || []);
              }}
              placeholder="Digite o texto do item..."
              multiline={true}
            />

            <Text style={[styles.label, { color: colors.text }, typography.subtitleBold]}>
              Descrição (opcional)
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.accent, 
                color: colors.text,
                borderColor: colors.border
              }]}
              value={novaDescricao}
              onChangeText={setNovaDescricao}
              placeholder="Descrição do item..."
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }, typography.subtitleBold]}>
              Categoria (opcional)
            </Text>
            <View style={styles.categoriaContainer}>
              <TouchableOpacity
                style={[
                  styles.categoriaOption,
                  { backgroundColor: colors.accent, borderColor: colors.border },
                  novaCategoria === '' && styles.categoriaOptionSelecionada
                ]}
                onPress={() => setNovaCategoria('')}
              >
                <Text style={[styles.categoriaOptionText, { color: colors.text }, typography.body]}>
                  Sem categoria
                </Text>
              </TouchableOpacity>
              {lista.categorias.map((categoria) => (
                <TouchableOpacity
                  key={categoria.id}
                  style={[
                    styles.categoriaOption,
                    { backgroundColor: colors.accent, borderColor: colors.border },
                    novaCategoria === categoria.id && styles.categoriaOptionSelecionada
                  ]}
                  onPress={() => setNovaCategoria(categoria.id)}
                >
                  <Text style={[styles.categoriaOptionText, { color: colors.text }, typography.body]}>
                    {categoria.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalAdicionar(false)}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={adicionarItem}
              >
                <Text style={styles.btnSalvarText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Editar Item */}
      <Modal
        visible={modalEditar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalEditar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitulo, { color: colors.text }, typography.titleMedium]}>
              Editar Item
            </Text>

            <Text style={[styles.label, { color: colors.text }, typography.subtitleBold]}>
              Texto do Item *
            </Text>
            <RichTextEditor
              value={novoTexto}
              textoFormatado={novoTextoFormatado}
              onChange={(texto, formato) => {
                setNovoTexto(texto);
                setNovoTextoFormatado(formato || []);
              }}
              placeholder="Digite o texto do item..."
              multiline={true}
            />

            <Text style={[styles.label, { color: colors.text }, typography.subtitleBold]}>
              Descrição (opcional)
            </Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.accent, 
                color: colors.text,
                borderColor: colors.border
              }]}
              value={novaDescricao}
              onChangeText={setNovaDescricao}
              placeholder="Descrição do item..."
              placeholderTextColor={colors.textSecondary}
            />

            <Text style={[styles.label, { color: colors.text }, typography.subtitleBold]}>
              Categoria (opcional)
            </Text>
            <View style={styles.categoriaContainer}>
              <TouchableOpacity
                style={[
                  styles.categoriaOption,
                  { backgroundColor: colors.accent, borderColor: colors.border },
                  novaCategoria === '' && styles.categoriaOptionSelecionada
                ]}
                onPress={() => setNovaCategoria('')}
              >
                <Text style={[styles.categoriaOptionText, { color: colors.text }, typography.body]}>
                  Sem categoria
                </Text>
              </TouchableOpacity>
              {lista.categorias.map((categoria) => (
                <TouchableOpacity
                  key={categoria.id}
                  style={[
                    styles.categoriaOption,
                    { backgroundColor: colors.accent, borderColor: colors.border },
                    novaCategoria === categoria.id && styles.categoriaOptionSelecionada
                  ]}
                  onPress={() => setNovaCategoria(categoria.id)}
                >
                  <Text style={[styles.categoriaOptionText, { color: colors.text }, typography.body]}>
                    {categoria.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalEditar(false)}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={editarItem}
              >
                <Text style={styles.btnSalvarText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Seleção Aleatória */}
      <Modal
        visible={modalSelecaoAleatoria}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalSelecaoAleatoria(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }, typography.titleLarge]}>
              {animandoSelecao ? 'Selecionando...' : 'Item Selecionado!'}
            </Text>
            
            {itemSelecionado && (
              <View style={[styles.itemSelecionadoContainer, { backgroundColor: colors.accent }]}>
                <View style={styles.itemSelecionadoHeader}>
                  <MaterialIcons 
                    name="casino" 
                    size={32} 
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
                
                {itemSelecionado.categoria && (
                  <View style={styles.itemSelecionadoCategoria}>
                    <Text style={[styles.itemSelecionadoCategoriaText, { color: colors.textSecondary }, typography.caption]}>
                      Categoria: {itemSelecionado.categoria}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalSelecaoAleatoria(false)}
              >
                <Text style={styles.btnCancelarText}>Fechar</Text>
              </TouchableOpacity>
              
              {!animandoSelecao && (
                <TouchableOpacity
                  style={styles.btnCopiar}
                  onPress={selecionarAleatoriamente}
                >
                  <Text style={styles.btnCopiarText}>Nova Seleção</Text>
                </TouchableOpacity>
              )}
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
    backgroundColor: '#f2f2f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerButton: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnExportar: {
    padding: 8,
  },
  btnAdicionar: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 10,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  lista: {
    flex: 1,
  },
  listaContainer: {
    paddingBottom: 80, // Adiciona padding para o botão de adicionar
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTexto: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 4,
  },
  itemTextoConcluido: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  itemDescricao: {
    fontSize: 14,
    color: '#8e8e93',
    marginBottom: 4,
  },
  itemData: {
    fontSize: 12,
    color: '#c7c7cc',
  },
  itemAcoes: {
    flexDirection: 'row',
    gap: 8,
  },
  btnEditar: {
    padding: 8,
  },
  btnDuplicar: {
    padding: 8,
  },
  btnExcluir: {
    padding: 8,
  },
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
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 44,
  },
  inputDescricao: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    minHeight: 44,
  },
  modalBotoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnCancelar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    alignItems: 'center',
  },
  btnCancelarText: {
    color: '#8e8e93',
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnCopiar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  btnCopiarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSalvar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  btnSalvarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para categorias
  categoriaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  categoriaOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44,
  },
  categoriaOptionSelecionada: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  categoriaOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriaColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoriaTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoriaTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  buscaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buscaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  buscaTextInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  filtrosContainer: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  filtroGrupo: {
    marginBottom: 16,
  },
  filtroLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoriaFiltros: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoriasFiltro: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  btnFiltros: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriaFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  categoriaFiltroAtivo: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  categoriaFiltroText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriaFiltroCor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  ordenacaoContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  ordenacaoOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  ordenacaoOptionAtivo: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  ordenacaoOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  btnOrdenacao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnLimparFiltros: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  btnLimparFiltrosText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    marginTop: 10,
    textAlign: 'center',
  },
  categoriasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  // Estilos para seleção aleatória
  itemSelecionadoContainer: {
    padding: 20,
    borderRadius: 12,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
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