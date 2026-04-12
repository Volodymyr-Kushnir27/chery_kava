import { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { resendVerification } from '../../src/services/authService';
import { colors, metrics } from '../../src/constants/theme';
import AuthTopBar from '../../src/components/AuthTopBar';

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
        Alert.alert('Помилка', error.message || 'Не вдалося відправити лист');
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
        <AuthTopBar />

        <View style={styles.card}>
          <Text style={styles.title}>Підтвердження пошти</Text>

          <Text style={styles.text}>Ми надіслали лист на:</Text>
          <Text style={styles.email}>{email || 'невідомо'}</Text>

          <Text style={styles.text}>
            Підтверди email, після цього увійди в додаток.
          </Text>

          <Pressable style={styles.button} onPress={handleResend} disabled={loading}>
            <Text style={styles.buttonText}>
              {loading ? 'Відправка...' : 'Надіслати лист ще раз'}
            </Text>
          </Pressable>

          <Pressable onPress={() => router.replace('/auth/login')}>
            <Text style={styles.link}>Повернутись до входу</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    padding: metrics.screenPadding,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.white08,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
  },
  text: {
    color: colors.textSoft,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  email: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  link: {
    textAlign: 'center',
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 16,
  },
});