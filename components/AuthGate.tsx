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
import { GoogleSignin, statusCodes, User } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface AuthGateProps {
  children: React.ReactNode;
}

const GOOGLE_AUTH_KEY = '@liteus_google_auth';
const AUTH_MODE_KEY = '@liteus_auth_mode'; // 'google' | 'local'

export default function AuthGate({ children }: AuthGateProps) {
  const { isDarkMode, colors, typography } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showPinInput, setShowPinInput] = useState(false);
  const [pin, setPin] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'google' | 'local' | null>(null);
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    checkAuthMode();
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

  const checkAuthMode = async () => {
    setIsLoading(true);
    try {
      const mode = await AsyncStorage.getItem(AUTH_MODE_KEY);
      if (mode === 'google') {
        // Tenta restaurar sessão Google
        const user = await GoogleSignin.getCurrentUser();
        if (user) {
          setGoogleUser(user);
          setAuthMode('google');
          setIsAuthenticated(true);
        } else {
          setAuthMode(null); // Força escolha novamente
        }
      } else if (mode === 'local') {
        setAuthMode('local');
        checkAuthentication();
      } else {
        setAuthMode(null); // Primeira vez, mostra opções
      }
    } catch (e) {
      setAuthMode(null);
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

  // LOGIN GOOGLE
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type === 'success') {
        setGoogleUser(response.data);
        setAuthMode('google');
        setIsAuthenticated(true);
        await AsyncStorage.setItem(AUTH_MODE_KEY, 'google');
      } // se cancelado, não faz nada
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelado pelo usuário
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Atenção', 'Login já em andamento.');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Erro', 'Google Play Services não disponível.');
      } else {
        Alert.alert('Erro', 'Falha ao logar com Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // LOGOUT GOOGLE
  const handleGoogleLogout = async () => {
    try {
      await GoogleSignin.signOut();
      setGoogleUser(null);
      setAuthMode(null);
      setIsAuthenticated(false);
      await AsyncStorage.removeItem(AUTH_MODE_KEY);
    } catch (e) {
      Alert.alert('Erro', 'Falha ao sair do Google.');
    }
  };

  // USO LOCAL
  const handleLocalMode = async () => {
    setAuthMode('local');
    await AsyncStorage.setItem(AUTH_MODE_KEY, 'local');
    checkAuthentication();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <MaterialIcons name="security" size={64} color={colors.text} />
          <Text style={[styles.loadingText, { color: colors.text }, typography.subtitle]}>
            Verificando segurança...
          </Text>
        </View>
      </View>
    );
  }

  if (isAuthenticated && authMode === 'google') {
    return <>{children}</>;
  }
  if (isAuthenticated && authMode === 'local') {
    return <>{children}</>;
  }

  // Tela de escolha de modo de autenticação
  if (authMode === null) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}> 
        <View style={styles.authContainer}>
          <MaterialIcons name="lock" size={80} color={colors.text} />
          <Text style={[styles.title, { color: colors.text }, typography.titleLarge]}>Bem-vindo ao Liteus</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }, typography.subtitle]}>Escolha como deseja usar o app:</Text>
          <TouchableOpacity
            style={[styles.biometricButton, { backgroundColor: colors.surface, opacity: googleLoading ? 0.7 : 1 }]}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
          >
            <MaterialIcons name="account-circle" size={24} color={colors.text} />
            <Text style={[styles.biometricButtonText, { color: colors.text }, typography.button]}>Entrar com Google</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.alternativeButton, { backgroundColor: colors.surface }]}
            onPress={handleLocalMode}
          >
            <MaterialIcons name="smartphone" size={20} color={colors.text} />
            <Text style={[styles.alternativeButtonText, { color: colors.text }, typography.bodyBold]}>Usar sem login (offline/local)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.authContainer}>
        <MaterialIcons name="lock" size={80} color={colors.text} />
        
        <Text style={[styles.title, { color: colors.text }, typography.titleLarge]}>
          Liteus Protegido
        </Text>
        
        <Text style={[styles.subtitle, { color: colors.textSecondary }, typography.subtitle]}>
          Autentique-se para acessar suas listas
        </Text>

        {!showPinInput && (config?.method === 'biometric' || config?.method === 'both') && (
          <TouchableOpacity
            style={[styles.biometricButton, { backgroundColor: colors.surface }]}
            onPress={handleBiometricRetry}
          >
            <MaterialIcons name="fingerprint" size={24} color={colors.text} />
            <Text style={[styles.biometricButtonText, { color: colors.text }, typography.button]}>
              Usar Biometria
            </Text>
          </TouchableOpacity>
        )}

        {showPinInput && (
          <View style={styles.pinContainer}>
            <Text style={[styles.pinLabel, { color: colors.text }, typography.subtitle]}>
              Digite seu PIN:
            </Text>
            
            <TextInput
              style={[styles.pinInput, { 
                backgroundColor: colors.surface,
                color: colors.text,
                borderColor: colors.border
              }, typography.body]}
              value={pin}
              onChangeText={setPin}
              placeholder="PIN"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              keyboardType="numeric"
              maxLength={6}
              autoFocus
              onSubmitEditing={handlePinSubmit}
            />

            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handlePinSubmit}
            >
              <Text style={[styles.submitButtonText, { color: colors.white }, typography.button]}>Entrar</Text>
            </TouchableOpacity>
          </View>
        )}

        {config?.method === 'both' && !showPinInput && (
          <TouchableOpacity
            style={[styles.alternativeButton, { backgroundColor: colors.surface }]}
            onPress={() => setShowPinInput(true)}
          >
            <MaterialIcons name="lock" size={20} color={colors.text} />
            <Text style={[styles.alternativeButtonText, { color: colors.text }, typography.bodyBold]}>
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
    marginTop: 16,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  title: {
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
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
    marginLeft: 8,
  },
  pinContainer: {
    width: '100%',
    alignItems: 'center',
  },
  pinLabel: {
    marginBottom: 16,
  },
  pinInput: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  submitButtonText: {
    textAlign: 'center',
  },
}); 