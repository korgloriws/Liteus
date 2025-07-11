import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Crypto from 'expo-crypto';

export interface SecurityConfig {
  isEnabled: boolean;
  method: 'biometric' | 'pin' | 'both';
  pin?: string;
  autoLock: boolean;
  lockTimeout: number; // em minutos
  requireAuthOnStart: boolean;
}

export class AuthService {
  private static readonly SECURITY_CONFIG_KEY = '@liteus_security_config';
  private static readonly ENCRYPTED_DATA_KEY = '@liteus_encrypted_data';
  private static readonly SESSION_KEY = '@liteus_session';

  // Verificar se o dispositivo suporta autenticação biométrica
  static async isBiometricAvailable(): Promise<boolean> {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      return hasHardware && isEnrolled;
    } catch (error) {
      console.error('Erro ao verificar biometria:', error);
      return false;
    }
  }

  // Verificar se a autenticação biométrica está disponível
  static async getSupportedBiometricTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    try {
      return await LocalAuthentication.supportedAuthenticationTypesAsync();
    } catch (error) {
      console.error('Erro ao obter tipos de biometria:', error);
      return [];
    }
  }

  // Carregar configurações de segurança
  static async getSecurityConfig(): Promise<SecurityConfig> {
    try {
      const config = await AsyncStorage.getItem(this.SECURITY_CONFIG_KEY);
      if (config) {
        return JSON.parse(config);
      }
      return {
        isEnabled: false,
        method: 'biometric',
        autoLock: true,
        lockTimeout: 5,
        requireAuthOnStart: true,
      };
    } catch (error) {
      console.error('Erro ao carregar configurações de segurança:', error);
      return {
        isEnabled: false,
        method: 'biometric',
        autoLock: true,
        lockTimeout: 5,
        requireAuthOnStart: true,
      };
    }
  }

  // Salvar configurações de segurança
  static async setSecurityConfig(config: SecurityConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(this.SECURITY_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Erro ao salvar configurações de segurança:', error);
      throw error;
    }
  }

  // Autenticar com biometria
  static async authenticateWithBiometric(): Promise<boolean> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autentique-se para acessar o Liteus',
        fallbackLabel: 'Usar PIN',
        cancelLabel: 'Cancelar',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Erro na autenticação biométrica:', error);
      return false;
    }
  }

  // Autenticar com PIN
  static async authenticateWithPin(pin: string): Promise<boolean> {
    try {
      const config = await this.getSecurityConfig();
      return config.pin === pin;
    } catch (error) {
      console.error('Erro na autenticação com PIN:', error);
      return false;
    }
  }

  // Verificar se o usuário está autenticado
  static async isAuthenticated(): Promise<boolean> {
    try {
      const session = await AsyncStorage.getItem(this.SESSION_KEY);
      if (!session) return false;

      const sessionData = JSON.parse(session);
      const now = Date.now();
      const config = await this.getSecurityConfig();

      // Verificar se a sessão expirou
      if (now - sessionData.timestamp > config.lockTimeout * 60 * 1000) {
        await this.clearSession();
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      return false;
    }
  }

  // Criar sessão autenticada
  static async createSession(): Promise<void> {
    try {
      const sessionData = {
        timestamp: Date.now(),
        authenticated: true,
      };
      await AsyncStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      throw error;
    }
  }

  // Limpar sessão
  static async clearSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.SESSION_KEY);
    } catch (error) {
      console.error('Erro ao limpar sessão:', error);
    }
  }

  // Criptografar dados
  static async encryptData(data: string): Promise<string> {
    try {
      const config = await this.getSecurityConfig();
      const key = config.pin || 'default_key';
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key
      );
      
      // Implementação simples de criptografia
      // Em produção, use uma biblioteca mais robusta
      return btoa(data + ':' + digest);
    } catch (error) {
      console.error('Erro ao criptografar dados:', error);
      throw error;
    }
  }

  // Descriptografar dados
  static async decryptData(encryptedData: string): Promise<string> {
    try {
      const config = await this.getSecurityConfig();
      const key = config.pin || 'default_key';
      const digest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key
      );
      
      const decoded = atob(encryptedData);
      const parts = decoded.split(':');
      
      if (parts[1] !== digest) {
        throw new Error('Dados corrompidos ou chave inválida');
      }
      
      return parts[0];
    } catch (error) {
      console.error('Erro ao descriptografar dados:', error);
      throw error;
    }
  }

  // Salvar dados criptografados
  static async saveEncryptedData(data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      const encrypted = await this.encryptData(jsonData);
      await AsyncStorage.setItem(this.ENCRYPTED_DATA_KEY, encrypted);
    } catch (error) {
      console.error('Erro ao salvar dados criptografados:', error);
      throw error;
    }
  }

  // Carregar dados criptografados
  static async loadEncryptedData(): Promise<any> {
    try {
      const encrypted = await AsyncStorage.getItem(this.ENCRYPTED_DATA_KEY);
      if (!encrypted) return null;
      
      const decrypted = await this.decryptData(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Erro ao carregar dados criptografados:', error);
      return null;
    }
  }

  // Verificar se precisa de autenticação
  static async needsAuthentication(): Promise<boolean> {
    try {
      const config = await this.getSecurityConfig();
      if (!config.isEnabled) return false;

      if (config.requireAuthOnStart) {
        return !(await this.isAuthenticated());
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar necessidade de autenticação:', error);
      return false;
    }
  }

  // Processo completo de autenticação
  static async authenticate(): Promise<boolean> {
    try {
      const config = await this.getSecurityConfig();
      
      if (!config.isEnabled) {
        return true;
      }

      let authenticated = false;

      if (config.method === 'biometric' || config.method === 'both') {
        const biometricAvailable = await this.isBiometricAvailable();
        if (biometricAvailable) {
          authenticated = await this.authenticateWithBiometric();
        }
      }

      if (!authenticated && (config.method === 'pin' || config.method === 'both')) {
        // Aqui você retornaria false e deixaria a UI lidar com o PIN
        // Por enquanto, vamos simular que o PIN está correto
        authenticated = true;
      }

      if (authenticated) {
        await this.createSession();
      }

      return authenticated;
    } catch (error) {
      console.error('Erro no processo de autenticação:', error);
      return false;
    }
  }
} 