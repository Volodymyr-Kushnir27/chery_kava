import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';
import { getLocations } from '../../src/services/menuService';

export default function DailyCodeScreen() {
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [dailyCode, setDailyCode] = useState(null);

  useEffect(() => {
    bootstrap();
  }, []);

  const loadDailyCode = useCallback(async (locationId) => {
    if (!locationId) return;

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('get_or_create_daily_code', {
        location_id: locationId,
      });

      if (error) throw error;
      setDailyCode(data || null);
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося отримати код дня');
    } finally {
      setLoading(false);
    }
  }, []);

  async function bootstrap() {
    try {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setIsStaff(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const allowed = ['barista', 'admin'].includes(profile?.role);
      setIsStaff(allowed);

      if (!allowed) return;

      const locationList = await getLocations();
      setLocations(locationList || []);

      const firstLocation = locationList?.[0] || null;
      setSelectedLocation(firstLocation);

      if (firstLocation?.id) {
        await loadDailyCode(firstLocation.id);
      }
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося підготувати екран');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectLocation(location) {
    setSelectedLocation(location);
    await loadDailyCode(location.id);
  }

  if (loading && !dailyCode) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cherry} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isStaff) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>QR дня</Text>
          <Text style={styles.text}>Доступ лише для бариста або адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const qrPayload =
    dailyCode && selectedLocation
      ? JSON.stringify({
          type: 'daily_visit',
          code_value: dailyCode.code_value,
          location_id: selectedLocation.id,
          date: dailyCode.code_date,
        })
      : '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>QR дня</Text>
        <Text style={styles.text}>
          Покажіть цей QR клієнту. Після сканування він отримає +1 зерно за візит.
        </Text>

        <View style={styles.locationsRow}>
          {locations.map((location) => {
            const active = selectedLocation?.id === location.id;

            return (
              <Pressable
                key={location.id}
                style={[styles.locationButton, active && styles.locationButtonActive]}
                onPress={() => handleSelectLocation(location)}
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    active && styles.locationButtonTextActive,
                  ]}
                >
                  {location.short_title || location.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <View style={styles.qrBox}>
            {qrPayload ? (
              <QRCode value={qrPayload} size={220} backgroundColor="#fff" color="#000" />
            ) : (
              <Text style={styles.qrFallback}>QR</Text>
            )}
          </View>

          <Text style={styles.codeLabel}>Текстовий код</Text>
          <Text style={styles.codeValue}>{dailyCode?.code_value || '—'}</Text>

          <Text style={styles.metaText}>Локація: {selectedLocation?.title || '—'}</Text>
          <Text style={styles.metaText}>Дата: {dailyCode?.code_date || '—'}</Text>
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => loadDailyCode(selectedLocation?.id)}
        >
          <Text style={styles.primaryButtonText}>Оновити код дня</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => router.push('/staff/redeem')}
        >
          <Text style={styles.secondaryButtonText}>Списання балів</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  locationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 18,
  },
  locationButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonActive: {
    backgroundColor: 'rgba(255,45,85,0.10)',
    borderColor: colors.cherry,
  },
  locationButtonText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  locationButtonTextActive: {
    color: colors.cherry,
  },
  card: {
    marginTop: 18,
    backgroundColor: colors.card2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
  },
  qrBox: {
    width: 260,
    height: 260,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrFallback: {
    color: '#000',
    fontSize: 56,
    fontWeight: '900',
  },
  codeLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 16,
  },
  codeValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    marginTop: 4,
    textAlign: 'center',
  },
  metaText: {
    color: colors.textSoft,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#04120C',
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
});