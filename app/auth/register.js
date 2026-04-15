import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { router } from 'expo-router';
import { registerUser } from '../../src/services/authService';
import { colors, metrics } from '../../src/constants/theme';
import AuthTopBar from '../../src/components/AuthTopBar';

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

  const [errors, setErrors] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    birth_date: '',
    email: '',
    password: '',
    referral_code: '',
    common: '',
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name] || errors.common) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
        common: '',
      }));
    }
  }

  function validate() {
    const e = {};

    if (!form.first_name.trim()) e.first_name = "Введіть ім'я";
    if (!form.last_name.trim()) e.last_name = 'Введіть прізвище';

    const phone = normalizePhone(form.phone);
    if (!phone) e.phone = 'Формат телефону неправильний';

    const birth = normalizeBirthDate(form.birth_date);
    if (!birth) {
      e.birth_date = 'Введіть дату у форматі 27.07.1996';
    } else if (!isValidPastDate(birth)) {
      e.birth_date = 'Дата народження некоректна';
    }

    const email = form.email.trim().toLowerCase();
    if (!validateEmail(email)) e.email = 'Невірний email';

    if (form.password.length < 6) e.password = 'Мінімум 6 символів';

    setErrors((prev) => ({
      ...prev,
      first_name: e.first_name || '',
      last_name: e.last_name || '',
      phone: e.phone || '',
      birth_date: e.birth_date || '',
      email: e.email || '',
      password: e.password || '',
      common: '',
    }));

    return {
      valid: Object.keys(e).length === 0,
      phone,
      birth,
      email,
    };
  }

  async function handleRegister() {
    if (loading) return;

    const { valid, phone, birth, email } = validate();
    if (!valid) return;

    try {
      setLoading(true);

      const { error } = await registerUser({
        email,
        password: form.password,
        phone,
        firstName: form.first_name.trim(),
        lastName: form.last_name.trim(),
        referralCode: form.referral_code.trim(),
        birthDate: birth,
      });

      if (error) {
        const message = String(error.message || '').toLowerCase();

        if (
          message.includes('already registered') ||
          message.includes('user already registered') ||
          message.includes('already been registered') ||
          message.includes('email address is already registered') ||
          message.includes('duplicate')
        ) {
          setErrors((prev) => ({
            ...prev,
            email: 'Такий користувач вже зареєстрований',
            common: 'Такий користувач вже зареєстрований',
          }));
          return;
        }

        if (message.includes('реферальний код не знайдено')) {
          setErrors((prev) => ({
            ...prev,
            referral_code: 'Реферальний код не знайдено',
            common: '',
          }));
          return;
        }

        if (message.includes('too many requests') || message.includes('429')) {
          setErrors((prev) => ({
            ...prev,
            common: 'Забагато спроб реєстрації. Зачекайте трохи та спробуйте ще раз.',
          }));
          return;
        }

        setErrors((prev) => ({
          ...prev,
          common: error.message || 'Не вдалося зареєструватися',
        }));
        return;
      }

      router.replace({
        pathname: '/auth/login',
        params: {
          registered: '1',
          email,
        },
      });
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        common: e?.message || 'Щось пішло не так',
      }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AuthTopBar />

          <View style={styles.hero}>
            <Text style={styles.title}>Реєстрація</Text>
            <Text style={styles.subtitle}>
              Створіть акаунт Cherry Kava та почніть накопичувати зерна.
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Ім’я"
              value={form.first_name}
              onChange={(v) => updateField('first_name', v)}
              error={errors.first_name}
              placeholder="Введіть імʼя"
            />

            <Input
              label="Прізвище"
              value={form.last_name}
              onChange={(v) => updateField('last_name', v)}
              error={errors.last_name}
              placeholder="Введіть прізвище"
            />

            <Input
              label="Телефон"
              value={form.phone}
              onChange={(v) => updateField('phone', v)}
              error={errors.phone}
              placeholder="+380..."
              keyboardType="phone-pad"
            />

            <Input
              label="Дата народження"
              value={form.birth_date}
              onChange={(v) => updateField('birth_date', maskDate(v))}
              error={errors.birth_date}
              placeholder="27.07.1996"
              keyboardType="number-pad"
            />

            <Input
              label="Email"
              value={form.email}
              onChange={(v) => updateField('email', v)}
              error={errors.email}
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.inputWrap}>
              <Text style={styles.label}>Пароль</Text>

              <View
                style={[
                  styles.passwordWrap,
                  errors.password && styles.inputErrorBorder,
                ]}
              >
                <TextInput
                  style={styles.passwordInput}
                  value={form.password}
                  onChangeText={(v) => updateField('password', v)}
                  placeholder="Мінімум 6 символів"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
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

            <Input
              label="Реферальний код"
              value={form.referral_code}
              onChange={(v) => updateField('referral_code', v.toUpperCase())}
              error={errors.referral_code}
              placeholder="Необовʼязково"
              autoCapitalize="characters"
            />

            {!!errors.common && <Text style={styles.errorText}>{errors.common}</Text>}

            <Pressable
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Реєстрація...' : 'Зареєструватись'}
              </Text>
            </Pressable>

            <Pressable onPress={() => router.push('/auth/login')}>
              <Text style={styles.link}>Вже є акаунт? Увійти</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({
  label,
  value,
  onChange,
  error,
  placeholder,
  secure,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={[styles.input, error && styles.inputErrorBorder]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secure}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function validateEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
}

function normalizePhone(phone) {
  const p = String(phone || '').replace(/\D/g, '');

  if (p.startsWith('380') && p.length === 12) return `+${p}`;
  if (p.startsWith('0') && p.length === 10) return `+38${p}`;
  if (p.startsWith('80') && p.length === 11) return `+3${p}`;
  return null;
}

function maskDate(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function normalizeBirthDate(value) {
  const match = String(value || '').match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;

  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function isValidPastDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(y, m - 1, d);

  if (
    dt.getFullYear() !== y ||
    dt.getMonth() !== m - 1 ||
    dt.getDate() !== d
  ) {
    return false;
  }

  const today = new Date();
  dt.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dt <= today;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
    flexGrow: 1,
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
    lineHeight: 22,
    marginTop: 8,
  },
  form: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.white08,
    gap: 14,
  },
  inputWrap: {
    gap: 6,
  },
  label: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '600',
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
  inputErrorBorder: {
    borderColor: colors.cherry,
  },
  errorText: {
    color: colors.cherry,
    fontSize: 12,
  },
  button: {
    marginTop: 6,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
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
    marginTop: 2,
  },
});