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
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/['`’]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-а-яіїєґ]/gi, "-")
    .replace(/\-+/g, "-")
    .replace(/^\-|\-$/g, "");
}

export default function StaffNewsFormScreen() {
  const params = useLocalSearchParams();
  const newsId = typeof params.newsId === "string" ? params.newsId : "";
  const isEditMode = useMemo(() => Boolean(newsId), [newsId]);

  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState("");

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [body, setBody] = useState("");
  const [published, setPublished] = useState(true);

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      setCheckingRole(true);
      setLoadingData(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      const currentUserId = authData?.user?.id;
      if (!currentUserId) {
        setIsAdmin(false);
        return;
      }

      setUserId(currentUserId);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", currentUserId)
        .maybeSingle();

      if (profileError) throw profileError;

      const admin = profile?.role === "admin";
      setIsAdmin(admin);

      if (!admin) return;

      if (isEditMode) {
        const { data: newsItem, error: newsError } = await supabase
          .from("news_posts")
          .select("id, title, body, image_url, is_published, published_at")
          .eq("id", newsId)
          .maybeSingle();

        if (newsError) throw newsError;
        if (!newsItem) throw new Error("Новину не знайдено");

        setTitle(newsItem.title || "");
        setBody(newsItem.body || "");
        setImageUrl(newsItem.image_url || "");
        setPublished(Boolean(newsItem.is_published));
      }
    } catch (e) {
      console.log("news form bootstrap error:", e);
      Alert.alert("Помилка", e?.message || "Не вдалося підготувати форму");
    } finally {
      setCheckingRole(false);
      setLoadingData(false);
    }
  }

  async function handleSave(forceDraft = false) {
    if (!title.trim()) {
      Alert.alert("Увага", "Введіть заголовок");
      return;
    }

    if (!body.trim()) {
      Alert.alert("Увага", "Введіть текст новини");
      return;
    }

    if (!userId) {
      Alert.alert("Помилка", "Не знайдено user id сесії");
      return;
    }

    try {
      setSaving(true);

      const finalPublished = forceDraft ? false : published;
      const payload = {
        slug: slugify(title),
        title: title.trim(),
        body: body.trim(),
        content: body.trim(),
        image_url: imageUrl.trim() || null,
        cover_image_url: imageUrl.trim() || null,
        is_published: finalPublished,
        published_at: finalPublished ? new Date().toISOString() : null,
        created_by: userId,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from("news_posts")
          .update(payload)
          .eq("id", newsId);

        if (error) {
          console.log("news update error:", error);
          throw error;
        }

        Alert.alert("Готово", "Новину оновлено");
      } else {
        const { error } = await supabase
          .from("news_posts")
          .insert(payload);

        if (error) {
          console.log("news create error:", error);
          throw error;
        }

        Alert.alert("Готово", forceDraft ? "Чернетку збережено" : "Новину створено");
      }

      router.replace("/staff/news");
    } catch (e) {
      console.log("news save error full:", e);
      Alert.alert("Помилка", e?.message || "Не вдалося зберегти новину");
    } finally {
      setSaving(false);
    }
  }

  if (checkingRole || loadingData) {
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
          <Text style={styles.title}>
            {isEditMode ? "Редагування новини" : "Створення новини"}
          </Text>
          <Text style={styles.text}>Доступ лише для адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>
          {isEditMode ? "Редагування новини" : "Нова новина"}
        </Text>
        <Text style={styles.text}>
          {isEditMode
            ? "Оновіть заголовок, картинку і текст."
            : "Додайте заголовок, зображення та текст."}
        </Text>

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

        <Pressable
          style={styles.secondaryButton}
          onPress={() => handleSave(true)}
          disabled={saving}
        >
          <Text style={styles.secondaryButtonText}>
            {saving ? "Збереження..." : "Зберегти як чернетку"}
          </Text>
        </Pressable>

        <Pressable
          style={styles.saveButton}
          onPress={() => handleSave(false)}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving
              ? "Збереження..."
              : isEditMode
                ? "Зберегти новину"
                : "Створити новину"}
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
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    marginBottom: 18,
  },
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
  },
  toggleActive: {
    borderColor: colors.cherry,
    backgroundColor: "rgba(255,45,85,0.10)",
  },
  toggleText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },
  toggleTextActive: {
    color: colors.cherry,
  },
  secondaryButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 14,
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
  saveButton: {
    marginTop: 12,
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