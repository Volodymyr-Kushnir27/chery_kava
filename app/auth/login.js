import { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { loginUser } from '../../src/services/authService';
import { validateEmail } from '../../src/utils/validation';
import { colors, metrics } from '../../src/constants/theme';
import AuthTopBar from '../../src/components/AuthTopBar';

export default function LoginScreen() {
  const params = useLocalSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [successText, setSuccessText] = useState('');

  const [errors, setErrors] = useState({
    email: '',
    password: '',
    common: '',
  });

  useEffect(() => {
    if (params?.registered === '1') {
      setSuccessText('Ви зареєстровані. Перейдіть на вашу почту для підтвердження.');
      if (typeof params?.email === 'string') {
        setEmail(params.email);
      }
    }
  }, [params]);

  function updateEmail(value) {
    setEmail(value);

    if (errors.email || errors.common || successText) {
      setErrors((prev) => ({
        ...prev,
        email: '',
        common: '',
      }));
      setSuccessText('');
    }
  }

  function updatePassword(value) {
    setPassword(value);

    if (errors.password || errors.common || successText) {
      setErrors((prev) => ({
        ...prev,
        password: '',
        common: '',
      }));
      setSuccessText('');
    }
  }

  async function handleLogin() {
    const nextErrors = {
      email: '',
      password: '',
      common: '',
    };

    if (!email.trim()) {
      nextErrors.email = 'Введіть email';
    } else if (!validateEmail(email.trim())) {
      nextErrors.email = 'Введіть коректний email';
    }

    if (!password) {
      nextErrors.password = 'Введіть пароль';
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    try {
      setLoading(true);

      const { error } = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setErrors({
          email: '',
          password: 'Неправильно введено логін або пароль',
          common: 'Неправильно введено логін або пароль',
        });
        return;
      }

      router.replace('/(tabs)/menu');
    } catch (e) {
      setErrors({
        email: '',
        password: 'Неправильно введено логін або пароль',
        common: 'Неправильно введено логін або пароль',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <AuthTopBar />

        <View style={styles.hero}>
          <Text style={styles.title}>Вхід</Text>
          <Text style={styles.subtitle}>Увійдіть в акаунт Cherry Kava</Text>
        </View>

        <View style={styles.form}>
          {!!successText && <Text style={styles.successText}>{successText}</Text>}

          <View>
            <TextInput
              style={[styles.input, !!errors.email && styles.inputError]}
              placeholder="Email"
              placeholderTextColor={colors.textMuted}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={updateEmail}
            />
            {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View>
            <View style={[styles.passwordWrap, !!errors.password && styles.inputError]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Пароль"
                placeholderTextColor={colors.textMuted}
                value={password}
                secureTextEntry={!showPassword}
                onChangeText={updatePassword}
              />

              <Pressable
                style={styles.eyeButton}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <MaterialIcons
                  name={showPassword ? 'visibility-off' : 'visibility'}
                  size={22}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {!!errors.password && (
              <Text style={styles.errorText}>{errors.password}</Text>
            )}
          </View>

          {!!errors.common && <Text style={styles.errorText}>{errors.common}</Text>}

          <Pressable
            style={styles.forgotWrap}
            onPress={() => router.push('/auth/forgot-password')}
          >
            <Text style={styles.forgotText}>Забули пароль?</Text>
          </Pressable>

          <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Вхід...' : 'Увійти'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.push('/auth/register')}>
            <Text style={styles.link}>Немає акаунта? Реєстрація</Text>
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
    fontSize: 32,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 15,
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
    marginTop: 6,
  },
  successText: {
    color: colors.green,
    fontSize: 13,
    lineHeight: 20,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
  },
  button: {
    marginTop: 6,
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
  link: {
    textAlign: 'center',
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 8,
  },
});