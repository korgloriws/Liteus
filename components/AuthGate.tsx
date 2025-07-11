import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthService } from '../services/authService';
import { useTheme } from '../services/ThemeContext';

const { width } = Dimensions.get('window');

interface AuthGateProps {
  children: React.ReactNode;
}

export default function AuthGate({ children }: AuthGateProps) {
  const { isDarkMode } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setIsLoading(true);
      const config = await AuthService.getSecurityConfig();
      setConfig(config);

      if (!config.isEnabled) {
        setIsAuthenticated(true);
        return;
      }

      const needsAuth = await AuthService.needsAuthentication();
      if (!needsAuth) {
        setIsAuthenticated(true);
        return;
      }

      // Tentar autenticação biométrica primeiro
      if (config.method === 'biometric' || config.method === 'both') {
        const biometricAvailable = await AuthService.isBiometricAvailable();
        if (biometricAvailable) {
          const success = await AuthService.authenticateWithBiometric();
          if (success) {
            setIsAuthenticated(true);
            return;
          }
        }
      }

      // Se não conseguiu biometria ou não está disponível, mostrar PIN
      if (config.method === 'pin' || config.method === 'both') {
        setShowPinInput(true);
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      setIsAuthenticated(true); // Em caso de erro, permitir acesso
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinSubmit = async () => {
    if (pin.length < 4) {
      Alert.alert('Erro', 'PIN deve ter pelo menos 4 dígitos');
      return;
    }

    try {
      const success = await AuthService.authenticateWithPin(pin);
      if (success) {
        await AuthService.createSession();
        setIsAuthenticated(true);
        setPin('');
      } else {
        Alert.alert('Erro', 'PIN incorreto');
        setPin('');
      }
    } catch (error) {
      Alert.alert('Erro', 'Falha na autenticação');
      setPin('');
    }
  };

  const handleBiometricRetry = async () => {
    try {
      const success = await AuthService.authenticateWithBiometric();
      if (success) {
        setIsAuthenticated(true);
      } else {
        setShowPinInput(true);
      }
    } catch (error) {
      setShowPinInput(true);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="security" size={64} color={isDarkMode ? '#fff' : '#1C1C1E'} />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
            Verificando segurança...
          </Text>
        </View>
      </View>
    );
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#000' : '#f2f2f7' }]}>
      <View style={styles.authContainer}>
        <MaterialIcons name="lock" size={80} color={isDarkMode ? '#fff' : '#1C1C1E'} />
        
        <Text style={[styles.title, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
          Liteus Protegido
        </Text>
        
        <Text style={[styles.subtitle, { color: isDarkMode ? '#8E8E93' : '#8E8E93' }]}>
          Autentique-se para acessar suas listas
        </Text>

        {!showPinInput && (config?.method === 'biometric' || config?.method === 'both') && (
          <TouchableOpacity
            style={[styles.biometricButton, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
            onPress={handleBiometricRetry}
          >
            <MaterialIcons name="fingerprint" size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
            <Text style={[styles.biometricButtonText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
              Usar Biometria
            </Text>
          </TouchableOpacity>
        )}

        {showPinInput && (
          <View style={styles.pinContainer}>
            <Text style={[styles.pinLabel, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
              Digite seu PIN:
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
              placeholderTextColor={isDarkMode ? '#8E8E93' : '#8E8E93'}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              autoFocus
              onSubmitEditing={handlePinSubmit}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: '#007AFF' }]}
              onPress={handlePinSubmit}
            >
              <Text style={styles.submitButtonText}>Entrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {config?.method === 'both' && !showPinInput && (
          <TouchableOpacity
            style={[styles.alternativeButton, { backgroundColor: isDarkMode ? '#38383A' : '#F2F2F7' }]}
            onPress={() => setShowPinInput(true)}
          >
            <MaterialIcons name="lock" size={20} color={isDarkMode ? '#fff' : '#1C1C1E'} />
            <Text style={[styles.alternativeButtonText, { color: isDarkMode ? '#fff' : '#1C1C1E' }]}>
              Usar PIN
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    marginTop: 16,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 40,
  },
  biometricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
  },
  biometricButtonText: {
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 12,
  },
  alternativeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  alternativeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  pinContainer: {
    width: '100%',
    alignItems: 'center',
  },
  pinLabel: {
    fontSize: 16,
    marginBottom: 16,
  },
  pinInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
}); 