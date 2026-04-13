import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';
import AuthTopBar from '../../src/components/AuthTopBar';

const RESET_REDIRECT_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}/auth/reset-password`
    : 'https://chery-kava.onrender.com/auth/reset-password';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');

  async function handleReset() {
    if (!email.trim()) {
      setErrorText('Введіть email');
      return;
    }

    try {
      setLoading(true);
      setErrorText('');

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        {
          redirectTo: RESET_REDIRECT_URL,
        },
      );

      if (error) {
        setErrorText(error.message || 'Не вдалося надіслати лист');
        return;
      }

      Alert.alert(
        'Готово',
        'Ми надіслали лист на вашу пошту. Перейдіть за посиланням для зміни пароля.',
      );
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
          <Text style={styles.title}>Відновлення пароля</Text>
          <Text style={styles.subtitle}>
            Введіть email, і ми надішлемо посилання для скидання пароля.
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={[styles.input, !!errorText && styles.inputError]}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              if (errorText) setErrorText('');
            }}
          />

          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <Pressable style={styles.button} onPress={handleReset} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Відправка...' : 'Надіслати лист'}
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
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
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