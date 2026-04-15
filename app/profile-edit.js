import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { colors, metrics } from '../src/constants/theme';

export default function ProfileEditScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [userId, setUserId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [canEditBirthDate, setCanEditBirthDate] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const id = authData?.user?.id;
      if (!id) throw new Error('Користувача не знайдено');

      setUserId(id);

      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, birth_date')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      setFirstName(data?.first_name || '');
      setLastName(data?.last_name || '');
      setPhone(data?.phone || '');

      const existingBirthDate = data?.birth_date || '';
      setBirthDate(existingBirthDate ? formatBirthDateToUi(existingBirthDate) : '');
      setCanEditBirthDate(!existingBirthDate);
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося завантажити профіль');
      router.replace('/profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);

      const payload = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: normalizePhone(phone) || phone.trim() || null,
      };

      if (canEditBirthDate) {
        const normalizedBirthDate = normalizeBirthDate(birthDate);

        if (!normalizedBirthDate) {
          Alert.alert('Помилка', 'Дата народження має бути у форматі 27.07.1996');
          setSaving(false);
          return;
        }

        if (!isValidPastDate(normalizedBirthDate)) {
          Alert.alert('Помилка', 'Дата народження некоректна');
          setSaving(false);
          return;
        }

        payload.birth_date = normalizedBirthDate;
      }

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Готово', 'Профіль оновлено');
      router.replace('/profile');
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося зберегти профіль');
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    router.replace('/profile');
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cherry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Редагування профілю</Text>

        <Text style={styles.label}>Ім’я</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Ім’я"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Прізвище</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder="Прізвище"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Телефон</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+380..."
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
        />

        {canEditBirthDate ? (
          <>
            <Text style={styles.label}>Дата народження</Text>
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={(v) => setBirthDate(maskDate(v))}
              placeholder="27.07.1996"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
            />
            <Text style={styles.hint}>
              Дату народження можна вказати лише один раз.
            </Text>
          </>
        ) : null}

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? 'Збереження...' : 'Зберегти'}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Скасувати</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
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

function formatBirthDateToUi(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return '';
  const [y, m, d] = value.split('-');
  return `${d}.${m}.${y}`;
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

function normalizePhone(phone) {
  const p = String(phone || '').replace(/\D/g, '');

  if (p.startsWith('380') && p.length === 12) return `+${p}`;
  if (p.startsWith('0') && p.length === 10) return `+38${p}`;
  if (p.startsWith('80') && p.length === 11) return `+3${p}`;
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 18,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  saveButton: {
    marginTop: 24,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#04120C',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
});