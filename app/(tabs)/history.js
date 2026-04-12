import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, metrics } from '../../src/constants/theme';

const transactions = [
  { title: '+1 зерно', type: 'Скан в кав’ярні', date: '11.04.2026', accent: colors.green },
  { title: '+2 зерна', type: 'Реферальний бонус', date: '09.04.2026', accent: colors.blue },
  { title: '-10 зерен', type: 'Обмін на напій', date: '05.04.2026', accent: colors.cherry },
];

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Історія бонусів</Text>
          <Text style={styles.heroText}>Всі нарахування та списання зерен.</Text>
        </View>

        {transactions.map((item, index) => (
          <View key={index} style={styles.card}>
            <View style={[styles.dot, { backgroundColor: item.accent }]} />
            <View style={styles.content}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.type}>{item.type}</Text>
            </View>
            <Text style={styles.date}>{item.date}</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
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
  date: {
    color: colors.textSoft,
    fontSize: 12,
  },
});