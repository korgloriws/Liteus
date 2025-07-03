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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Lista, Item } from '../types';
import { StorageService } from '../services/storage';
import { useTheme } from '../services/ThemeContext';

export default function ListaDetalhesScreen() {
  const { isDarkMode } = useTheme();
  const [lista, setLista] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editandoItem, setEditandoItem] = useState<Item | null>(null);
  const [novoItemTexto, setNovoItemTexto] = useState('');
  const [novoItemDescricao, setNovoItemDescricao] = useState('');

  const { id: listaId } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (listaId) {
      carregarLista();
    }
  }, [listaId]);

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
        descricao: novoItemDescricao.trim() || undefined,
      });
      
      setNovoItemTexto('');
      setNovoItemDescricao('');
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
        descricao: novoItemDescricao.trim() || undefined,
      });
      
      setNovoItemTexto('');
      setNovoItemDescricao('');
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

  const abrirModalEditar = (item: Item) => {
    setEditandoItem(item);
    setNovoItemTexto(item.texto);
    setNovoItemDescricao(item.descricao || '');
    setModalVisible(true);
  };

  const abrirModalAdicionar = () => {
    setEditandoItem(null);
    setNovoItemTexto('');
    setNovoItemDescricao('');
    setModalVisible(true);
  };

  const renderItem = ({ item }: { item: Item }) => (
    <View style={[styles.itemContainer, { 
      backgroundColor: isDarkMode ? '#1C1C1E' : '#fff',
      shadowColor: isDarkMode ? '#000' : '#000',
    }]}>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemTexto, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>{item.texto}</Text>
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
          style={styles.btnExcluir}
          onPress={() => removerItem(item.id)}
        >
          <MaterialIcons name="delete" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

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

      {/* Lista de Itens */}
      <View style={styles.content}>
        <View style={styles.contentHeader}>
          <Text style={[styles.contentTitulo, { color: isDarkMode ? '#fff' : '#1c1c1e' }]}>
            Itens ({lista.itens.length})
          </Text>
          <TouchableOpacity
            style={styles.btnAdicionar}
            onPress={abrirModalAdicionar}
          >
            <MaterialIcons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={lista.itens}
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
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: isDarkMode ? '#38383A' : '#fff',
                color: isDarkMode ? '#fff' : '#1c1c1e',
                borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
              }]}
              placeholder="Texto do item"
              placeholderTextColor={isDarkMode ? '#8e8e93' : '#8e8e93'}
              value={novoItemTexto}
              onChangeText={setNovoItemTexto}
              multiline
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
}); 