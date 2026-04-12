import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/constants/theme';

export default function RegisterScreen() {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: '',
    referral_code: '',
    birth_date: '',
  });

  const [errors, setErrors] = useState({});

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  }

  function validate() {
    const e = {};

    if (!form.first_name.trim()) e.first_name = "Введіть ім'я";
    if (!form.last_name.trim()) e.last_name = 'Введіть прізвище';

    const phone = normalizePhone(form.phone);
    if (!phone) e.phone = 'Формат телефону неправильний';

    const birth = normalizeBirthDate(form.birth_date);
    if (!birth) e.birth_date = 'Формат: 27.07.1996';

    if (!form.email.includes('@')) e.email = 'Невірний email';
    if (form.password.length < 6) e.password = 'Мінімум 6 символів';

    setErrors(e);

    return {
      valid: Object.keys(e).length === 0,
      phone,
      birth,
    };
  }

  async function handleRegister() {
    const { valid, phone, birth } = validate();
    if (!valid) return;

    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          first_name: form.first_name,
          last_name: form.last_name,
          phone: phone,
          birth_date: birth,
          referral_code: form.referral_code || null,
        },
      },
    });

    if (error) {
      Alert.alert('Помилка', error.message);
      return;
    }

    Alert.alert('Успіх', 'Перевір email для підтвердження');
    router.replace('/auth/login');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Реєстрація</Text>

      <Input label="Ім’я" value={form.first_name} onChange={(v) => updateField('first_name', v)} error={errors.first_name} />
      <Input label="Прізвище" value={form.last_name} onChange={(v) => updateField('last_name', v)} error={errors.last_name} />
      <Input label="Телефон" value={form.phone} onChange={(v) => updateField('phone', v)} error={errors.phone} />
      
      <Input
        label="Дата народження"
        value={form.birth_date}
        onChange={(v) => updateField('birth_date', maskDate(v))}
        error={errors.birth_date}
        placeholder="27.07.1996"
      />

      <Input label="Email" value={form.email} onChange={(v) => updateField('email', v)} error={errors.email} />
      <Input label="Пароль" value={form.password} onChange={(v) => updateField('password', v)} error={errors.password} secure />

      <Input label="Реферальний код (необовʼязково)" value={form.referral_code} onChange={(v) => updateField('referral_code', v)} />

      <Pressable style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Зареєструватись</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Input({ label, value, onChange, error, placeholder, secure }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.error]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#777"
        secureTextEntry={secure}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function normalizePhone(phone) {
  const p = phone.replace(/\D/g, '');

  if (p.startsWith('380')) return `+${p}`;
  if (p.startsWith('0')) return `+38${p}`;
  return null;
}

function maskDate(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function normalizeBirthDate(value) {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
  },

  title: {
    fontSize: 26,
    color: colors.text,
    marginBottom: 20,
    fontWeight: '800',
  },

  label: {
    color: colors.textMuted,
    marginBottom: 6,
  },

  input: {
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 12,
    color: colors.text,
    borderWidth: 1,
    borderColor: '#333',
  },

  error: {
    borderColor: 'red',
  },

  errorText: {
    color: 'red',
    fontSize: 12,
    marginTop: 4,
  },

  button: {
    backgroundColor: colors.cherry,
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});