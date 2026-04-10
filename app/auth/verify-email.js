import { useState } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { resendVerification } from '../../src/services/authService';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams();
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    if (!email) {
      Alert.alert('Помилка', 'Email не знайдено');
      return;
    }

    try {
      setLoading(true);

      const { error } = await resendVerification(String(email));

      if (error) {
        Alert.alert('Помилка', error.message);
        return;
      }

      Alert.alert('Готово', 'Лист відправлено повторно');
    } catch (e) {
      Alert.alert('Помилка', e.message || 'Щось пішло не так');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Підтвердження пошти</Text>

        <Text style={styles.text}>Ми надіслали лист на:</Text>
        <Text style={styles.email}>{email || 'невідомо'}</Text>
        <Text style={styles.text}>Підтверди email, після цього увійди в додаток.</Text>

        <Pressable style={styles.button} onPress={handleResend} disabled={loading}>
          <Text style={styles.buttonText}>
            {loading ? 'Відправка...' : 'Надіслати лист ще раз'}
          </Text>
        </Pressable>

        <Pressable onPress={() => router.replace('/auth/login')}>
          <Text style={styles.link}>Повернутись до входу</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20, justifyContent: 'center', gap: 12 },
  title: { fontSize: 28, fontWeight: '700' },
  text: { fontSize: 16, color: '#444' },
  email: { fontSize: 18, fontWeight: '700', color: '#2b2118' },
  button: {
    backgroundColor: '#2b2118',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { textAlign: 'center', marginTop: 10, color: '#6b4f3a', fontSize: 15 },
});