import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';
import AuthTopBar from '../../src/components/AuthTopBar';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
      }
    });

    return () => {
      subscription?.subscription?.unsubscribe();
    };
  }, []);

  async function handleChangePassword() {
    if (password.length < 6) {
      setErrorText('Новий пароль має містити мінімум 6 символів');
      return;
    }

    if (password !== password2) {
      setErrorText('Паролі не співпадають');
      return;
    }

    try {
      setLoading(true);
      setErrorText('');

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setErrorText(error.message || 'Не вдалося змінити пароль');
        return;
      }

      Alert.alert('Готово', 'Пароль успішно змінено');
      router.replace('/auth/login');
    } catch (e) {
      setErrorText(e.message || 'Щось пішло не так');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <AuthTopBar />

        <View style={styles.hero}>
          <Text style={styles.title}>Новий пароль</Text>
          <Text style={styles.subtitle}>
            Введіть новий пароль для вашого акаунта.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.passwordWrap, !!errorText && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Новий пароль"
              placeholderTextColor={colors.textMuted}
              value={password}
              secureTextEntry={!showPassword}
              onChangeText={(value) => {
                setPassword(value);
                if (errorText) setErrorText('');
              }}
            />
            <Pressable onPress={() => setShowPassword((prev) => !prev)} style={styles.eyeButton}>
              <MaterialIcons
                name={showPassword ? 'visibility-off' : 'visibility'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          <View style={[styles.passwordWrap, !!errorText && styles.inputError]}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Повторіть пароль"
              placeholderTextColor={colors.textMuted}
              value={password2}
              secureTextEntry={!showPassword2}
              onChangeText={(value) => {
                setPassword2(value);
                if (errorText) setErrorText('');
              }}
            />
            <Pressable onPress={() => setShowPassword2((prev) => !prev)} style={styles.eyeButton}>
              <MaterialIcons
                name={showPassword2 ? 'visibility-off' : 'visibility'}
                size={22}
                color={colors.textMuted}
              />
            </Pressable>
          </View>

          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <Pressable style={styles.button} onPress={handleChangePassword} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Збереження...' : 'Змінити пароль'}
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    padding: metrics.screenPadding,
    justifyContent: 'center',
  },
  hero: {
    marginBottom: 20,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.white08,
    gap: 12,
  },
  passwordWrap: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 14,
    paddingRight: 8,
  },
  passwordInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  eyeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputError: {
    borderColor: colors.cherry,
  },
  errorText: {
    color: colors.cherry,
    fontSize: 12,
    marginTop: -4,
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});