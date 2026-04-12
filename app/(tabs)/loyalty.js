import { Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, metrics } from '../../src/constants/theme';

export default function LoyaltyScreen() {
  const balance = 7;
  const goal = 10;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.brandBlock}>
          <Text style={styles.brandLine}>CHERRY KAVA</Text>
          <Text style={styles.brandTagline}>Твоя кава — твій баланс</Text>
        </View>

        <View style={styles.qrFrame}>
          <View style={styles.qrCard}>
            <View style={styles.qrMock}>
              <Text style={styles.qrText}>QR</Text>
            </View>

            <View style={styles.balanceBlock}>
              <Text style={styles.balanceText}>
                Баланс: {balance} / {goal} збобів
              </Text>

              <View style={styles.beansRow}>
                {Array.from({ length: goal }).map((_, index) => {
                  const active = index < balance;

                  return (
                    <Image
                      key={index}
                      source={require('../../assets/images/Zerno.png')}
                      style={[styles.beanImg, !active && styles.beanInactive]}
                      resizeMode="contain"
                    />
                  );
                })}
              </View>
            </View>
          </View>
        </View>

        <Pressable style={styles.scanButton}>
          <Text style={styles.scanButtonText}>SCAN</Text>
        </Pressable>
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
    gap: 22,
  },

  brandBlock: {
    alignItems: 'center',
    marginTop: 2,
  },

  brandLine: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 2,
  },

  brandTagline: {
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 6,
    fontWeight: '500',
  },

  qrFrame: {
    borderRadius: 28,
    padding: 2,
    backgroundColor: 'transparent',
    shadowColor: '#FF2D55',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  qrCard: {
    backgroundColor: colors.card,
    borderRadius: 26,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.10)',
  },

  qrMock: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#141B2D',
  },

  qrText: {
    color: colors.text,
    fontSize: 58,
    fontWeight: '900',
    letterSpacing: 4,
  },

  balanceBlock: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },

  balanceText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },

  beansRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    flexWrap: 'wrap',
  },

  beanImg: {
    width: 23,
    height: 23,
  },

  beanInactive: {
    opacity: 0.28,
  },

  scanButton: {
    minHeight: 64,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.green,
    backgroundColor: 'rgba(54,243,162,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#36F3A2',
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  scanButtonText: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
});