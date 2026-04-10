import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { logoutUser } from '../../src/services/authService';
import { router } from 'expo-router';

export default function ProfileScreen() {
  async function handleLogout() {
    const { error } = await logoutUser();

    if (error) {
      Alert.alert('Помилка', error.message);
      return;
    }

    router.replace('/auth/login');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Профіль</Text>

        <Pressable style={styles.button} onPress={handleLogout}>
          <Text style={styles.buttonText}>Вийти</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: '700' },
  button: {
    marginTop: 20,
    backgroundColor: '#2b2118',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});