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
    referralCode: '',
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
      referralCode: '',
    };

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const normalizedPhone = normalizeUAPhone(form.phone);

    if (!firstName) {
      nextErrors.firstName = "Введіть ім'я";
    }

    if (!lastName) {
      nextErrors.lastName = 'Введіть прізвище';
    }

    if (!form.phone.trim()) {
      nextErrors.phone = 'Введіть номер телефону';
    } else if (!normalizedPhone) {
      nextErrors.phone = 'Введіть коректний український номер: +380XXXXXXXXX або 0XXXXXXXXX';
    }

    if (!email) {
      nextErrors.email = 'Введіть email';
    } else if (!validateEmail(email)) {
      nextErrors.email = 'Введіть коректний email';
    }

    if (!password) {
      nextErrors.password = 'Введіть пароль';
    } else if (password.length < 6) {
      nextErrors.password = 'Пароль має містити мінімум 6 символів';
    }

    setErrors(nextErrors);

    return {
      isValid: Object.values(nextErrors).every((value) => !value),
      normalizedPhone,
      email,
    };
  }

  async function handleRegister() {
    const { isValid, normalizedPhone, email } = validateForm();

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
        Alert.alert('Помилка реєстрації', error.message);
        return;
      }

      Alert.alert(
        'Готово',
        'Акаунт створено. Перевір пошту для підтвердження email.'
      );

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
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Реєстрація</Text>

        <TextInput
          style={inputStyle(!!errors.firstName)}
          placeholder="Ім'я"
          value={form.firstName}
          onChangeText={(value) => updateField('firstName', value)}
        />
        {!!errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

        <TextInput
          style={inputStyle(!!errors.lastName)}
          placeholder="Прізвище"
          value={form.lastName}
          onChangeText={(value) => updateField('lastName', value)}
        />
        {!!errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

        <TextInput
          style={inputStyle(!!errors.phone)}
          placeholder="Телефон (+380... або 0...)"
          value={form.phone}
          keyboardType="phone-pad"
          onChangeText={(value) => updateField('phone', value)}
        />
        {!!errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

        <TextInput
          style={inputStyle(!!errors.email)}
          placeholder="Email"
          value={form.email}
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={(value) => updateField('email', value)}
        />
        {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <TextInput
          style={inputStyle(!!errors.password)}
          placeholder="Пароль"
          value={form.password}
          secureTextEntry
          onChangeText={(value) => updateField('password', value)}
        />
        {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <TextInput
          style={styles.input}
          placeholder="Реферальний код (необов'язково)"
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
    backgroundColor: '#fff',
  },
  container: {
    padding: 20,
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#d93025',
  },
  errorText: {
    color: '#d93025',
    fontSize: 13,
    marginTop: -2,
    marginBottom: 4,
  },
  button: {
    backgroundColor: '#2b2118',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    textAlign: 'center',
    marginTop: 14,
    color: '#6b4f3a',
    fontSize: 15,
  },
});