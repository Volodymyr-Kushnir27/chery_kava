import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import QRCode from "react-native-qrcode-svg";
import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";
import { getMyLoyaltySnapshot } from "../../src/services/loyaltyService";

function parseDailyVisitQr(rawValue) {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue);

    if (
      parsed?.type === "daily_visit" &&
      parsed?.code_value &&
      parsed?.location_id
    ) {
      return {
        code_value: parsed.code_value,
        location_id: parsed.location_id,
      };
    }
  } catch {}

  return null;
}

export default function LoyaltyScreen() {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");

  const [scannerOpen, setScannerOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getMyLoyaltySnapshot();
      setSnapshot(data);
    } catch (e) {
      setError(e?.message || "Не вдалося завантажити лояльність");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  async function handleOpenScanner() {
    if (!permission) return;

    if (!permission.granted) {
      const result = await requestPermission();

      if (!result.granted) {
        Alert.alert("Увага", "Потрібен доступ до камери для сканування QR.");
        return;
      }
    }

    setScannerOpen(true);
  }

  async function handleBarcodeScanned(result) {
    if (claiming) return;

    const payload = parseDailyVisitQr(result?.data);

    if (!payload) {
      Alert.alert("Помилка", "Це не QR коду дня.");
      return;
    }

    try {
      setClaiming(true);

      const { data, error: rpcError } = await supabase.rpc("claim_daily_visit", {
        code_value: payload.code_value,
        location_id: payload.location_id,
      });

      if (rpcError) throw rpcError;

      if (!data?.success) {
        Alert.alert("Увага", data?.message || "Не вдалося зарахувати візит");
        return;
      }

      Alert.alert("Готово", data.message || "Зараховано +1 зерно");
      setScannerOpen(false);
      await loadData();
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося обробити сканування");
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cherry} />
        </View>
      </SafeAreaView>
    );
  }

  const balance = snapshot?.balance || 0;
  const redeemable = snapshot?.redeemable || 0;
  const progressToNext = snapshot?.progressToNext || 0;
  const hasVisitedToday = !!snapshot?.hasVisitedToday;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Ваш QR-код</Text>
          <Text style={styles.heroText}>
            Ми завжди раді бачити вас у Cherry Kava. Завітайте, скануйте код і накопичуйте зерна.
          </Text>
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.statusCard}>
          <Text style={styles.statusEmoji}>{hasVisitedToday ? "☕️😊" : "☕️😕"}</Text>
          <Text style={styles.statusTitle}>
            {hasVisitedToday
              ? "Ви сьогодні вже завітали до нас"
              : "Ви сьогодні ще не завітали до нас"}
          </Text>
          <Text style={styles.statusText}>
            {hasVisitedToday
              ? "Скан за сьогодні вже зарахований. Дякуємо, що завітали."
              : "Приходьте до нас та скануйте код дня, щоб отримати зерно."}
          </Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleOpenScanner}>
          <Text style={styles.primaryButtonText}>Сканувати код</Text>
        </Pressable>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Ваш баланс</Text>
          <Text style={styles.balanceValue}>{balance} зерен</Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Доступно для списання</Text>
              <Text style={styles.statValue}>{redeemable}</Text>
            </View>

            <View style={styles.statBox}>
              <Text style={styles.statLabel}>До наступних 10</Text>
              <Text style={styles.statValue}>{progressToNext} / 10</Text>
            </View>
          </View>

          <View style={styles.beansRow}>
            {Array.from({ length: 10 }).map((_, index) => {
              const active = index < progressToNext;
              return (
                <Text key={index} style={[styles.beanIcon, !active && styles.beanInactive]}>
                  🫘
                </Text>
              );
            })}
          </View>

          <Text style={styles.balanceHint}>
            Зерна накопичуються як валюта. Списання можливе по 10, 20, 30, 40... до 100 зерен.
          </Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrBox}>
            {snapshot?.qrValue ? (
              <QRCode
                value={snapshot.qrValue}
                size={180}
                backgroundColor="white"
                color="black"
              />
            ) : (
              <Text style={styles.qrFallback}>QR</Text>
            )}
          </View>

          <Text style={styles.qrHint}>
            Покажіть цей код бариста для списання зерен або ідентифікації клієнта.
          </Text>
        </View>

        <Pressable
          style={styles.secondaryButton}
          onPress={() =>
            Alert.alert(
              "Інформація",
              "Списання виконує бариста або адміністратор через staff/redeem.",
            )
          }
        >
          <Text style={styles.secondaryButtonText}>Списати зерна</Text>
        </Pressable>
      </ScrollView>

      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Сканування коду дня</Text>

            <Pressable style={styles.closeBtn} onPress={() => setScannerOpen(false)}>
              <Text style={styles.closeBtnText}>Закрити</Text>
            </Pressable>
          </View>

          {!permission ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={colors.cherry} />
            </View>
          ) : !permission.granted ? (
            <View style={styles.center}>
              <Text style={styles.statusText}>Потрібен доступ до камери</Text>
              <Pressable style={styles.primaryButton} onPress={requestPermission}>
                <Text style={styles.primaryButtonText}>Надати доступ</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          )}

          {claiming && (
            <View style={styles.claimingOverlay}>
              <ActivityIndicator size="large" color={colors.green} />
              <Text style={styles.claimingText}>Обробка сканування...</Text>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    padding: 24,
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
    gap: 16,
  },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.white08,
    padding: 18,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  heroText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: "rgba(255,59,48,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.25)",
    borderRadius: 16,
    padding: 14,
  },
  errorText: {
    color: colors.text,
    fontSize: 14,
  },
  statusCard: {
    backgroundColor: colors.card2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
  },
  statusEmoji: {
    fontSize: 38,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 8,
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
  },
  balanceCard: {
    backgroundColor: "rgba(255,45,85,0.08)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,45,85,0.22)",
    padding: 18,
  },
  balanceLabel: {
    color: colors.textSoft,
    fontSize: 14,
  },
  balanceValue: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "900",
    marginTop: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 6,
  },
  beansRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
    flexWrap: "wrap",
  },
  beanIcon: {
    fontSize: 18,
  },
  beanInactive: {
    opacity: 0.2,
  },
  balanceHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
    textAlign: "center",
  },
  qrCard: {
    backgroundColor: colors.card2,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: "center",
  },
  qrBox: {
    width: 220,
    height: 220,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  qrFallback: {
    fontSize: 56,
    fontWeight: "900",
    color: "#000",
  },
  qrHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 14,
  },
  primaryButton: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  primaryButtonText: {
    color: "#04120C",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: metrics.screenPadding,
    paddingTop: 8,
    paddingBottom: 12,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  closeBtn: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  camera: {
    flex: 1,
  },
  claimingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  claimingText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});