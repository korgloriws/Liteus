import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Lista, Item } from '../types';
import { StorageService } from '../services/storage';
import { FormattedText } from '../services/FormattedText';
import { useTheme } from '../services/ThemeContext';

export default function SelecaoAleatoriaScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lista, setLista] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecionando, setSelecionando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const [mostrarResultado, setMostrarResultado] = useState(false);
  const [modalSelecaoAleatoria, setModalSelecaoAleatoria] = useState(false);
  const [animandoSelecao, setAnimandoSelecao] = useState(false);

  useEffect(() => {
    if (id) {
      carregarLista();
    }
  }, [id]);

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

  const selecionarItemAleatorio = () => {
    if (!lista || lista.itens.length === 0) {
      Alert.alert('Erro', 'A lista não possui itens para selecionar');
      return;
    }

    setSelecionando(true);
    setMostrarResultado(false);
    setItemSelecionado(null);
    setAnimandoSelecao(true);
    setModalSelecaoAleatoria(true);

    // Simular animação de seleção
    let contador = 0;
    const maxIteracoes = 20;
    const intervalo = setInterval(() => {
      const itemAleatorio = lista.itens[Math.floor(Math.random() * lista.itens.length)];
      setItemSelecionado(itemAleatorio);
      contador++;

      if (contador >= maxIteracoes) {
        clearInterval(intervalo);
        setAnimandoSelecao(false);
    setSelecionando(false);
    setMostrarResultado(true);
      }
    }, 100);
  };

  const reiniciarSelecao = () => {
    setItemSelecionado(null);
    setMostrarResultado(false);
    setModalSelecaoAleatoria(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.titleLarge]}>
            Seleção Aleatória
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }, typography.body]}>
            Carregando...
          </Text>
        </View>
      </View>
    );
  }

  if (!lista) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, typography.titleLarge]}>
            Seleção Aleatória
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }, typography.body]}>
            Lista não encontrada
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, typography.titleLarge]}>
          Seleção Aleatória
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={[styles.infoContainer, { backgroundColor: colors.surface }]}>
          <MaterialIcons name="casino" size={48} color={colors.primary} />
          <Text style={[styles.infoTitle, { color: colors.text }, typography.titleLarge]}>
            {lista.nome}
              </Text>
          <Text style={[styles.infoSubtitle, { color: colors.textSecondary }, typography.body]}>
            {lista.itens.length} itens disponíveis
              </Text>
            </View>

              <TouchableOpacity
          style={[styles.btnSelecionar, { backgroundColor: colors.primary }]}
                onPress={selecionarItemAleatorio}
                disabled={selecionando}
              >
          <MaterialIcons 
            name="casino" 
            size={24} 
            color="#fff" 
          />
          <Text style={[styles.btnSelecionarText, typography.body]}>
            {selecionando ? 'Selecionando...' : 'Selecionar Item'}
          </Text>
              </TouchableOpacity>

        {mostrarResultado && itemSelecionado && (
          <View style={[styles.resultadoContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.resultadoTitle, { color: colors.text }, typography.titleMedium]}>
              Item Selecionado!
            </Text>
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

              <TouchableOpacity
              style={[styles.btnNovaSelecao, { backgroundColor: colors.primary }]}
                onPress={reiniciarSelecao}
              >
              <Text style={[styles.btnNovaSelecaoText, typography.body]}>
                Nova Seleção
              </Text>
              </TouchableOpacity>
          </View>
        )}
      </View>

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
                  onPress={selecionarItemAleatorio}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
  },
  infoContainer: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
  },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  infoSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  btnSelecionar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  btnSelecionarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  resultadoContainer: {
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resultadoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
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
  btnNovaSelecao: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  btnNovaSelecaoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  btnCancelar: {
    flex: 1,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  btnCancelarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  btnCopiar: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  btnCopiarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 