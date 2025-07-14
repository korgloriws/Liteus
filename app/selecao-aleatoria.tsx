import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Lista, Item } from '../types';
import { StorageService } from '../services/storage';
import { FormattedText } from '../services/FormattedText';
import { useTheme } from '../services/ThemeContext';

const { width, height } = Dimensions.get('window');

export default function SelecaoAleatoriaScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [lista, setLista] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecionando, setSelecionando] = useState(false);
  const [itemSelecionado, setItemSelecionado] = useState<Item | null>(null);
  const [mostrarResultado, setMostrarResultado] = useState(false);
  
  // Animações
  const spinValue = useRef(new Animated.Value(0)).current;
  const scaleValue = useRef(new Animated.Value(1)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const translateYValue = useRef(new Animated.Value(0)).current;
  const translateXValue = useRef(new Animated.Value(0)).current;
  const rotationValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const waveValue = useRef(new Animated.Value(0)).current;

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


    spinValue.setValue(0);
    scaleValue.setValue(1);
    opacityValue.setValue(1);


    const tipoAnimacao = lista.tipoAnimacao || 'roleta';
    
    switch (tipoAnimacao) {
      case 'roleta':
        animacaoRoleta();
        break;
      case 'cubo':
        animacaoCubo();
        break;
      case 'confete':
        animacaoConfete();
        break;
      case 'ondas':
        animacaoOndas();
        break;
      case 'particulas':
        animacaoParticulas();
        break;
      case 'espiral':
        animacaoEspiral();
        break;
      case 'pulsar':
        animacaoPulsar();
        break;
      case 'deslizar':
        animacaoDeslizar();
        break;
      default:
        animacaoRoleta();
    }
  };

  const animacaoRoleta = () => {

    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    );

    spinAnimation.start();


    setTimeout(() => {
      spinAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const animacaoCubo = () => {
    // Animação de escala e opacidade
    const cubeAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    cubeAnimation.start();


    setTimeout(() => {
      cubeAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const animacaoConfete = () => {
    // Animação de confete com movimento vertical e rotação
    const confeteAnimation = Animated.loop(
      Animated.parallel([
        Animated.timing(translateYValue, {
          toValue: -50,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(scaleValue, {
          toValue: 1.3,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    confeteAnimation.start();

    setTimeout(() => {
      confeteAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const animacaoOndas = () => {
    // Animação de ondas com escala e opacidade
    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 1.4,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(scaleValue, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    waveAnimation.start();

    setTimeout(() => {
      waveAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const animacaoParticulas = () => {
    // Animação de partículas com movimento horizontal e vertical
    const particleAnimation = Animated.loop(
      Animated.parallel([
        Animated.timing(translateXValue, {
          toValue: 30,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(translateYValue, {
          toValue: -30,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(rotationValue, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ])
    );

    particleAnimation.start();

    setTimeout(() => {
      particleAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const animacaoEspiral = () => {
    // Animação espiral com rotação e escala
    const spiralAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(rotationValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1.5,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(rotationValue, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 0.7,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    spiralAnimation.start();

    setTimeout(() => {
      spiralAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const animacaoPulsar = () => {
    // Animação pulsar com escala e opacidade
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseValue, {
            toValue: 1.6,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 0.2,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseValue, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseAnimation.start();

    setTimeout(() => {
      pulseAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const animacaoDeslizar = () => {
    // Animação de deslizar com movimento horizontal
    const slideAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateXValue, {
          toValue: 100,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateXValue, {
          toValue: -100,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(translateXValue, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );

    slideAnimation.start();

    setTimeout(() => {
      slideAnimation.stop();
      finalizarSelecao();
    }, 3000);
  };

  const finalizarSelecao = () => {
    if (!lista) return;

 
    const indiceAleatorio = Math.floor(Math.random() * lista.itens.length);
    const item = lista.itens[indiceAleatorio];
    
    setItemSelecionado(item);
    setSelecionando(false);
    setMostrarResultado(true);


    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const reiniciarSelecao = () => {
    setMostrarResultado(false);
    setItemSelecionado(null);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (!lista) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Lista não encontrada</Text>
      </View>
    );
  }

  if (lista.itens.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <MaterialIcons name="casino" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>Lista vazia</Text>
          <Text style={styles.emptySubtitle}>
            Adicione itens à lista para usar a seleção aleatória
          </Text>
          <TouchableOpacity
            style={styles.btnVoltarEmpty}
            onPress={() => router.back()}
          >
            <Text style={styles.btnVoltarText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: lista.cor || '#007AFF' }]}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitulo}>Seleção Aleatória</Text>
          <Text style={styles.headerSubtitle}>{lista.nome}</Text>
        </View>
      </View>

      {/* Conteúdo Principal */}
      <View style={styles.content}>
        {!mostrarResultado ? (
          // Tela de seleção
          <View style={styles.selectionContainer}>
            <View style={styles.selectionInfo}>
              <MaterialIcons name="casino" size={80} color="#007AFF" />
              <Text style={[styles.selectionTitle, { color: colors.text }, typography.titleLarge]}>
                {selecionando ? 'Selecionando...' : 'Seleção Aleatória'}
              </Text>
              <Text style={[styles.selectionSubtitle, { color: isDarkMode ? '#8e8e93' : '#8e8e93' }]}>
                {selecionando 
                  ? 'Aguarde enquanto selecionamos um item...'
                  : `Clique no botão para selecionar um item aleatório da lista "${lista.nome}"`
                }
              </Text>
              <Text style={[styles.itemCount, { color: isDarkMode ? '#007AFF' : '#007AFF' }]}>
                {lista.itens.length} {lista.itens.length === 1 ? 'item' : 'itens'} disponível{lista.itens.length === 1 ? '' : 's'}
              </Text>
            </View>

            {!selecionando && (
              <TouchableOpacity
                style={[styles.btnSelecionar, { backgroundColor: lista.cor || '#007AFF' }]}
                onPress={selecionarItemAleatorio}
                disabled={selecionando}
              >
                <MaterialIcons name="casino" size={32} color="#fff" />
                <Text style={styles.btnSelecionarText}>Selecionar Item</Text>
              </TouchableOpacity>
            )}

            {selecionando && (
              <View style={styles.animationContainer}>
                <Animated.View
                  style={[
                    styles.animationElement,
                    {
                      transform: [
                        {
                          rotate: spinValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                        {
                          rotate: rotationValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                        { scale: scaleValue },
                        { scale: pulseValue },
                        { translateX: translateXValue },
                        { translateY: translateYValue },
                      ],
                      opacity: opacityValue,
                    },
                  ]}
                >
                  <MaterialIcons name="casino" size={64} color="#007AFF" />
                </Animated.View>
              </View>
            )}
          </View>
        ) : (
          // Tela de resultado
          <View style={styles.resultContainer}>
            <Animated.View
              style={[
                styles.resultCard,
                {
                  transform: [{ scale: scaleValue }],
                  backgroundColor: lista.cor || '#007AFF',
                },
              ]}
            >
              <MaterialIcons name="star" size={48} color="#fff" />
              <Text style={styles.resultTitle}>Item Selecionado!</Text>
              <FormattedText 
                texto={itemSelecionado?.texto || ''}
                textoFormatado={itemSelecionado?.textoFormatado}
                style={styles.resultItem}
                isDarkMode={false}
              />
              {itemSelecionado?.descricao && (
                <Text style={styles.resultDescription}>
                  {itemSelecionado.descricao}
                </Text>
              )}
            </Animated.View>

            <View style={styles.resultActions}>
              <TouchableOpacity
                style={[styles.btnNovaSelecao, { borderColor: isDarkMode ? '#007AFF' : '#007AFF' }]}
                onPress={reiniciarSelecao}
              >
                <MaterialIcons name="refresh" size={24} color="#007AFF" />
                <Text style={[styles.btnNovaSelecaoText, { color: isDarkMode ? '#007AFF' : '#007AFF' }]}>Nova Seleção</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnVoltarLista, { borderColor: isDarkMode ? '#38383A' : '#e5e5ea' }]}
                onPress={() => router.back()}
              >
                <MaterialIcons name="list" size={24} color="#8E8E93" />
                <Text style={[styles.btnVoltarListaText, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>Voltar à Lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
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
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  selectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectionInfo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  selectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginTop: 16,
    marginBottom: 8,
  },
  selectionSubtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  itemCount: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  btnSelecionar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  btnSelecionarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  animationContainer: {
    marginTop: 40,
  },
  animationElement: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  resultItem: {
    fontSize: 18,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    textAlign: 'center',
  },
  resultActions: {
    flexDirection: 'row',
    gap: 16,
  },
  btnNovaSelecao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#007AFF',
    gap: 8,
  },
  btnNovaSelecaoText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  btnVoltarLista: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    gap: 8,
  },
  btnVoltarListaText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 18,
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    fontSize: 18,
    color: '#FF3B30',
    textAlign: 'center',
    marginTop: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1c1e',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8e8e93',
    textAlign: 'center',
    marginBottom: 32,
  },
  btnVoltarEmpty: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  btnVoltarText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
  },
}); 