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
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Lista, Item, OrdenacaoTipo, OrdenacaoDirecao } from '../types';
import { StorageService } from '../services/storage';
import { UtilsService } from '../services/utils';
import { FormattedText } from '../services/FormattedText';
import { RichTextEditor } from '../services/RichTextEditor';
import { useTheme } from '../services/ThemeContext';

export default function ListaDetalhesScreen() {
  const { isDarkMode } = useTheme();
  const [lista, setLista] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoItem, setEditandoItem] = useState<Item | null>(null);
  const [novoItemTexto, setNovoItemTexto] = useState('');
  const [novoItemDescricao, setNovoItemDescricao] = useState('');
  const [novoItemCategoria, setNovoItemCategoria] = useState<string | undefined>(undefined);
  const [modalCategoria, setModalCategoria] = useState(false);
  
  // Estados para busca, filtro e ordenação
  const [buscaTexto, setBuscaTexto] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState<string | undefined>(undefined);
  const [ordenacaoTipo, setOrdenacaoTipo] = useState<OrdenacaoTipo>('alfabetica');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<OrdenacaoDirecao>('asc');
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const { id: listaId } = useLocalSearchParams<{ id: string }>();

  useFocusEffect(
    React.useCallback(() => {
      if (listaId) {
        carregarLista();
      }
    }, [listaId])
  );

  const carregarLista = async () => {
    try {
      setLoading(true);
      const listaCarregada = await StorageService.buscarLista(listaId);
      setLista(listaCarregada);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar a lista');
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = async () => {
    if (!novoItemTexto.trim()) {
      Alert.alert('Erro', 'O texto do item é obrigatório');
      return;
    }

    try {
      await StorageService.adicionarItem(listaId, {
        texto: novoItemTexto.trim(),
        textoFormatado: editandoItem?.textoFormatado,
        descricao: novoItemDescricao.trim() || undefined,
        categoria: novoItemCategoria,
      });
      
      setNovoItemTexto('');
      setNovoItemDescricao('');
      setNovoItemCategoria(undefined);
      setModalVisible(false);
      await carregarLista();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar o item');
    }
  };

  const editarItem = async () => {
    if (!editandoItem || !novoItemTexto.trim()) {
      Alert.alert('Erro', 'O texto do item é obrigatório');
      return;
    }

    try {
      await StorageService.atualizarItem(listaId, editandoItem.id, {
        texto: novoItemTexto.trim(),
        textoFormatado: editandoItem?.textoFormatado,
        descricao: novoItemDescricao.trim() || undefined,
        categoria: novoItemCategoria,
      });
      
      setNovoItemTexto('');
      setNovoItemDescricao('');
      setNovoItemCategoria(undefined);
      setEditandoItem(null);
      setModalVisible(false);
      await carregarLista();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível editar o item');
    }
  };

  const removerItem = async (itemId: string) => {
    Alert.alert(
      'Confirmar exclusão',
      'Tem certeza que deseja excluir este item?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await StorageService.removerItem(listaId, itemId);
              await carregarLista();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível excluir o item');
            }
          },
        },
      ]
    );
  };

  const duplicarItem = async (itemId: string) => {
    try {
      await StorageService.duplicarItem(listaId, itemId);
      await carregarLista();
      Alert.alert('Sucesso', 'Item duplicado com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível duplicar o item');
    }
  };

  const alternarConcluido = async (itemId: string) => {
    try {
      const item = lista?.itens.find(i => i.id === itemId);
      if (!item) return;

      await StorageService.atualizarItem(listaId, itemId, {
        concluido: !item.concluido,
      });
      await carregarLista();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o item');
    }
  };

  const abrirModalEditar = (item: Item) => {
    setEditandoItem(item);
    setNovoItemTexto(item.texto);
    setNovoItemDescricao(item.descricao || '');
    setNovoItemCategoria(item.categoria);
    setModalVisible(true);
  };

  const abrirModalAdicionar = () => {
    setEditandoItem(null);
    setNovoItemTexto('');
    setNovoItemDescricao('');
    setNovoItemCategoria(undefined);
    setModalVisible(true);
  };


  const itensFiltrados = lista ? UtilsService.filtrarEOrdenarItens(
    lista.itens,
    {
      texto: buscaTexto,
      categoria: filtroCategoria,
    },
    {
      tipo: ordenacaoTipo,
      direcao: ordenacaoDirecao,
    }
  ) : [];

  const limparFiltros = () => {
    setBuscaTexto('');
    setFiltroCategoria(undefined);
    setOrdenacaoTipo('alfabetica');
    setOrdenacaoDirecao('asc');
  };

  const alternarOrdenacao = () => {
    setOrdenacaoDirecao(ordenacaoDirecao === 'asc' ? 'desc' : 'asc');
  };

  const exportarLista = async () => {
    if (!lista) return;

    try {
      // Criar conteúdo do arquivo
      let conteudo = `Lista: ${lista.nome}\n`;
      
      if (lista.descricao) {
        conteudo += `Descrição: ${lista.descricao}\n`;
      }
      
      conteudo += `\nItens (${lista.itens.length}):\n\n`;

      // Adicionar itens com formatação
      lista.itens.forEach((item, index) => {
        let itemTexto = '';
        
        if (item.textoFormatado && item.textoFormatado.length > 0) {
          // Usar formatação rica
          item.textoFormatado.forEach(formato => {
            if (formato.negrito) {
              itemTexto += `**${formato.texto}**`;
            } else if (formato.italico) {
              itemTexto += `*${formato.texto}*`;
            } else {
              itemTexto += formato.texto;
            }
          });
        } else {
          // Usar texto simples
          itemTexto = item.texto;
        }

        // Adicionar categoria se existir
        if (item.categoria) {
          const categoria = lista.categorias.find(cat => cat.id === item.categoria);
          if (categoria) {
            itemTexto += ` [${categoria.nome}]`;
          }
        }

        // Adicionar descrição se existir
        if (item.descricao) {
          itemTexto += ` - ${item.descricao}`;
        }

        conteudo += `${index + 1}. ${itemTexto}\n`;
      });

      // Compartilhar o arquivo
      await Share.share({
        message: conteudo,
        title: `${lista.nome}.txt`,
      });

    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar a lista');
    }
  };

  const renderItem = ({ item }: { item: Item }) => {
    const categoria = lista?.categorias?.find(cat => cat.id === item.categoria);
    
    return (
      <View style={[styles.itemContainer, { 
        backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
        shadowColor: isDarkMode ? '#000' : '#000',
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
              {categoria && (
                <View style={[styles.categoriaTag, { backgroundColor: categoria.cor || '#007AFF' }]}>
                  <Text style={styles.categoriaTagText}>{categoria.nome}</Text>
                </View>
              )}
            </View>
          </View>
          {item.descricao && (
            <Text style={[styles.itemDescricao, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>{item.descricao}</Text>
          )}
          <Text style={[styles.itemData, { color: isDarkMode ? '#c7c7cc' : '#c7c7cc' }]}>
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
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: lista.cor || '#007AFF' }]}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitulo}>{lista.nome}</Text>
          {lista.descricao && (
            <Text style={styles.headerDescricao}>{lista.descricao}</Text>
          )}
        </View>
        <View style={styles.headerAcoes}>
          <TouchableOpacity
            style={styles.btnExportar}
            onPress={exportarLista}
          >
            <MaterialIcons name="file-download" size={24} color="#fff" />
          </TouchableOpacity>
          {lista.permiteSelecaoAleatoria && (
            <TouchableOpacity
              style={styles.btnAleatorio}
              onPress={() => router.push({
                pathname: '/selecao-aleatoria',
                params: { id: lista.id }
              })}
            >
              <MaterialIcons name="casino" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Lista de Itens */}
      <View style={styles.content}>
        <View style={styles.contentHeader}>
          <Text style={[styles.contentTitulo, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
            Itens ({itensFiltrados.length}/{lista.itens.length})
          </Text>
          <View style={styles.headerAcoes}>
            <TouchableOpacity
              style={[styles.btnFiltros, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
              onPress={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <MaterialIcons 
                name={mostrarFiltros ? "filter-list" : "filter-list"} 
                size={20} 
                color={mostrarFiltros ? "#007AFF" : (isDarkMode ? "#fff" : "#1c1c1e")} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnAdicionar}
              onPress={abrirModalAdicionar}
            >
              <MaterialIcons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Busca */}
        <View style={styles.buscaContainer}>
          <View style={[styles.buscaInput, { backgroundColor: isDarkMode ? '#38383A' : '#fff' }]}>
            <MaterialIcons name="search" size={20} color={isDarkMode ? '#8e8e93' : '#8e8e93'} />
            <TextInput
              style={[styles.buscaTextInput, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}
              placeholder="Buscar itens..."
              placeholderTextColor={isDarkMode ? '#8e8e93' : '#8e8e93'}
              value={buscaTexto}
              onChangeText={setBuscaTexto}
            />
            {buscaTexto.length > 0 && (
              <TouchableOpacity onPress={() => setBuscaTexto('')}>
                <MaterialIcons name="close" size={20} color={isDarkMode ? '#8e8e93' : '#8e8e93'} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filtros e Ordenação */}
        {mostrarFiltros && (
          <View style={[styles.filtrosContainer, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            {/* Filtro por Categoria */}
            {lista?.categorias && lista.categorias.length > 0 && (
              <View style={styles.filtroGrupo}>
                <Text style={[styles.filtroLabel, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Filtrar por Categoria
                </Text>
                <View style={styles.categoriaFiltros}>
                  <TouchableOpacity
                    style={[
                      styles.categoriaFiltro,
                      { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' },
                      !filtroCategoria && styles.categoriaFiltroAtivo
                    ]}
                    onPress={() => setFiltroCategoria(undefined)}
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
                      <View style={[styles.categoriaFiltroCor, { backgroundColor: categoria.cor || '#007AFF' }]} />
                      <Text style={[styles.categoriaFiltroText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                        {categoria.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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
                {lista?.categorias && lista.categorias.length > 0 && (
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
                )}
              </View>
              
              <TouchableOpacity
                style={[styles.btnOrdenacao, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                onPress={alternarOrdenacao}
              >
                <MaterialIcons 
                  name={ordenacaoDirecao === 'asc' ? 'arrow-upward' : 'arrow-downward'} 
                  size={20} 
                  color={isDarkMode ? '#fff' : '#1c1c1e'} 
                />
              </TouchableOpacity>
            </View>

            {/* Botão Limpar Filtros */}
            {(buscaTexto || filtroCategoria || ordenacaoTipo !== 'alfabetica' || ordenacaoDirecao !== 'asc') && (
              <TouchableOpacity
                style={styles.btnLimparFiltros}
                onPress={limparFiltros}
              >
                <MaterialIcons name="clear" size={16} color="#FF3B30" />
                <Text style={styles.btnLimparFiltrosText}>Limpar Filtros</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <FlatList
          data={itensFiltrados}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          style={styles.lista}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Modal para adicionar/editar item */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            <Text style={[styles.modalTitulo, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
              {editandoItem ? 'Editar Item' : 'Adicionar Item'}
            </Text>
            
            <RichTextEditor
              value={novoItemTexto}
              textoFormatado={editandoItem?.textoFormatado}
              onChange={(texto, formato) => {
                setNovoItemTexto(texto);

              }}
              placeholder="Texto do item"
              multiline={true}
            />
            
            <TextInput
              style={[styles.input, styles.inputDescricao, { 
                backgroundColor: isDarkMode ? '#38383A' : '#fff',
                color: isDarkMode ? '#fff' : '#1c1c1e',
                borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
              }]}
              placeholder="Descrição (opcional)"
              placeholderTextColor={isDarkMode ? '#8e8e93' : '#8e8e93'}
              value={novoItemDescricao}
              onChangeText={setNovoItemDescricao}
              multiline
            />
            
            {/* Seletor de Categoria */}
            {lista?.categorias && lista.categorias.length > 0 && (
              <View style={styles.categoriaSelector}>
                <Text style={[styles.label, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                  Categoria (opcional)
                </Text>
                <View style={styles.categoriaOptions}>
                  <TouchableOpacity
                    style={[
                      styles.categoriaOption,
                      { backgroundColor: isDarkMode ? '#38383A' : '#fff', borderColor: isDarkMode ? '#5856D6' : '#e5e5ea' },
                      !novoItemCategoria && styles.categoriaOptionSelected
                    ]}
                    onPress={() => setNovoItemCategoria(undefined)}
                  >
                    <Text style={[styles.categoriaOptionText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                      Sem categoria
                    </Text>
                  </TouchableOpacity>
                  {lista.categorias.map((categoria) => (
                    <TouchableOpacity
                      key={categoria.id}
                      style={[
                        styles.categoriaOption,
                        { backgroundColor: isDarkMode ? '#38383A' : '#fff', borderColor: isDarkMode ? '#5856D6' : '#e5e5ea' },
                        novoItemCategoria === categoria.id && styles.categoriaOptionSelected
                      ]}
                      onPress={() => setNovoItemCategoria(categoria.id)}
                    >
                      <View style={[styles.categoriaColor, { backgroundColor: categoria.cor || '#007AFF' }]} />
                      <Text style={[styles.categoriaOptionText, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
                        {categoria.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            
            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={editandoItem ? editarItem : adicionarItem}
              >
                <Text style={styles.btnSalvarText}>
                  {editandoItem ? 'Salvar' : 'Adicionar'}
                </Text>
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
    backgroundColor: '#f2f2f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  btnVoltar: {
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerDescricao: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  btnExportar: {
    padding: 8,
  },
  btnAleatorio: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  contentTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1c1e',
  },
  btnAdicionar: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lista: {
    flex: 1,
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
  categoriaSelector: {
    marginBottom: 16,
  },
  categoriaOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  categoriaOptionSelected: {
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

  headerAcoes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnFiltros: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buscaContainer: {
    marginBottom: 16,
  },
  buscaInput: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
}); 