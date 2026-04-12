import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../constants/theme';

export default function AuthTopBar() {
  return (
    <View style={styles.wrap}>
      <View style={styles.leftSpacer} />

      <Text style={styles.title}>Твоя кава — твій баланс</Text>

      <Image
        source={require('../../assets/images/Logo1.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  leftSpacer: {
    width: 36,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  logo: {
    width: 36,
    height: 36,
  },
});