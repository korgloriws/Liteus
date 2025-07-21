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
import { Lista, OrdenacaoTipo, OrdenacaoDirecao } from '../types';
import { StorageService } from '../services/storage';
import { UtilsService } from '../services/utils';
import { DocumentProcessor } from '../services/documentProcessor';
import { useTheme } from '../services/ThemeContext';
import { SyncService } from '../services/syncService';
import { getPlaceholderColor } from '../services/theme';

export default function ListasScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const [listas, setListas] = useState<Lista[]>([]);
  const [listasFiltradas, setListasFiltradas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [textoBusca, setTextoBusca] = useState('');
  const [ordenacaoTipo, setOrdenacaoTipo] = useState<OrdenacaoTipo>('alfabetica');
  const [ordenacaoDirecao, setOrdenacaoDirecao] = useState<OrdenacaoDirecao>('asc');
  const [modalOrdenacao, setModalOrdenacao] = useState(false);
  

  const [modalEditarLista, setModalEditarLista] = useState(false);
  const [listaEditando, setListaEditando] = useState<Lista | null>(null);
  const [editandoNome, setEditandoNome] = useState('');
  const [editandoDescricao, setEditandoDescricao] = useState('');
  const [editandoCor, setEditandoCor] = useState('#007AFF');
  const [editandoPermiteSelecaoAleatoria, setEditandoPermiteSelecaoAleatoria] = useState(true);

  const [editandoCategorias, setEditandoCategorias] = useState<any[]>([]);
  const [modalCategoria, setModalCategoria] = useState(false);
  const [novaCategoriaNome, setNovaCategoriaNome] = useState('');
  const [novaCategoriaCor, setNovaCategoriaCor] = useState('#007AFF');
  

  const [modalImportacao, setModalImportacao] = useState(false);
  const [arquivoImportado, setArquivoImportado] = useState<any>(null);
  const [itensImportados, setItensImportados] = useState<Array<string | {
    texto: string;
    descricao?: string;
    categoria?: string;
    categorias?: string[];
    tags?: string[];
    prioridade?: number;
    data?: string;
    concluido?: boolean;
    textoFormatado?: any[];
  }>>([]);
  const [nomeListaImportada, setNomeListaImportada] = useState('');
  const [descricaoListaImportada, setDescricaoListaImportada] = useState('');
  const [corListaImportada, setCorListaImportada] = useState('#007AFF');

  useFocusEffect(
    React.useCallback(() => {
    carregarListas();
    }, [])
  );

  const carregarListas = async () => {
    try {
      setLoading(true);
      const listasCarregadas = await StorageService.carregarListas();
      setListas(listasCarregadas);
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


  const abrirModalEditar = (lista: Lista) => {
    setListaEditando(lista);
    setEditandoNome(lista.nome);
    setEditandoDescricao(lista.descricao || '');
    setEditandoCor(lista.cor || '#007AFF');
    setEditandoPermiteSelecaoAleatoria(lista.permiteSelecaoAleatoria || false);
    setEditandoCategorias(lista.categorias || []);
    setModalEditarLista(true);
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
        cor: editandoCor,
        permiteSelecaoAleatoria: editandoPermiteSelecaoAleatoria,
        categorias: editandoCategorias,
      });

      setModalEditarLista(false);
      setListaEditando(null);
      await carregarListas();
      Alert.alert('Sucesso', 'Lista atualizada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar a lista');
    }
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
    setNovaCategoriaNome('');
    setNovaCategoriaCor('#007AFF');
    setModalCategoria(false);
  };

  const removerCategoria = (id: string) => {
    setEditandoCategorias(editandoCategorias.filter(cat => cat.id !== id));
  };

  // Funções para importação
  const selecionarArquivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/plain',
          'application/json',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.oasis.opendocument.text',
          'application/rtf',
          'application/pdf',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const arquivo = result.assets[0];
        setArquivoImportado(arquivo);
        
        // Extrair nome do arquivo sem extensão
        const nomeArquivo = arquivo.name.replace(/\.[^/.]+$/, ''); 
        setNomeListaImportada(nomeArquivo);

        await processarArquivo(arquivo);
      }
    } catch (error) {
      console.error('Erro ao selecionar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível selecionar o arquivo. Verifique se o arquivo é válido.');
    }
  };

  const processarArquivo = async (arquivo: any) => {
    try {
      // Verificar se o arquivo tem URI válida
      if (!arquivo.uri) {
        Alert.alert('Erro', 'Arquivo inválido');
        return;
      }

      const conteudo = await FileSystem.readAsStringAsync(arquivo.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      if (!conteudo || conteudo.trim().length === 0) {
        Alert.alert('Erro', 'O arquivo está vazio');
        return;
      }

      // Determinar tipo do arquivo baseado na extensão
      const extensao = arquivo.name.split('.').pop()?.toLowerCase() || 'txt';
      
      try {
        // Usar o novo sistema de processamento de arquivos
        const dadosProcessados = await SyncService.processarArquivo(conteudo, extensao);
        
        setItensImportados(dadosProcessados.itens);
        setNomeListaImportada(dadosProcessados.nome || nomeListaImportada);
        setDescricaoListaImportada(dadosProcessados.descricao || '');
        setCorListaImportada(dadosProcessados.cor || '#007AFF');
        
        if (dadosProcessados.itens.length === 0) {
          Alert.alert('Aviso', 'Nenhum item foi encontrado no arquivo. Verifique se o arquivo contém itens válidos.');
        }
      } catch (error) {
        console.error('Erro ao processar arquivo:', error);
        // Fallback para o método antigo
        const itens = extrairItensDoTexto(conteudo);
      setItensImportados(itens);
      
      if (itens.length === 0) {
        Alert.alert('Aviso', 'Nenhum item foi encontrado no arquivo. Verifique se o arquivo contém itens válidos.');
        }
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      Alert.alert('Erro', 'Não foi possível ler o arquivo. Verifique se o arquivo não está corrompido.');
    }
  };

  const extrairItensDoTexto = (texto: string): string[] => {
    // Normalizar quebras de linha
    const textoNormalizado = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Dividir por linhas e filtrar linhas vazias
    const linhas = textoNormalizado.split('\n')
      .map(linha => linha.trim())
      .filter(linha => linha.length > 0);

    // Padrões comuns para identificar itens de lista
    const itens: string[] = [];
    
    linhas.forEach(linha => {
      // Remove marcadores comuns de lista
      const itemLimpo = linha
        .replace(/^[-•*]\s*/, '') // Remove hífen, bullet, asterisco
        .replace(/^\d+\.\s*/, '') // Remove numeração
        .replace(/^[a-zA-Z]\.\s*/, '') // Remove letras com ponto
        .replace(/^[•▪▫◦‣⁃]\s*/, '') // Remove outros bullets Unicode
        .trim();

      if (itemLimpo.length > 0) {
        itens.push(itemLimpo);
      }
    });

    return itens;
  };

  const criarListaImportada = async () => {
    if (!nomeListaImportada.trim() || itensImportados.length === 0) {
      Alert.alert('Erro', 'Nome da lista e pelo menos um item são obrigatórios');
      return;
    }

    try {
      // Criar a lista primeiro
      const novaLista = await StorageService.adicionarLista({
        nome: nomeListaImportada.trim(),
        descricao: descricaoListaImportada.trim() || undefined,
        cor: corListaImportada,
        icone: 'list',
        dataCriacao: Date.now(),
        dataModificacao: Date.now(),
        permiteSelecaoAleatoria: true,
        itens: [],
        categorias: [],
      });

      // Adicionar os itens importados
      for (const item of itensImportados) {
        if (typeof item === 'string') {
          // Item simples como string
          const textoProcessado = DocumentProcessor.processarTextoComFormatacao(item.trim());
        
        await StorageService.adicionarItem(novaLista.id, {
          texto: textoProcessado.texto,
          textoFormatado: textoProcessado.formato,
          descricao: undefined,
          categoria: undefined,
        });
        } else {
          // Item estruturado com descrição e categoria
          const textoProcessado = DocumentProcessor.processarTextoComFormatacao(item.texto.trim());
          
          await StorageService.adicionarItem(novaLista.id, {
            texto: textoProcessado.texto,
            textoFormatado: textoProcessado.formato,
            descricao: item.descricao,
            categoria: item.categoria,
            categorias: item.categorias,
            tags: item.tags,
            prioridade: item.prioridade,
            data: item.data,
            concluido: item.concluido,
          });
        }
      }

      // Limpar estados
      setModalImportacao(false);
      setArquivoImportado(null);
      setItensImportados([]);
      setNomeListaImportada('');
      setDescricaoListaImportada('');
      setCorListaImportada('#007AFF');

      await carregarListas();
      Alert.alert('Sucesso', `Lista "${nomeListaImportada}" criada com ${itensImportados.length} itens!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível criar a lista importada');
    }
  };

  const limparImportacao = () => {
    setModalImportacao(false);
    setArquivoImportado(null);
    setItensImportados([]);
    setNomeListaImportada('');
    setDescricaoListaImportada('');
    setCorListaImportada('#007AFF');
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
            onPress={() => router.push({
              pathname: '/selecao-aleatoria',
              params: { id: item.id }
            })}
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

      {/* Conteúdo com scroll */}
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {listas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialIcons name="list" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }, typography.titleMedium]}>Nenhuma lista criada</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }, typography.subtitle]}>
              Crie sua primeira lista para começar
            </Text>
            <TouchableOpacity
              style={[styles.btnCriarPrimeira, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/criar-lista')}
            >
              <MaterialIcons name="add" size={24} color={colors.white} />
              <Text style={[styles.btnCriarPrimeiraText, { color: colors.white }, typography.button]}>Criar Primeira Lista</Text>
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
              <Text style={[styles.contentTitle, { color: colors.text }, typography.titleMedium]}>
                Suas Listas ({listasFiltradas.length})
              </Text>
                            <View style={styles.headerAcoes}>
                <TouchableOpacity
                  style={[styles.btnImportar, { backgroundColor: colors.accent }]}
                  onPress={() => setModalImportacao(true)}
                >
                  <MaterialIcons name="file-upload" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnAdicionar, { backgroundColor: colors.accent }]}
                  onPress={() => router.push('/criar-lista')}
                >
                  <MaterialIcons name="add" size={24} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Lista de itens */}
            <View style={styles.listContainer}>
              {listasFiltradas.map((item) => (
                <View key={item.id}>
                  {renderItem({ item })}
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

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

      {/* Modal de Editar Lista */}
      <Modal
        visible={modalEditarLista}
        transparent
        animationType="slide"
        onRequestClose={() => setModalEditarLista(false)}
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
                <TextInput
                  style={[styles.editarInput, styles.editarTextArea, { 
                    backgroundColor: isDarkMode ? '#38383A' : '#fff',
                    color: isDarkMode ? '#fff' : '#1C1C1E',
                    borderColor: isDarkMode ? '#5856D6' : '#e5e5ea'
                  }]}
                  value={editandoDescricao}
                  onChangeText={setEditandoDescricao}
                  placeholder="Digite uma descrição para a lista"
                  placeholderTextColor={getPlaceholderColor(isDarkMode)}
                  multiline
                  numberOfLines={3}
                  maxLength={200}
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
                        <TouchableOpacity
                          style={styles.btnRemoverCategoria}
                          onPress={() => removerCategoria(categoria.id)}
                        >
                          <MaterialIcons name="close" size={16} color="#FF3B30" />
                        </TouchableOpacity>
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
                  onPress={() => setModalEditarLista(false)}
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
        onRequestClose={() => setModalCategoria(false)}
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
                onPress={() => setModalCategoria(false)}
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
        visible={modalImportacao}
        transparent
        animationType="slide"
        onRequestClose={limparImportacao}
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
                  onPress={selecionarArquivo}
                >
                  <MaterialIcons name="file-upload" size={24} color={colors.primary} />
                  <Text style={[styles.btnSelecionarArquivoText, { color: colors.text }, typography.body]}>
                    {arquivoImportado ? arquivoImportado.name : 'Escolher arquivo'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Informações da Lista */}
              {arquivoImportado && (
                <>
                  <View style={styles.editarGrupo}>
                    <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
                      Nome da Lista *
                    </Text>
                    <TextInput
                      style={[styles.editarInput, { 
                        backgroundColor: colors.accent,
                        color: colors.text,
                        borderColor: colors.border
                      }]}
                      value={nomeListaImportada}
                      onChangeText={setNomeListaImportada}
                      placeholder="Digite o nome da lista"
                      placeholderTextColor={getPlaceholderColor(isDarkMode)}
                      maxLength={50}
                    />
                  </View>

                  <View style={styles.editarGrupo}>
                    <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
                      Descrição (opcional)
                    </Text>
                    <TextInput
                      style={[styles.editarInput, styles.editarTextArea, { 
                        backgroundColor: colors.accent,
                        color: colors.text,
                        borderColor: colors.border
                      }]}
                      value={descricaoListaImportada}
                      onChangeText={setDescricaoListaImportada}
                      placeholder="Digite uma descrição para a lista"
                      placeholderTextColor={getPlaceholderColor(isDarkMode)}
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                    />
                  </View>

                  <View style={styles.editarGrupo}>
                    <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
                      Cor da Lista
                    </Text>
                    <View style={styles.coresContainer}>
                      {['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D92', '#5AC8FA', '#FFCC02', '#FF6B35'].map((cor) => (
                        <TouchableOpacity
                          key={cor}
                          style={[
                            styles.corItem,
                            { backgroundColor: cor },
                            corListaImportada === cor && styles.corSelecionada,
                          ]}
                          onPress={() => setCorListaImportada(cor)}
                        >
                          {corListaImportada === cor && (
                            <MaterialIcons name="check" size={16} color="#fff" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Preview dos Itens */}
                  {itensImportados.length > 0 && (
                    <View style={styles.editarGrupo}>
                      <Text style={[styles.editarLabel, { color: colors.text }, typography.subtitleBold]}>
                        Itens Encontrados ({itensImportados.length})
                      </Text>
                      <View style={[styles.previewContainer, { backgroundColor: colors.accent }]}>
                        <ScrollView style={styles.previewScroll} showsVerticalScrollIndicator={false}>
                          {itensImportados.slice(0, 10).map((item, index) => (
                            <Text key={index} style={[styles.previewItem, { color: colors.text }, typography.body]}>
                              • {typeof item === 'string' ? item : item.texto}
                            </Text>
                          ))}
                          {itensImportados.length > 10 && (
                            <Text style={[styles.previewMore, { color: colors.textSecondary }, typography.caption]}>
                              ... e mais {itensImportados.length - 10} itens
                            </Text>
                          )}
                        </ScrollView>
                      </View>
                    </View>
                  )}
                </>
              )}

              {/* Botões */}
              <View style={styles.modalEditarBotoes}>
                <TouchableOpacity
                  style={styles.btnCancelar}
                  onPress={limparImportacao}
                >
                  <Text style={styles.btnCancelarText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnSalvar, { opacity: arquivoImportado && itensImportados.length > 0 ? 1 : 0.5 }]}
                  onPress={criarListaImportada}
                  disabled={!arquivoImportado || itensImportados.length === 0}
                >
                  <Text style={styles.btnSalvarText}>Criar Lista</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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

}); 