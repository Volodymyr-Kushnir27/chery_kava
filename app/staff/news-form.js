import { useEffect, useState } from "react";
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
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";

export default function StaffNewsFormScreen() {
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState(null);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      setCheckingRole(true);

      const { data: authData } = await supabase.auth.getUser();
      const id = authData?.user?.id;
      setUserId(id || null);

      if (!id) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(data?.role === "admin");
    } catch (e) {
      setIsAdmin(false);
    } finally {
      setCheckingRole(false);
    }
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Увага", "Введіть заголовок");
      return;
    }

    if (!body.trim()) {
      Alert.alert("Увага", "Введіть текст новини");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: title.trim(),
        body: body.trim(),
        image_url: imageUrl.trim() || null,
        is_published: published,
        published_at: published ? new Date().toISOString() : null,
        created_by: userId,
      };

      const { error } = await supabase.from("news_posts").insert(payload);

      if (error) throw error;

      Alert.alert("Готово", "Новину створено");
      router.replace("/staff/news");
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося створити новину");
    } finally {
      setSaving(false);
    }
  }

  if (checkingRole) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cherry} />
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Створення новини</Text>
          <Text style={styles.text}>Доступ лише для адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Нова новина</Text>
        <Text style={styles.text}>Додайте заголовок, зображення та текст.</Text>

        <Text style={styles.label}>Заголовок</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Наприклад: Новий сезонний напій"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>URL картинки</Text>
        <TextInput
          style={styles.input}
          value={imageUrl}
          onChangeText={setImageUrl}
          placeholder="https://..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
        />

        <Text style={styles.label}>Текст новини</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={body}
          onChangeText={setBody}
          placeholder="Текст новини"
          placeholderTextColor={colors.textMuted}
          multiline
        />

        <Pressable
          style={[styles.toggle, published && styles.toggleActive]}
          onPress={() => setPublished((prev) => !prev)}
        >
          <Text style={[styles.toggleText, published && styles.toggleTextActive]}>
            {published ? "Опублікувати одразу" : "Зберегти як чернетку"}
          </Text>
        </Pressable>

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? "Збереження..." : "Створити новину"}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Назад</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  container: { padding: metrics.screenPadding, paddingBottom: 120 },
  title: { color: colors.text, fontSize: 28, fontWeight: "800" },
  text: { color: colors.textMuted, fontSize: 14, marginTop: 6, marginBottom: 18 },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 12,
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
  textarea: {
    minHeight: 140,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  toggle: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  toggleActive: {
    backgroundColor: "rgba(54,243,162,0.10)",
    borderColor: "rgba(54,243,162,0.30)",
  },
  toggleText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  toggleTextActive: {
    color: colors.green,
  },
  saveButton: {
    marginTop: 18,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    color: "#04120C",
    fontSize: 16,
    fontWeight: "800",
  },
  cancelButton: {
    marginTop: 12,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
});