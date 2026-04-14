import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

function formatDate(value) {
  if (!value) return '';

  try {
    return new Date(value).toLocaleDateString('uk-UA');
  } catch {
    return value;
  }
}

export default function NewsScreen() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  const loadNews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error } = await supabase
        .from('news_posts')
        .select('id, title, body, image_url, published_at, created_at')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      setItems(data || []);
    } catch (e) {
      setError(e?.message || 'Не вдалося завантажити новини');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNews();
    }, [loadNews])
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
          <Text style={styles.heroTitle}>Новини</Text>
          <Text style={styles.heroText}>Акції, новинки та сезонні пропозиції.</Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retryButton} onPress={loadNews}>
              <Text style={styles.retryButtonText}>Спробувати ще раз</Text>
            </Pressable>
          </View>
        )}

        {!error && items.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Новин поки немає</Text>
            <Text style={styles.emptyText}>Коли адміністратор опублікує новини, вони з’являться тут.</Text>
          </View>
        )}

        {!error &&
          items.map((item) => (
            <View key={item.id} style={styles.card}>
              {!!item.image_url && (
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>

                {!!item.published_at && (
                  <Text style={styles.dateText}>{formatDate(item.published_at)}</Text>
                )}

                <Text style={styles.cardText}>{item.body || ''}</Text>
              </View>
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
    gap: 14,
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
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 200,
    backgroundColor: colors.bgSoft,
  },
  cardBody: {
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  dateText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  cardText: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
});