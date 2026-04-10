import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function LoyaltyScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Лояльність</Text>
        <Text style={styles.text}>10 зерен = 1 чашка кави</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { marginTop: 8, fontSize: 16 },
});