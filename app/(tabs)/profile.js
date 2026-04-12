import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ConfettiCannon from "react-native-confetti-cannon";
import { useFocusEffect, router } from "expo-router";
import { logoutUser } from "../../src/services/authService";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";
import {
  checkAndPrepareReward,
  formatMembershipDuration,
  formatUkDate,
} from "../../src/utils/rewardChecks";

export default function ProfileScreen() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [refStats, setRefStats] = useState({
    invited: 0,
    activated: 0,
  });

  const [rewardModal, setRewardModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
  });

  const [errors, setErrors] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    birth_date: "",
  });

  const membershipText = useMemo(() => {
    return formatMembershipDuration(profile?.created_at);
  }, [profile?.created_at]);

  const canEditBirthDate = !profile?.birth_date;

  const loadProfileSilently = useCallback(async (userId) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select(
          "id, email, phone, first_name, last_name, role, bean_balance, referral_code, referred_by_user_id, referral_activated, birth_date, is_active, created_at",
        )
        .eq("id", userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
        setForm((prev) => ({
          ...prev,
          birth_date: data.birth_date || prev.birth_date || "",
        }));
      }
    } catch (e) {
      console.log("silent profile reload error:", e?.message);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);

      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError) {
        Alert.alert(
          "Помилка",
          userError.message || "Не вдалося отримати користувача",
        );
        return;
      }

      const userId = userData?.user?.id;

      if (!userId) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, email, phone, first_name, last_name, role, bean_balance, referral_code, referred_by_user_id, referral_activated, birth_date, is_active, created_at",
        )
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        Alert.alert(
          "Помилка",
          error.message || "Не вдалося завантажити профіль",
        );
        return;
      }

      setProfile(data || null);
      setForm({
        first_name: data?.first_name || "",
        last_name: data?.last_name || "",
        phone: data?.phone || "",
        birth_date: data?.birth_date
          ? formatBirthDateForInput(data.birth_date)
          : "",
      });

      setErrors({
        first_name: "",
        last_name: "",
        phone: "",
        birth_date: "",
      });

      const { count: invitedCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_user_id", userId);

      const { count: activatedCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("referred_by_user_id", userId)
        .eq("referral_activated", true);

      setRefStats({
        invited: invitedCount || 0,
        activated: activatedCount || 0,
      });

      if (data) {
        const rewardResult = await checkAndPrepareReward({
          supabase,
          profile: data,
        });

        if (rewardResult?.shouldShowModal) {
          setRewardModal({
            visible: true,
            title: rewardResult.title,
            message: rewardResult.message,
          });

          if (rewardResult.updatedProfile) {
            setProfile(rewardResult.updatedProfile);
          } else {
            await loadProfileSilently(userId);
          }
        }
      }
    } catch (e) {
      Alert.alert("Помилка", e.message || "Щось пішло не так");
    } finally {
      setLoading(false);
    }
  }, [loadProfileSilently]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  }

  function validateForm() {
    const nextErrors = {
      first_name: "",
      last_name: "",
      phone: "",
      birth_date: "",
    };

    const firstName = form.first_name.trim();
    const lastName = form.last_name.trim();

    if (!firstName) {
      nextErrors.first_name = "Введіть ім'я";
    }

    if (!lastName) {
      nextErrors.last_name = "Введіть прізвище";
    }

    const normalizedPhone = normalizeUAPhoneFlexible(form.phone);

    if (!form.phone.trim()) {
      nextErrors.phone = "Введіть номер телефону";
    } else if (!normalizedPhone) {
      nextErrors.phone = "Формат: +380XXXXXXXXX або 0XXXXXXXXX";
    }

    let normalizedBirthDate = null;

    if (canEditBirthDate && form.birth_date.trim()) {
      normalizedBirthDate = normalizeBirthDateInput(form.birth_date);

      if (!normalizedBirthDate) {
        nextErrors.birth_date = 'Введіть дату у форматі ДД.ММ.РРРР';
      }
    }

    setErrors(nextErrors);

    return {
      isValid: Object.values(nextErrors).every((v) => !v),
      normalizedPhone,
      normalizedBirthDate,
    };
  }

  async function handleSave() {
    if (!profile?.id) return;

    const { isValid, normalizedPhone, normalizedBirthDate } = validateForm();

    if (!isValid) return;

    try {
      setSaving(true);

      const updatePayload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        phone: normalizedPhone,
      };

      if (canEditBirthDate && normalizedBirthDate) {
        updatePayload.birth_date = normalizedBirthDate;
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", profile.id);

      if (error) {
        Alert.alert("Помилка", error.message || "Не вдалося зберегти зміни");
        return;
      }

      Alert.alert("Готово", "Профіль оновлено");
      setEditing(false);
      await loadProfile();
    } catch (e) {
      Alert.alert("Помилка", e.message || "Щось пішло не так");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    const { error } = await logoutUser();

    if (error) {
      Alert.alert("Помилка", error.message);
      return;
    }

    router.replace("/auth/login");
  }

  function formatRole(role) {
    if (role === "admin") return "Адміністратор";
    if (role === "barista") return "Бариста";
    return "Користувач";
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.cherry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Профіль</Text>
          <Text style={styles.heroText}>
            Акаунт, баланс і реферальна інформація.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Основна інформація</Text>

            {!editing ? (
              <Pressable
                style={styles.editBtn}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editBtnText}>Редагувати</Text>
              </Pressable>
            ) : (
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setEditing(false);
                  setForm({
                    first_name: profile?.first_name || "",
                    last_name: profile?.last_name || "",
                    phone: profile?.phone || "",
                    birth_date: profile?.birth_date
                      ? formatBirthDateForInput(profile.birth_date)
                      : "",
                  });
                  setErrors({
                    first_name: "",
                    last_name: "",
                    phone: "",
                    birth_date: "",
                  });
                }}
              >
                <Text style={styles.cancelBtnText}>Скасувати</Text>
              </Pressable>
            )}
          </View>

          {editing ? (
            <>
              <InputRow
                label="Ім’я"
                value={form.first_name}
                onChangeText={(value) => updateField("first_name", value)}
                error={errors.first_name}
              />

              <InputRow
                label="Прізвище"
                value={form.last_name}
                onChangeText={(value) => updateField("last_name", value)}
                error={errors.last_name}
              />

              <InputRow
                label="Телефон"
                value={form.phone}
                onChangeText={(value) => updateField("phone", value)}
                keyboardType="phone-pad"
                placeholder="+380XXXXXXXXX або 0XXXXXXXXX"
                error={errors.phone}
              />

              <InputRow
                label="Дата народження"
                value={form.birth_date}
                onChangeText={(value) => {
                  if (!canEditBirthDate) return;
                  updateField("birth_date", formatBirthDateMasked(value));
                }}
                placeholder="27.07.1996"
                editable={canEditBirthDate}
                keyboardType="number-pad"
                error={errors.birth_date}
              />

              {!canEditBirthDate && (
                <Text style={styles.lockedHint}>
                  Дату народження можна вказати лише один раз.
                </Text>
              )}

              <Pressable
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>
                  {saving ? "Збереження..." : "Зберегти"}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <ProfileRow label="Ім’я" value={profile?.first_name || "—"} />
              <ProfileRow label="Прізвище" value={profile?.last_name || "—"} />
              <ProfileRow label="Email" value={profile?.email || "—"} />
              <ProfileRow label="Телефон" value={profile?.phone || "—"} />
              <ProfileRow
                label="Дата народження"
                value={
                  profile?.birth_date ? formatUkDate(profile.birth_date) : "—"
                }
              />
              <ProfileRow label="Роль" value={formatRole(profile?.role)} />
              <ProfileRow
                label="Статус"
                value={profile?.is_active ? "Активний" : "Неактивний"}
              />
            </>
          )}
        </View>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Баланс зерен</Text>

          <View style={styles.balanceRow}>
            <Image
              source={require("../../assets/images/Zerno.png")}
              style={styles.balanceIcon}
              resizeMode="contain"
            />
            <Text style={styles.balanceValue}>
              {profile?.bean_balance ?? 0}
            </Text>
          </View>

          <Text style={styles.balanceHint}>10 зерен = 1 чашка кави</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Реферальна інформація</Text>

          <ProfileRow
            label="Реферальний код"
            value={profile?.referral_code || "—"}
          />
          <ProfileRow
            label="Ви залучили"
            value={`${refStats.invited} ${declOfNum(refStats.invited, ["друга", "друзі", "друзів"])}`}
          />
          <ProfileRow
            label="Активовано"
            value={`${refStats.activated} ${declOfNum(refStats.activated, ["реферала", "реферали", "рефералів"])}`}
          />
          <ProfileRow
            label="Створено"
            value={
              profile?.created_at
                ? `${formatUkDate(profile.created_at)} · ${membershipText}`
                : "—"
            }
          />
        </View>

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Вийти</Text>
        </Pressable>
      </ScrollView>

      <Modal
        transparent
        visible={rewardModal.visible}
        animationType="fade"
        onRequestClose={() =>
          setRewardModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View style={styles.modalOverlay}>
          {rewardModal.visible && (
            <ConfettiCannon
              count={120}
              origin={{ x: 180, y: 0 }}
              fadeOut
              autoStart
            />
          )}

          <View style={styles.modalCard}>
            <Image
              source={require("../../assets/images/Zerno.png")}
              style={styles.rewardBeanImage}
              resizeMode="contain"
            />

            <Text style={styles.modalTitle}>{rewardModal.title}</Text>
            <Text style={styles.modalText}>{rewardModal.message}</Text>

            <Pressable
              style={styles.modalBtn}
              onPress={() =>
                setRewardModal((prev) => ({ ...prev, visible: false }))
              }
            >
              <Text style={styles.modalBtnText}>Супер</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function ProfileRow({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function InputRow({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  placeholder,
  editable = true,
  error = "",
}) {
  return (
    <View style={styles.inputWrap}>
      <Text style={styles.rowLabel}>{label}</Text>

      <TextInput
        style={[
          styles.input,
          !editable && styles.inputDisabled,
          !!error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        editable={editable}
      />

      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function declOfNum(number, words) {
  const n = Math.abs(number) % 100;
  const n1 = n % 10;

  if (n > 10 && n < 20) return words[2];
  if (n1 > 1 && n1 < 5) return words[1];
  if (n1 === 1) return words[0];
  return words[2];
}

function normalizeUAPhoneFlexible(phone) {
  const raw = String(phone || "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (!raw) return "";

  if (raw.startsWith("+380") && raw.length === 13) {
    return raw;
  }

  if (raw.startsWith("380") && raw.length === 12) {
    return `+${raw}`;
  }

  if (raw.startsWith("0") && raw.length === 10) {
    return `+38${raw}`;
  }

  return "";
}

function normalizeBirthDateInput(value) {
  const input = String(value || '').trim();

  if (!input) return null;

  const match = input.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);

  if (!match) return null;

  const [, d, m, y] = match;

  return isValidDateParts(y, m, d) ? `${y}-${m}-${d}` : null;
}

function formatBirthDateMasked(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function formatBirthDateForInput(value) {
  if (!value) return '';

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) return String(value);

  const [, y, m, d] = match;
  return `${d}.${m}.${y}`;
}

function isValidDateParts(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!y || !m || !d) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const testDate = new Date(y, m - 1, d);

  return (
    testDate.getFullYear() === y &&
    testDate.getMonth() === m - 1 &&
    testDate.getDate() === d
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
    gap: 14,
  },

  hero: {
    backgroundColor: colors.card,
    borderRadius: metrics.radiusLg,
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
    marginTop: 6,
  },

  card: {
    backgroundColor: colors.card2,
    borderRadius: metrics.radius,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },

  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 2,
  },

  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(59,167,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(59,167,255,0.28)",
  },

  editBtnText: {
    color: colors.blue,
    fontSize: 13,
    fontWeight: "700",
  },

  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.white06,
    borderWidth: 1,
    borderColor: colors.white10,
  },

  cancelBtnText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },

  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.white06,
    paddingVertical: 8,
  },

  rowLabel: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },

  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "600",
  },

  inputWrap: {
    gap: 6,
  },

  input: {
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    color: colors.text,
    paddingHorizontal: 14,
    fontSize: 16,
  },

  inputDisabled: {
    opacity: 0.65,
  },

  inputError: {
    borderColor: colors.danger,
  },

  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -2,
  },

  lockedHint: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: -2,
  },

  saveBtn: {
    marginTop: 8,
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtnText: {
    color: "#04120C",
    fontSize: 16,
    fontWeight: "800",
  },

  balanceCard: {
    backgroundColor: "rgba(255,45,85,0.08)",
    borderRadius: metrics.radiusLg,
    borderWidth: 1,
    borderColor: "rgba(255,45,85,0.28)",
    padding: 20,
    alignItems: "center",
  },

  balanceLabel: {
    color: colors.textSoft,
    fontSize: 14,
  },

  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 8,
  },

  balanceIcon: {
    width: 28,
    height: 28,
  },

  balanceValue: {
    color: colors.text,
    fontSize: 46,
    fontWeight: "900",
  },

  balanceHint: {
    color: colors.textMuted,
    fontSize: 13,
  },

  logoutButton: {
    minHeight: 56,
    borderRadius: 14,
    backgroundColor: colors.cherry,
    alignItems: "center",
    justifyContent: "center",
  },

  logoutButtonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.white10,
    padding: 24,
    alignItems: "center",
  },

  rewardBeanImage: {
    width: 54,
    height: 54,
    marginBottom: 12,
  },

  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },

  modalText: {
    color: colors.textSoft,
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },

  modalBtn: {
    minHeight: 48,
    minWidth: 140,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 20,
  },

  modalBtnText: {
    color: "#04120C",
    fontSize: 15,
    fontWeight: "800",
  },
});
