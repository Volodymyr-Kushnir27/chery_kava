import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';

function ProfileRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function formatBirthDate(value) {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}.${m}.${y}`;
  }
  return value;
}

function formatRole(role) {
  if (role === 'admin') return 'Адміністратор';
  if (role === 'barista') return 'Бариста';
  if (role === 'customer') return 'Клієнт';
  return role || '—';
}

export default function StaffProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [errorText, setErrorText] = useState('');

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText('');

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData?.user?.id;
      if (!userId) {
        setProfile(null);
        setErrorText('Сесію не знайдено. Увійдіть ще раз.');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name,
          email,
          phone,
          birth_date,
          role,
          bean_balance,
          referral_code,
          is_active
        `)
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data || null);
    } catch (e) {
      setProfile(null);
      setErrorText(e?.message || 'Не вдалося завантажити профіль');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  async function handleLogout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/auth/login');
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося вийти з акаунта');
    }
  }

  function handleGuestMode() {
    router.replace('/menu');
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
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Профіль адміністратора</Text>
          <Text style={styles.heroText}>Керування акаунтом і перехід у режим гостя.</Text>
        </View>

        {!!errorText && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorText}</Text>
            <Pressable style={styles.retryButton} onPress={loadProfile}>
              <Text style={styles.retryButtonText}>Спробувати ще раз</Text>
            </Pressable>
          </View>
        )}

        {!errorText && profile && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Основна інформація</Text>

              <ProfileRow label="Ім’я" value={profile.first_name} />
              <ProfileRow label="Прізвище" value={profile.last_name} />
              <ProfileRow label="Email" value={profile.email} />
              <ProfileRow label="Телефон" value={profile.phone} />
              <ProfileRow label="Дата народження" value={formatBirthDate(profile.birth_date)} />
              <ProfileRow label="Роль" value={formatRole(profile.role)} />
              <ProfileRow label="Статус" value={profile.is_active ? 'Активний' : 'Неактивний'} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Баланс і рефералка</Text>

              <View style={styles.balanceBox}>
                <Text style={styles.balanceLabel}>Баланс зерен</Text>
                <Text style={styles.balanceValue}>{profile.bean_balance ?? 0}</Text>
              </View>

              <ProfileRow
                label="Реферальний код"
                value={profile.referral_code || 'Ще не згенеровано'}
              />
            </View>

            <Pressable style={styles.guestButton} onPress={handleGuestMode}>
              <Text style={styles.guestButtonText}>Режим гостя</Text>
            </Pressable>

            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Вийти з акаунта</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
    gap: 14,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
    borderWidth: 1,
    borderColor: colors.white08,
    padding: 18,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  heroText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: 'rgba(255,59,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.28)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  errorText: {
    color: colors.text,
    fontSize: 14,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: metrics.radiusLg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  infoRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
  },
  infoLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  infoValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  balanceBox: {
    backgroundColor: 'rgba(255,45,85,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.18)',
    borderRadius: 18,
    padding: 16,
    marginTop: 12,
    marginBottom: 14,
  },
  balanceLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    marginTop: 6,
  },
  guestButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestButtonText: {
    color: '#04120C',
    fontSize: 16,
    fontWeight: '800',
  },
  logoutButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
});