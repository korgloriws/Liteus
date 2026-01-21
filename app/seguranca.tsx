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
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { AuthService, SecurityConfig } from '../services/authService';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';

const { width } = Dimensions.get('window');

export default function SegurancaScreen() {
  const { isDarkMode, colors, typography } = useTheme();
  const [config, setConfig] = useState<SecurityConfig>({
    isEnabled: false,
    method: 'biometric',
    autoLock: true,
    lockTimeout: 5,
    requireAuthOnStart: true,
  });
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalPIN, setModalPIN] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingPIN, setIsSettingPIN] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      setLoading(true);
      const [configData, biometric] = await Promise.all([
        AuthService.getSecurityConfig(),
        AuthService.isBiometricAvailable(),
      ]);
      
      setConfig(configData);
      setBiometricAvailable(biometric);
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracao = async (novaConfig: SecurityConfig) => {
    try {
      await AuthService.setSecurityConfig(novaConfig);
      setConfig(novaConfig);
      Alert.alert('Sucesso', 'Configurações de segurança salvas!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar as configurações');
    }
  };

  const handleToggleSeguranca = async (enabled: boolean) => {
    if (enabled && config.method === 'pin' && !config.pin) {
      setIsSettingPIN(true);
      setModalPIN(true);
      return;
    }

    const novaConfig = { ...config, isEnabled: enabled };
    await salvarConfiguracao(novaConfig);
  };

  const handleMetodoAutenticacao = async (method: 'biometric' | 'pin' | 'both') => {
    let novaConfig = { ...config, method };

    if (method === 'pin' || method === 'both') {
      if (!config.pin) {
        setIsSettingPIN(true);
        setModalPIN(true);
        return;
      }
    }

    await salvarConfiguracao(novaConfig);
  };

  const handleDefinirPIN = async () => {
    if (pin.length < 4) {
      Alert.alert('Erro', 'O PIN deve ter pelo menos 4 dígitos');
      return;
    }

    if (pin !== confirmPin) {
      Alert.alert('Erro', 'Os PINs não coincidem');
      return;
    }

    const novaConfig = { ...config, pin };
    await salvarConfiguracao(novaConfig);
    setModalPIN(false);
    setPin('');
    setConfirmPin('');
    setIsSettingPIN(false);
  };

  const handleAlterarPIN = () => {
    setIsSettingPIN(false);
    setModalPIN(true);
  };

  const handleRemoverPIN = async () => {
    Alert.alert(
      'Remover PIN',
      'Tem certeza que deseja remover o PIN?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            const novaConfig = { ...config, pin: undefined };
            await salvarConfiguracao(novaConfig);
          },
        },
      ]
    );
  };

  const testarBiometria = async () => {
    try {
      const success = await AuthService.authenticateWithBiometric();
      if (success) {
        Alert.alert('Sucesso', 'Autenticação biométrica funcionando!');
      } else {
        Alert.alert('Erro', 'Falha na autenticação biométrica');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível testar a biometria');
    }
  };

  const testarPIN = async () => {
    if (!config.pin) {
      Alert.alert('Erro', 'Nenhum PIN configurado');
      return;
    }

    Alert.prompt(
      'Testar PIN',
      'Digite seu PIN:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Testar',
          onPress: async (pinDigitado) => {
            if (pinDigitado === config.pin) {
              Alert.alert('Sucesso', 'PIN correto!');
            } else {
              Alert.alert('Erro', 'PIN incorreto');
            }
          },
        },
      ],
      'secure-text'
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }, typography.subtitle]}>
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.back()}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, typography.titleMedium]}>
          Segurança
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Status da Segurança */}
        <View style={[styles.section, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
          <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
            Status da Segurança
          </Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                Proteção Ativada
              </Text>
              <Text style={[styles.settingSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
                {config.isEnabled ? 'Segurança ativa' : 'Sem proteção'}
              </Text>
            </View>
            <Switch
              value={config.isEnabled}
              onValueChange={handleToggleSeguranca}
              trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
              thumbColor={config.isEnabled ? '#fff' : '#fff'}
            />
          </View>
        </View>

        {/* Método de Autenticação */}
        {config.isEnabled && (
          <View style={[styles.section, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
              Método de Autenticação
            </Text>

            <TouchableOpacity
              style={[
                styles.methodOption,
                config.method === 'biometric' && styles.methodOptionSelected
              ]}
              onPress={() => handleMetodoAutenticacao('biometric')}
              disabled={!biometricAvailable}
            >
              <MaterialIcons 
                name="fingerprint" 
                size={24} 
                color={config.method === 'biometric' ? '#007AFF' : isDarkMode ? '#8E8E93' : '#8E8E93'} 
              />
              <View style={styles.methodInfo}>
                <Text style={[styles.methodTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                  Biometria
                </Text>
                <Text style={[styles.methodSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
                  {biometricAvailable ? 'Disponível' : 'Não disponível'}
                </Text>
              </View>
              {config.method === 'biometric' && (
                <MaterialIcons name="check" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodOption,
                config.method === 'pin' && styles.methodOptionSelected
              ]}
              onPress={() => handleMetodoAutenticacao('pin')}
            >
              <MaterialIcons 
                name="lock" 
                size={24} 
                color={config.method === 'pin' ? '#007AFF' : isDarkMode ? '#8E8E93' : '#8E8E93'} 
              />
              <View style={styles.methodInfo}>
                <Text style={[styles.methodTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                  PIN
                </Text>
                <Text style={[styles.methodSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
                  {config.pin ? 'Configurado' : 'Não configurado'}
                </Text>
              </View>
              {config.method === 'pin' && (
                <MaterialIcons name="check" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodOption,
                config.method === 'both' && styles.methodOptionSelected
              ]}
              onPress={() => handleMetodoAutenticacao('both')}
              disabled={!biometricAvailable}
            >
              <MaterialIcons 
                name="security" 
                size={24} 
                color={config.method === 'both' ? '#007AFF' : isDarkMode ? '#8E8E93' : '#8E8E93'} 
              />
              <View style={styles.methodInfo}>
                <Text style={[styles.methodTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                  Ambos
                </Text>
                <Text style={[styles.methodSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
                  Biometria + PIN
                </Text>
              </View>
              {config.method === 'both' && (
                <MaterialIcons name="check" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Configurações Avançadas */}
        {config.isEnabled && (
          <View style={[styles.section, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
              Configurações Avançadas
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                  Bloqueio Automático
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
                  Bloquear após {config.lockTimeout} min
                </Text>
              </View>
              <Switch
                value={config.autoLock}
                onValueChange={(value) => salvarConfiguracao({ ...config, autoLock: value })}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor={config.autoLock ? '#fff' : '#fff'}
              />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                  Autenticação na Abertura
                </Text>
                <Text style={[styles.settingSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
                  Sempre pedir autenticação
                </Text>
              </View>
              <Switch
                value={config.requireAuthOnStart}
                onValueChange={(value) => salvarConfiguracao({ ...config, requireAuthOnStart: value })}
                trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
                thumbColor={config.requireAuthOnStart ? '#fff' : '#fff'}
              />
            </View>
          </View>
        )}

        {/* Ações */}
        {config.isEnabled && (
          <View style={[styles.section, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
              Ações
            </Text>

            {biometricAvailable && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                onPress={testarBiometria}
              >
                <MaterialIcons name="fingerprint" size={20} color={isDarkMode ? '#fff' : '#1C1C1E'} />
                <Text style={[styles.actionButtonText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                  Testar Biometria
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
              onPress={testarPIN}
            >
              <MaterialIcons name="lock" size={20} color={isDarkMode ? '#fff' : '#1C1C1E'} />
              <Text style={[styles.actionButtonText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                Testar PIN
              </Text>
            </TouchableOpacity>

            {config.pin && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
                  onPress={handleAlterarPIN}
                >
                  <MaterialIcons name="edit" size={20} color={isDarkMode ? '#fff' : '#1C1C1E'} />
                  <Text style={[styles.actionButtonText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
                    Alterar PIN
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: '#FFE5E5' }]}
                  onPress={handleRemoverPIN}
                >
                  <MaterialIcons name="delete" size={20} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, { color: '#FF3B30' }]}>
                    Remover PIN
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {/* Modal de PIN */}
      <Modal
        visible={modalPIN}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalPIN(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDarkMode ? '#1C1C1E' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
              {isSettingPIN ? 'Definir PIN' : 'Alterar PIN'}
            </Text>
            
            <Text style={[styles.modalSubtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
              Digite um PIN de pelo menos 4 dígitos
            </Text>

            <TextInput
              style={[styles.pinInput, { 
                backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7',
                color: isDarkMode ? '#fff' : '#1C1C1E',
                borderColor: isDarkMode ? '#5856D6' : '#E5E5EA'
              }]}
              value={pin}
              onChangeText={setPin}
              placeholder="PIN"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
            />

            <TextInput
              style={[styles.pinInput, { 
                backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7',
                color: isDarkMode ? '#fff' : '#1C1C1E',
                borderColor: isDarkMode ? '#5856D6' : '#E5E5EA'
              }]}
              value={confirmPin}
              onChangeText={setConfirmPin}
              placeholder="Confirmar PIN"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.btnCancelar}
                onPress={() => {
                  setModalPIN(false);
                  setPin('');
                  setConfirmPin('');
                }}
              >
                <Text style={styles.btnCancelarText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.btnSalvar}
                onPress={handleDefinirPIN}
              >
                <Text style={styles.btnSalvarText}>Salvar</Text>
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
    borderBottomColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 12,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
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
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  methodOptionSelected: {
    backgroundColor: '#F0F8FF',
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  methodSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    borderRadius: 12,
    padding: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  btnCancelar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
    backgroundColor: '#F2F2F7',
  },
  btnCancelarText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
  },
  btnSalvar: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#007AFF',
  },
  btnSalvarText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
}); 