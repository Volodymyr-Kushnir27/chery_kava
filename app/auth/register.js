import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { registerUser } from '../../src/services/authService';
import { validateEmail, normalizeUAPhone } from '../../src/utils/validation';
import { colors, metrics } from '../../src/constants/theme';
import AuthTopBar from '../../src/components/AuthTopBar';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
    referralCode: '',
  });

  const [errors, setErrors] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validateForm() {
    const nextErrors = {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      password: '',
    };

    const email = form.email.trim().toLowerCase();
    const normalizedPhone = normalizeUAPhone(form.phone);

    if (!form.firstName.trim()) nextErrors.firstName = "Введіть ім'я";
    if (!form.lastName.trim()) nextErrors.lastName = 'Введіть прізвище';

    if (!form.phone.trim()) {
      nextErrors.phone = 'Введіть номер телефону';
    } else if (!normalizedPhone) {
      nextErrors.phone = 'Формат: +380XXXXXXXXX або 0XXXXXXXXX';
    }

    if (!email) {
      nextErrors.email = 'Введіть email';
    } else if (!validateEmail(email)) {
      nextErrors.email = 'Некоректний email';
    }

    if (!form.password) {
      nextErrors.password = 'Введіть пароль';
    } else if (form.password.length < 6) {
      nextErrors.password = 'Мінімум 6 символів';
    }

    setErrors(nextErrors);

    return {
      isValid: Object.values(nextErrors).every((v) => !v),
      email,
      normalizedPhone,
    };
  }

  async function handleRegister() {
    const { isValid, email, normalizedPhone } = validateForm();

    if (!isValid) return;

    try {
      setLoading(true);

      const { error } = await registerUser({
        email,
        password: form.password,
        phone: normalizedPhone,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        referralCode: form.referralCode.trim().toUpperCase(),
      });

      if (error) {
        Alert.alert('Помилка реєстрації', error.message || 'Не вдалося створити акаунт');
        return;
      }

      Alert.alert('Готово', 'Акаунт створено. Перевір пошту для підтвердження email.');

      router.replace({
        pathname: '/auth/verify-email',
        params: { email },
      });
    } catch (e) {
      Alert.alert('Помилка', e.message || 'Щось пішло не так');
    } finally {
      setLoading(false);
    }
  }

  function inputStyle(hasError) {
    return [styles.input, hasError && styles.inputError];
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <AuthTopBar />

        <Text style={styles.title}>Реєстрація</Text>
        <Text style={styles.subtitle}>Створіть акаунт для бонусної системи</Text>

        <TextInput
          style={inputStyle(!!errors.firstName)}
          placeholder="Ім'я"
          placeholderTextColor={colors.textMuted}
          value={form.firstName}
          onChangeText={(value) => updateField('firstName', value)}
        />
        {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

        <TextInput
          style={inputStyle(!!errors.lastName)}
          placeholder="Прізвище"
          placeholderTextColor={colors.textMuted}
          value={form.lastName}
          onChangeText={(value) => updateField('lastName', value)}
        />
        {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

        <TextInput
          style={inputStyle(!!errors.phone)}
          placeholder="Телефон (+380... або 0...)"
          placeholderTextColor={colors.textMuted}
          value={form.phone}
          keyboardType="phone-pad"
          onChangeText={(value) => updateField('phone', value)}
        />
        {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

        <TextInput
          style={inputStyle(!!errors.email)}
          placeholder="Email"
          placeholderTextColor={colors.textMuted}
          value={form.email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(value) => updateField('email', value)}
        />
        {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TextInput
          style={inputStyle(!!errors.password)}
          placeholder="Пароль"
          placeholderTextColor={colors.textMuted}
          value={form.password}
          secureTextEntry
          onChangeText={(value) => updateField('password', value)}
        />
        {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Реферальний код (необов'язково)"
          placeholderTextColor={colors.textMuted}
          value={form.referralCode}
          autoCapitalize="characters"
          onChangeText={(value) => updateField('referralCode', value)}
        />

        <Pressable style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Створення...' : 'Зареєструватися'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.push('/auth/login')}>
          <Text style={styles.link}>Вже є акаунт? Увійти</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 80,
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
    marginBottom: 18,
  },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
    marginTop: 16,
  },
});