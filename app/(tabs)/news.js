import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, metrics } from '../../src/constants/theme';

const newsItems = [
  {
    title: 'Cherry Latte вже в меню',
    text: 'Новий сезонний напій з акцентом на вишню та м’яку молочну текстуру.',
  },
  {
    title: 'Подвійні зерна за реферала',
    text: 'Запроси друга, після першого скану отримаєш +2 зерна.',
  },
  {
    title: 'Щоденний QR',
    text: 'Скануй код дня в закладі та отримуй бонус за кожен візит.',
  },
];

export default function NewsScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Новини</Text>
          <Text style={styles.heroText}>Акції, новинки та сезонні пропозиції.</Text>
        </View>

        {newsItems.map((item, index) => (
          <View key={index} style={styles.card}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardText}>{item.text}</Text>
          </View>
        ))}
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
  card: {
    backgroundColor: colors.card2,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardText: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
});