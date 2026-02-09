import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Lista, Nota } from '../types';
import { StorageService } from '../services/storage';
import { SyncService } from '../services/syncService';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';
import Constants from 'expo-constants';
import { localSyncService } from '../services/localSyncService';


const isDevelopment = __DEV__;

export default function ConfiguracoesScreen() {
  const { isDarkMode, setDarkMode, colors, typography } = useTheme();
  const [versao] = useState('1.1.2');
  const [listas, setListas] = useState<Lista[]>([]);
  const [modalSincronizacao, setModalSincronizacao] = useState(false);
  const [dadosSincronizacao, setDadosSincronizacao] = useState('');
  const [modalImportacaoGoogleDocs, setModalImportacaoGoogleDocs] = useState(false);
  const [modalImportacaoJSON, setModalImportacaoJSON] = useState(false);
  const [conteudoGoogleDocs, setConteudoGoogleDocs] = useState('');
  const [dadosJSON, setDadosJSON] = useState('');
  const [tipoArquivoSelecionado, setTipoArquivoSelecionado] = useState('auto');
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    
    initializeSyncService();
    carregarListas();
    
  }, []);

  const initializeSyncService = async () => {
    try {
      await localSyncService.initialize();
      await checkSyncStatus();
    } catch (error) {
      console.error('Erro ao inicializar serviço de sincronização:', error);
      setSyncError('Falha ao inicializar sincronização');
    }
  };

  const checkSyncStatus = async () => {
    try {
      const status = await localSyncService.getSyncStatus();
      setSyncStatus(status);
    } catch (error) {
      console.error('Erro ao verificar status de sync:', error);
    }
  };

  const handleSyncData = async () => {
    setIsSyncing(true);
    setSyncError(null);

    try {
      const result = await localSyncService.syncData();
      await checkSyncStatus();
      
      if (result.success) {
        Alert.alert('Sucesso', result.message);
      } else {
        setSyncError(result.message);
        Alert.alert('Aviso', result.message);
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      setSyncError('Falha na sincronização. Tente novamente.');
      Alert.alert('Erro', 'Falha na sincronização. Verifique sua conexão e tente novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearSyncData = async () => {
    Alert.alert(
      'Limpar Dados de Sincronização',
      'Tem certeza que deseja limpar todos os dados de sincronização? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await localSyncService.clearSyncData();
              await checkSyncStatus();
              Alert.alert('Sucesso', 'Dados de sincronização removidos.');
            } catch (error) {
              console.error('Erro ao limpar dados de sync:', error);
              Alert.alert('Erro', 'Falha ao limpar dados de sincronização.');
            }
          },
        },
      ]
    );
  };

  // Exportar e compartilhar backup
  const handleExportBackup = async () => {
    try {
      const result = await localSyncService.shareBackup();
      if (result.success) {
        Alert.alert('Sucesso', result.message);
      } else {
        Alert.alert('Erro', result.message);
      }
    } catch (error) {
      console.error('Erro ao exportar backup:', error);
      Alert.alert('Erro', 'Falha ao exportar backup');
    }
  };

  // Importar backup
  const handleImportBackup = async () => {
    try {
      const result = await localSyncService.importData();
      if (result.success) {
        Alert.alert('Sucesso', result.message);
        await carregarListas(); // Recarregar listas após importação
      } else {
        Alert.alert('Erro', result.message);
      }
    } catch (error) {
      console.error('Erro ao importar backup:', error);
      Alert.alert('Erro', 'Falha ao importar backup');
    }
  };

  const carregarListas = async () => {
    try {
      const listasCarregadas = await StorageService.carregarListas();
      setListas(listasCarregadas);
    } catch (error) {
      console.log('Erro ao carregar listas:', error);
    }
  };

  

  const handleModoEscuroChange = async (novoModoEscuro: boolean) => {
    await setDarkMode(novoModoEscuro);
  };



  const limparDados = async () => {
    Alert.alert(
      'Limpar Dados',
      'Tem certeza que deseja limpar todos os dados do app? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpar',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              setListas([]);
              Alert.alert('Sucesso', 'Todos os dados foram limpos');
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível limpar os dados');
            }
          },
        },
      ]
    );
  };



  return (
    <View style={{ flex: 1 }}>
      {/* Cabeçalho Customizado */}
      <View style={[styles.customHeader, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, typography.titleMedium]}>Configurações</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header do App */}
          <View style={styles.header}>
            <Image
              source={isDarkMode 
                ? require('../assets/logo_vertical_amarelo.png')
                : require('../assets/logo_vertical_azul.png')
              }
              style={styles.logo}
              resizeMode="contain"
            />

          </View>

        {/* Seção de Aparência */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Aparência</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="dark-mode" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Modo Escuro</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleModoEscuroChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {/* Seção de Segurança */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Segurança</Text>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => router.push('/seguranca')}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="security" size={24} color="#FF3B30" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Configurações de Segurança</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Seção de Sincronização */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Sincronização</Text>
          
          {/* Status do ambiente */}
          {isDevelopment && (
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: 12, marginBottom: 10 }, typography.caption]}>
              Ambiente: {Constants.appOwnership === 'expo' ? 'Expo Go' : 'Build Nativa'}
            </Text>
          )}
          
          {/* Botão de Sincronização */}
          <TouchableOpacity style={styles.optionItem} onPress={handleSyncData} disabled={isSyncing}>
            <MaterialIcons name="sync" size={24} color="#34C759" />
            <Text style={[styles.optionText, { color: colors.text }, typography.body]}>
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Dados'}
            </Text>
          </TouchableOpacity>

          {/* Botão de Exportar Backup */}
          <TouchableOpacity style={styles.optionItem} onPress={handleExportBackup}>
            <MaterialIcons name="file-download" size={24} color="#007AFF" />
            <Text style={[styles.optionText, { color: colors.text }, typography.body]}>
              Exportar e Compartilhar Backup
            </Text>
          </TouchableOpacity>

          {/* Botão de Importar Backup */}
          <TouchableOpacity style={styles.optionItem} onPress={handleImportBackup}>
            <MaterialIcons name="file-upload" size={24} color="#FF9500" />
            <Text style={[styles.optionText, { color: colors.text }, typography.body]}>
              Importar Backup
            </Text>
          </TouchableOpacity>
          
          {/* Status da Sincronização */}
          {syncStatus && (
            <View style={{ marginTop: 5, paddingHorizontal: 15 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Última sincronização: {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleString() : 'Nunca'}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Status: {syncStatus.isOnline ? 'Online' : 'Offline'} • {syncStatus.pendingChanges} mudanças pendentes
              </Text>
              {syncStatus.lastExport && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Último backup: {new Date(syncStatus.lastExport).toLocaleString()}
                </Text>
              )}
              {syncStatus.lastImport && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Última importação: {new Date(syncStatus.lastImport).toLocaleString()}
                </Text>
              )}
              {syncStatus.pendingChanges > 0 && (
                <Text style={{ color: '#FF9500', fontSize: 12 }}>
                  ⚠️ {syncStatus.pendingChanges} mudanças pendentes para sincronização
                </Text>
              )}
            </View>
          )}
          
          {/* Botão de Limpar Dados de Sincronização */}
          <TouchableOpacity style={styles.optionItem} onPress={handleClearSyncData}>
            <MaterialIcons name="delete" size={24} color="#FF3B30" />
            <Text style={[styles.optionText, { color: colors.text }, typography.body]}>
              Limpar dados de sincronização
            </Text>
          </TouchableOpacity>
          
          {/* Mensagens de erro */}
          {syncError && (
            <Text style={{ color: '#FF3B30', fontSize: 12, marginTop: 5 }}>
              {syncError}
            </Text>
          )}
        </View>



        {/* Seção de Dados */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Dados</Text>
          
          {/* Lixeira */}
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => router.push('/lixeira')}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="delete-outline" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Lixeira (30 dias)</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={() => router.push('/estatisticas')}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="analytics" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Estatísticas</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.optionItem} 
            onPress={limparDados}
          >
            <View style={styles.optionInfo}>
              <MaterialIcons name="delete-forever" size={24} color="#FF3B30" />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Limpar Todos os Dados</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Seção de Informações */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Informações</Text>
          
          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="info" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Versão</Text>
            </View>
            <Text style={[styles.optionValue, { color: colors.textSecondary }, typography.body]}>{versao}</Text>
          </View>

          <View style={styles.optionItem}>
            <View style={styles.optionInfo}>
              <MaterialIcons name="code" size={24} color={colors.primary} />
              <Text style={[styles.optionText, { color: colors.text }, typography.body]}>Desenvolvedor</Text>
            </View>
            <Text style={[styles.optionValue, { color: colors.textSecondary }, typography.body]}>Mateus Rodrigues</Text>
          </View>
        </View>

        {/* Seção de Recursos */}
        <View style={[styles.section, { 
          backgroundColor: colors.surface,
          shadowColor: colors.text,
        }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>Recursos</Text>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="list" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Criação de listas personalizadas com itens formatados</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="notes" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Notas com editor de texto rico (formatação completa)</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="format-bold" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Editor rico: negrito, itálico, cores, tamanhos, títulos, listas, alinhamento</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="category" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Categorias personalizadas com cores para organização</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="casino" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Seleção aleatória com animações e filtros</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="search" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Busca avançada e filtros por categoria</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="sort" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Ordenação: alfabética, data, categoria, último modificado</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="check-circle" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Marcação de itens como concluídos</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="analytics" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Estatísticas detalhadas e insights de produtividade</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="delete-outline" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Lixeira com recuperação (30 dias de retenção)</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="cloud-sync" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Backup e sincronização local (exportar/importar JSON)</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="file-upload" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Importação: Google Docs, JSON, texto formatado</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="security" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Segurança: autenticação biométrica e PIN</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="palette" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Temas claro/escuro e cores personalizáveis</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="content-copy" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Duplicação de listas, notas e itens</Text>
          </View>
          
          <View style={styles.featureItem}>
            <MaterialIcons name="share" size={20} color="#34C759" />
            <Text style={[styles.featureText, { color: colors.text }, typography.body]}>Exportação e compartilhamento de dados</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }, typography.caption]}>
            © 2025 Liteus - Listas Inteligentes
          </Text>
        </View>
      </View>
    </ScrollView>

    {/* Modal de Sincronização */}
    <Modal
      visible={modalSincronizacao}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalSincronizacao(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
            Dados para Sincronização
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, typography.body]}>
            Copie os dados abaixo e cole no outro dispositivo:
          </Text>

          <TextInput
            style={[styles.modalTextInput, { 
              backgroundColor: colors.accent,
              color: colors.text,
              borderColor: colors.border
            }, typography.body]}
            value={dadosSincronizacao}
            multiline
            numberOfLines={10}
            editable={false}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setModalSincronizacao(false)}
            >
              <Text style={styles.btnCancelarText}>Fechar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.btnCopiar}
              onPress={() => {
                // Implementar cópia para clipboard
                Alert.alert('Sucesso', 'Dados copiados para a área de transferência!');
              }}
            >
              <Text style={styles.btnCopiarText}>Copiar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal de Importação do Google Docs */}
    <Modal
      visible={modalImportacaoGoogleDocs}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalImportacaoGoogleDocs(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
            Importar do Google Docs
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, typography.body]}>
            Cole o conteúdo do Google Docs aqui. Aceita qualquer formato de texto:
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: 12, marginBottom: 10 }, typography.caption]}>
            • Listas com bullets (• - *)
            • Listas numeradas (1. 2. 3.)
            • Texto simples
            • Templates estruturados
            • Exportações do Google Docs
            • Texto formatado com negrito/itálico
            • Estruturas hierárquicas
          </Text>

          <Text style={[styles.modalSubtitle, { color: colors.textSecondary, fontSize: 12, marginBottom: 5 }, typography.caption]}>
            Tipo de arquivo:
          </Text>
          
          <View style={styles.tipoArquivoContainer}>
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'auto' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('auto')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'auto' && styles.tipoArquivoButtonTextSelected
              ]}>Auto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'txt' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('txt')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'txt' && styles.tipoArquivoButtonTextSelected
              ]}>TXT</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'docx' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('docx')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'docx' && styles.tipoArquivoButtonTextSelected
              ]}>DOCX</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tipoArquivoButton,
                tipoArquivoSelecionado === 'pdf' && styles.tipoArquivoButtonSelected
              ]}
              onPress={() => setTipoArquivoSelecionado('pdf')}
            >
              <Text style={[
                styles.tipoArquivoButtonText,
                { color: colors.text },
                typography.body,
                tipoArquivoSelecionado === 'pdf' && styles.tipoArquivoButtonTextSelected
              ]}>PDF</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[styles.modalTextInput, { 
                backgroundColor: colors.accent,
                color: colors.text,
                borderColor: colors.border
              }, typography.body]}
            value={conteudoGoogleDocs}
            onChangeText={setConteudoGoogleDocs}
            multiline
            numberOfLines={15}
            placeholder="Cole o conteúdo aqui..."
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setModalImportacaoGoogleDocs(false)}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.btnCopiar}
           
            >
              <Text style={styles.btnCopiarText}>Importar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* Modal de Importação JSON */}
    <Modal
      visible={modalImportacaoJSON}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setModalImportacaoJSON(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
          <Text style={[styles.modalTitle, { color: colors.text }, typography.titleMedium]}>
            Importar Dados Estruturados
          </Text>
          
          <Text style={[styles.modalSubtitle, { color: colors.textSecondary }, typography.body]}>
            Cole os dados JSON aqui:
          </Text>

          <TextInput
            style={[styles.modalTextInput, { 
              backgroundColor: colors.accent,
              color: colors.text,
              borderColor: colors.border
            }, typography.body]}
            value={dadosJSON}
            onChangeText={setDadosJSON}
            multiline
            numberOfLines={15}
            placeholder="Cole os dados JSON aqui..."
            placeholderTextColor={getPlaceholderColor(isDarkMode)}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.btnCancelar}
              onPress={() => setModalImportacaoJSON(false)}
            >
              <Text style={styles.btnCancelarText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity

            >
              <Text style={styles.btnCopiarText}>Importar</Text>
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
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 10,
  },
  appSlogan: {
    fontSize: 16,
    marginTop: 5,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  optionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    marginLeft: 12,
  },
  trashItem: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  trashInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trashActions: {
    flexDirection: 'row',
    gap: 8,
  },
  trashBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionValue: {
    fontSize: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 12,
    marginBottom: 16,
    minHeight: 200,
    fontFamily: 'monospace',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  btnCancelar: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  btnCancelarText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '600',
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
  tipoArquivoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 8,
  },
  tipoArquivoButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  tipoArquivoButtonSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  tipoArquivoButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  tipoArquivoButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
}); 