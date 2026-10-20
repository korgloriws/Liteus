import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '../services/ThemeContext';
import { getPlaceholderColor } from '../services/theme';
import { AccountService, AccountUser, DEFAULT_API_URL } from '../services/accountService';
import { CloudSyncService } from '../services/cloudSyncService';

export default function ContaScreen() {
  const { colors, typography, isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [apiOk, setApiOk] = useState<boolean | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const [url, savedUser] = await Promise.all([
        AccountService.getApiUrl(),
        AccountService.getSavedUser(),
      ]);
      setApiUrl(url);
      setUser(savedUser);

      const ok = await AccountService.health();
      setApiOk(ok);

      if (savedUser) {
        const fresh = await AccountService.me();
        setUser(fresh);
        if (fresh) {
          setEditName(fresh.name || '');
          setEditEmail(fresh.email || '');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conta:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar])
  );

  const salvarUrl = async () => {
    try {
      setBusy(true);
      await AccountService.setApiUrl(apiUrl);
      const ok = await AccountService.health();
      setApiOk(ok);
      Alert.alert(
        ok ? 'Conectado' : 'Sem conexão',
        ok
          ? 'API alcançada com sucesso.'
          : 'URL salva, mas a API não respondeu. Confira se o servidor está no ar.'
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao salvar URL');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setBusy(true);
      const result =
        mode === 'login'
          ? await AccountService.login(email.trim(), password)
          : await AccountService.register(email.trim(), password, name.trim() || undefined);
      setUser(result);
      setEditName(result.name || '');
      setEditEmail(result.email || '');
      setPassword('');
      await CloudSyncService.syncAfterLogin();
      Alert.alert(
        'Sucesso',
        mode === 'login'
          ? 'Login feito. Dados sincronizados com o servidor.'
          : 'Conta criada. Dados sincronizados com o servidor.'
      );
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha na autenticação');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair da conta', 'Os dados locais do aparelho permanecem. Deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          CloudSyncService.stopLiveSync();
          await AccountService.logout();
          setUser(null);
        },
      },
    ]);
  };

  const handleSyncNow = async () => {
    try {
      setBusy(true);
      const pushed = await CloudSyncService.pushLocalSnapshot();
      const pulled = await CloudSyncService.pullRemoteSnapshot();
      CloudSyncService.startLiveSync();
      if (pushed.skipped && pulled.skipped) {
        Alert.alert('Sync', 'Nada a sincronizar ou sync já em andamento.');
        return;
      }
      Alert.alert(
        'Sincronizado',
        `Servidor ↔ app:\n${pulled.counts?.listas ?? pushed.counts?.listas ?? 0} listas\n${pulled.counts?.itens ?? pushed.counts?.itens ?? 0} itens\n${pulled.counts?.notas ?? pushed.counts?.notas ?? 0} notas\n${pulled.counts?.tags ?? pushed.counts?.tags ?? 0} tags`
      );
    } catch (error: any) {
      Alert.alert('Erro no sync', error.message || 'Falha ao sincronizar');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setBusy(true);
      const updated = await AccountService.updateProfile({
        name: editName.trim(),
        email: editEmail.trim(),
      });
      setUser(updated);
      Alert.alert('Sucesso', 'Perfil atualizado.');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao atualizar perfil');
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      Alert.alert('Atenção', 'Informe a senha atual.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Atenção', 'A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Atenção', 'A confirmação não confere com a nova senha.');
      return;
    }
    try {
      setBusy(true);
      const updated = await AccountService.updateProfile({
        currentPassword,
        password: newPassword,
      });
      setUser(updated);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Sucesso', 'Senha alterada.');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Falha ao alterar senha');
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteAccount = () => {
    if (!deletePassword) {
      Alert.alert('Atenção', 'Digite sua senha no campo abaixo para confirmar a exclusão.');
      return;
    }
    Alert.alert(
      'Apagar conta',
      'Isso remove sua conta e todos os dados no servidor. Os dados locais deste aparelho permanecem.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusy(true);
              CloudSyncService.stopLiveSync();
              await AccountService.deleteAccount(deletePassword);
              setUser(null);
              setDeletePassword('');
              Alert.alert('Conta apagada', 'Sua conta foi removida do servidor.');
            } catch (error: any) {
              Alert.alert('Erro', error.message || 'Falha ao apagar conta');
            } finally {
              setBusy(false);
            }
          },
        },
      ]
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }, typography.titleMedium]}>Conta</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
            Servidor (VPS)
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }, typography.caption]}>
            URL da API Liteus (VPS). Ex.: {DEFAULT_API_URL}
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
            ]}
            value={apiUrl}
            onChangeText={setApiUrl}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={DEFAULT_API_URL}
            placeholderTextColor={getPlaceholderColor(isDarkMode)}
          />
          <View style={styles.rowBetween}>
            <Text style={[{ color: colors.textSecondary }, typography.caption]}>
              Status:{' '}
              {apiOk === null ? '—' : apiOk ? 'online' : 'offline'}
            </Text>
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: colors.primary }]}
              onPress={salvarUrl}
              disabled={busy}
            >
              <Text style={[styles.smallButtonText, typography.bodyBold]}>Testar / Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>

        {user ? (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
              Logado
            </Text>
            <View style={styles.optionInfo}>
              <MaterialIcons name="account-circle" size={28} color={colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[{ color: colors.text }, typography.subtitleBold]}>
                  {user.name || 'Usuário Liteus'}
                </Text>
                <Text style={[{ color: colors.textSecondary }, typography.caption]}>{user.email}</Text>
              </View>
            </View>
            <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 12 }, typography.caption]}>
              Com login ativo, listas/notas/tags sincronizam com o servidor. A digital continua só neste aparelho.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 12, opacity: busy ? 0.7 : 1 }]}
              onPress={handleSyncNow}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.primaryButtonText, typography.bodyBold]}>Sincronizar agora</Text>
              )}
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }, typography.titleMedium]}>
              Dados da conta
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nome"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="E-mail"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
              onPress={handleSaveProfile}
              disabled={busy}
            >
              <Text style={[styles.primaryButtonText, typography.bodyBold]}>Salvar nome e e-mail</Text>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 20 }, typography.titleMedium]}>
              Alterar senha
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              placeholder="Senha atual"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Nova senha (mín. 6)"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholder="Confirmar nova senha"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
              onPress={handleChangePassword}
              disabled={busy}
            >
              <Text style={[styles.primaryButtonText, typography.bodyBold]}>Atualizar senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: '#FF3B30', marginTop: 16 }]}
              onPress={handleLogout}
            >
              <Text style={[{ color: '#FF3B30' }, typography.bodyBold]}>Sair da conta</Text>
            </TouchableOpacity>

            <Text style={[styles.hint, { color: colors.textSecondary, marginTop: 20 }, typography.caption]}>
              Zona de risco — apagar conta remove tudo no servidor.
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={deletePassword}
              onChangeText={setDeletePassword}
              secureTextEntry
              placeholder="Senha para confirmar exclusão"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <TouchableOpacity
              style={[styles.dangerButton, { borderColor: '#FF3B30', backgroundColor: 'rgba(255,59,48,0.08)' }]}
              onPress={handleDeleteAccount}
              disabled={busy}
            >
              <Text style={[{ color: '#FF3B30' }, typography.bodyBold]}>Apagar conta no servidor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }, typography.titleMedium]}>
              {mode === 'login' ? 'Entrar' : 'Criar conta'}
            </Text>
            <Text style={[styles.hint, { color: colors.textSecondary }, typography.caption]}>
              Conta na nuvem para sync entre aparelhos. Independente da digital.
            </Text>

            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, mode === 'login' && { borderBottomColor: colors.primary }]}
                onPress={() => setMode('login')}
              >
                <Text
                  style={[
                    { color: mode === 'login' ? colors.primary : colors.textSecondary },
                    typography.bodyBold,
                  ]}
                >
                  Entrar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'register' && { borderBottomColor: colors.primary }]}
                onPress={() => setMode('register')}
              >
                <Text
                  style={[
                    { color: mode === 'register' ? colors.primary : colors.textSecondary },
                    typography.bodyBold,
                  ]}
                >
                  Criar conta
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="Nome (opcional)"
                placeholderTextColor={getPlaceholderColor(isDarkMode)}
              />
            )}

            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="E-mail"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />
            <TextInput
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Senha (mín. 6)"
              placeholderTextColor={getPlaceholderColor(isDarkMode)}
            />

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: busy ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.primaryButtonText, typography.bodyBold]}>
                  {mode === 'login' ? 'Entrar' : 'Criar conta'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
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
    marginLeft: 12,
  },
  headerSpacer: { width: 40 },
  content: { flex: 1, padding: 20 },
  loadingText: { textAlign: 'center', marginTop: 100 },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { marginBottom: 8 },
  hint: { marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  smallButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  smallButtonText: { color: '#fff' },
  optionInfo: { flexDirection: 'row', alignItems: 'center' },
  tabs: { flexDirection: 'row', marginBottom: 12 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: { color: '#fff' },
  dangerButton: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
