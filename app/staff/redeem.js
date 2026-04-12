import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";

const AMOUNTS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function parseCustomerQr(rawValue) {
  if (!rawValue) return null;

  try {
    if (rawValue.startsWith("customer:")) {
      const userId = rawValue.replace("customer:", "").trim();
      return { customerId: userId };
    }

    const parsed = JSON.parse(rawValue);

    if (parsed?.type === "customer" && parsed?.customer_id) {
      return { customerId: parsed.customer_id };
    }
  } catch {}

  return null;
}

export default function RedeemScreen() {
  const [loading, setLoading] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [staffId, setStaffId] = useState(null);

  const [selectedAmount, setSelectedAmount] = useState(10);
  const [scannedValue, setScannedValue] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [customerProfile, setCustomerProfile] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    bootstrap();
  }, []);

  const parsedCustomer = useMemo(() => parseCustomerQr(scannedValue), [scannedValue]);

  useEffect(() => {
    if (parsedCustomer?.customerId) {
      setCustomerId(parsedCustomer.customerId);
      loadCustomer(parsedCustomer.customerId);
    }
  }, [parsedCustomer]);

  async function bootstrap() {
    try {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setIsStaff(false);
        return;
      }

      setStaffId(userId);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      setIsStaff(["barista", "admin"].includes(profile?.role));
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося перевірити доступ");
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomer(id) {
    if (!id) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, bean_balance, email")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      setCustomerProfile(data || null);
    } catch (e) {
      setCustomerProfile(null);
    }
  }

  async function handleManualLookup() {
    if (!customerId.trim()) {
      Alert.alert("Увага", "Вкажіть customer id або відскануйте QR");
      return;
    }

    await loadCustomer(customerId.trim());
  }

  async function handleRedeem() {
    if (!staffId) {
      Alert.alert("Помилка", "Не знайдено staff id");
      return;
    }

    if (!customerId) {
      Alert.alert("Увага", "Спочатку відскануйте QR клієнта");
      return;
    }

    try {
      setRedeeming(true);

      const { data, error } = await supabase.rpc("redeem_beans", {
        customer_id: customerId,
        amount: selectedAmount,
        staff_id: staffId,
      });

      if (error) throw error;

      if (!data?.success) {
        Alert.alert("Увага", data?.message || "Списання не виконано");
        return;
      }

      Alert.alert(
        "Готово",
        `${data.message}\nСписано: ${data.amount}\nНовий баланс: ${data.balance}`,
      );

      await loadCustomer(customerId);
      setScannedValue("");
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося списати зерна");
    } finally {
      setRedeeming(false);
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

  if (!isStaff) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Списання зерен</Text>
          <Text style={styles.text}>Доступ лише для бариста або адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Списання зерен</Text>
        <Text style={styles.text}>
          Відскануйте QR клієнта та виберіть суму списання від 10 до 100 зерен.
        </Text>

        {!permission ? (
          <View style={styles.card}>
            <ActivityIndicator size="small" color={colors.cherry} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.card}>
            <Text style={styles.cardText}>Потрібен доступ до камери.</Text>
            <Pressable style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Надати доступ</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraCard}>
            <CameraView
              style={styles.camera}
              barcodeScannerSettings={{
                barcodeTypes: ["qr"],
              }}
              onBarcodeScanned={(result) => {
                if (!scannedValue && result?.data) {
                  setScannedValue(result.data);
                }
              }}
            />
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Сканований QR</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={scannedValue}
            onChangeText={setScannedValue}
            placeholder="customer:uuid або JSON з QR"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <Text style={styles.label}>Customer ID</Text>
          <TextInput
            style={styles.input}
            value={customerId}
            onChangeText={setCustomerId}
            placeholder="UUID клієнта"
            placeholderTextColor={colors.textMuted}
          />

          <Pressable style={styles.secondaryButton} onPress={handleManualLookup}>
            <Text style={styles.secondaryButtonText}>Знайти клієнта</Text>
          </Pressable>
        </View>

        {customerProfile && (
          <View style={styles.card}>
            <Text style={styles.customerTitle}>
              {customerProfile.first_name || "Клієнт"} {customerProfile.last_name || ""}
            </Text>
            <Text style={styles.cardText}>Баланс: {customerProfile.bean_balance || 0} зерен</Text>
            {!!customerProfile.email && (
              <Text style={styles.cardText}>Email: {customerProfile.email}</Text>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>Сума списання</Text>

          <View style={styles.amountsWrap}>
            {AMOUNTS.map((amount) => {
              const active = selectedAmount === amount;

              return (
                <Pressable
                  key={amount}
                  style={[styles.amountChip, active && styles.amountChipActive]}
                  onPress={() => setSelectedAmount(amount)}
                >
                  <Text style={[styles.amountChipText, active && styles.amountChipTextActive]}>
                    {amount}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={[styles.primaryButton, redeeming && { opacity: 0.7 }]}
            onPress={handleRedeem}
            disabled={redeeming}
          >
            <Text style={styles.primaryButtonText}>
              {redeeming ? "Списання..." : `Списати ${selectedAmount} зерен`}
            </Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => {
              setScannedValue("");
              setCustomerId("");
              setCustomerProfile(null);
            }}
          >
            <Text style={styles.secondaryButtonText}>Очистити</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cameraCard: {
    overflow: "hidden",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
  },
  camera: {
    width: "100%",
    height: 320,
  },
  cardText: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  textarea: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: "top",
    marginBottom: 12,
  },
  customerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  amountsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  amountChip: {
    minWidth: 64,
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  amountChipActive: {
    backgroundColor: "rgba(255,45,85,0.10)",
    borderColor: colors.cherry,
  },
  amountChipText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  amountChipTextActive: {
    color: colors.cherry,
  },
  primaryButton: {
    marginTop: 16,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#04120C",
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    marginTop: 12,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
});