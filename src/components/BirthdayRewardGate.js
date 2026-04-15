import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getBirthdayRewardStatus, claimBirthdayReward } from '../services/birthdayService';
import { colors } from '../constants/theme';

export default function BirthdayRewardGate() {
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    checkBirthdayReward();
  }, []);

  useFocusEffect(
    useCallback(() => {
      checkBirthdayReward();
    }, [])
  );

  async function checkBirthdayReward() {
    try {
      setLoading(true);

      const status = await getBirthdayRewardStatus();

      if (status?.success && status?.eligible) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    } catch {
      setVisible(false);
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    try {
      setClaiming(true);

      const result = await claimBirthdayReward();

      if (!result?.success) {
        setVisible(false);
        return;
      }

      setVisible(false);
    } catch {
      setVisible(false);
    } finally {
      setClaiming(false);
    }
  }

  if (loading) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>🎉 З Днем народження!</Text>
          <Text style={styles.text}>
            Вітаємо з Днем народження та даруємо вам 10 зерен
          </Text>

          <Pressable
            style={[styles.button, claiming && styles.buttonDisabled]}
            onPress={handleClaim}
            disabled={claiming}
          >
            {claiming ? (
              <ActivityIndicator color="#04120C" />
            ) : (
              <Text style={styles.buttonText}>Прийняти</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 22,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  text: {
    color: colors.textSoft,
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
  },
  button: {
    marginTop: 20,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#04120C',
    fontSize: 16,
    fontWeight: '800',
  },
});