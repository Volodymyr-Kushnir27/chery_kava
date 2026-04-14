import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';

function formatDateTime(value) {
  if (!value) return '—';

  try {
    return new Date(value).toLocaleString('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function getAccent(item) {
  if (item.direction === 'credit') return colors.green;
  return colors.cherry;
}

function getTitle(item) {
  const sign = item.direction === 'credit' ? '+' : '-';
  return `${sign}${item.amount} зерен`;
}

function getTypeLabel(item) {
  switch (item.tx_type) {
    case 'scan':
      return 'Скан у кав’ярні';
    case 'referral':
      return 'Реферальний бонус';
    case 'redeem':
      return 'Списання на касі';
    case 'manual_add':
      return 'Ручне нарахування';
    case 'manual_subtract':
      return 'Ручне списання';
    case 'birthday_reward':
      return 'Бонус до дня народження';
    case 'welcome_bonus':
      return 'Стартовий бонус';
    default:
      return item.description || 'Операція';
  }
}

export default function HistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const userId = authData?.user?.id;
      if (!userId) {
        setItems([]);
        return;
      }

      const { data, error } = await supabase
        .from('bean_transactions')
        .select('id, tx_type, amount, direction, balance_after, description, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (e) {
      setError(e?.message || 'Не вдалося завантажити історію');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

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
          <Text style={styles.heroTitle}>Історія бонусів</Text>
          <Text style={styles.heroText}>Всі нарахування та списання зерен.</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={loadHistory}>
              <Text style={styles.retryBtnText}>Спробувати ще раз</Text>
            </Pressable>
          </View>
        )}

        {!error && items.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Історія порожня</Text>
            <Text style={styles.emptyText}>Ще немає жодних операцій по зернах.</Text>
          </View>
        )}

        {!error &&
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={[styles.dot, { backgroundColor: getAccent(item) }]} />

              <View style={styles.content}>
                <Text style={styles.title}>{getTitle(item)}</Text>
                <Text style={styles.type}>{getTypeLabel(item)}</Text>
                {!!item.description && <Text style={styles.desc}>{item.description}</Text>}
                <Text style={styles.balanceAfter}>Баланс після операції: {item.balance_after}</Text>
              </View>

              <Text style={styles.date}>{formatDateTime(item.created_at)}</Text>
            </View>
          ))}
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
    gap: 12,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
    borderWidth: 1,
    borderColor: colors.white08,
    padding: 18,
    marginBottom: 4,
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
  retryBtn: {
    alignSelf: 'flex-start',
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 13,
  },
  emptyBox: {
    backgroundColor: colors.card2,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    marginTop: 6,
  },
  content: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  type: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  desc: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 4,
  },
  balanceAfter: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 6,
  },
  date: {
    color: colors.textSoft,
    fontSize: 12,
    maxWidth: 92,
    textAlign: 'right',
  },
});