import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, metrics } from '../../src/constants/theme';

const categories = [
  {
    title: 'Класична кава',
    subtitle: 'Базові позиції щодня',
    items: [
      { name: 'Еспресо', desc: 'Насичений короткий шот', price: '45 грн' },
      { name: 'Американо', desc: 'Еспресо + гаряча вода', price: '55 грн' },
      { name: 'Капучино', desc: 'Баланс кави та молока', price: '70 грн' },
      { name: 'Лате', desc: 'М’яка молочна текстура', price: '80 грн' },
    ],
  },
  {
    title: 'Авторські напої',
    subtitle: 'Фірмові смаки Cherry Kava',
    items: [
      { name: 'Cherry Latte', desc: 'Вишневий акцент та кремова піна', price: '95 грн' },
      { name: 'Cold Brew Cherry', desc: 'Холодний напій з фруктовим профілем', price: '105 грн' },
    ],
  },
];

export default function MenuScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Меню</Text>
          <Text style={styles.heroText}>
            Напої, категорії та швидкий перегляд цін у hi-tech стилі.
          </Text>
        </View>

        {categories.map((category) => (
          <View key={category.title} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{category.title}</Text>
              <Text style={styles.sectionSub}>{category.subtitle}</Text>
            </View>

            {category.items.map((item) => (
              <View key={item.name} style={styles.card}>
                <View style={styles.cardLeft}>
                  <View style={styles.dot} />
                  <View>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDesc}>{item.desc}</Text>
                  </View>
                </View>

                <View style={styles.priceBadge}>
                  <Text style={styles.priceText}>{item.price}</Text>
                </View>
              </View>
            ))}
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
    gap: 18,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.white08,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  heroText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  section: {
    gap: 10,
  },
  sectionHead: {
    marginTop: 4,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  sectionSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.cherry,
  },
  itemName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },
  itemDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  priceBadge: {
    backgroundColor: 'rgba(54,243,162,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(54,243,162,0.30)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  priceText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '800',
  },
});