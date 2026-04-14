import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";

export default function StaffNewsScreen() {
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    checkRole();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        loadNews();
      }
    }, [isAdmin]),
  );

  async function checkRole() {
    try {
      setCheckingRole(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(data?.role === "admin");
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingRole(false);
    }
  }

  async function loadNews() {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, body, image_url, is_published, published_at, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося завантажити новини");
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish(item) {
    try {
      const { error } = await supabase
        .from("news_posts")
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      await loadNews();
      Alert.alert("Готово", "Новину опубліковано");
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося опублікувати новину");
    }
  }

  async function handleUnpublish(item) {
    try {
      const { error } = await supabase
        .from("news_posts")
        .update({
          is_published: false,
          published_at: null,
        })
        .eq("id", item.id);

      if (error) throw error;

      await loadNews();
      Alert.alert("Готово", "Новину знято з публікації");
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося зняти новину з публікації");
    }
  }

  async function handleDelete(newsId) {
    try {
      setDeletingId(newsId);

      const { error } = await supabase
        .from("news_posts")
        .delete()
        .eq("id", newsId);

      if (error) throw error;

      setItems((prev) => prev.filter((x) => x.id !== newsId));
      Alert.alert("Готово", "Новину видалено");
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося видалити новину");
    } finally {
      setDeletingId("");
    }
  }

  function confirmDelete(item) {
    if (Platform.OS === "web") {
      const ok = window.confirm(`Видалити новину "${item.title}"?`);
      if (ok) {
        handleDelete(item.id);
      }
      return;
    }

    Alert.alert(
      "Видалити новину?",
      `Новина "${item.title}" буде повністю видалена.`,
      [
        { text: "Скасувати", style: "cancel" },
        {
          text: "Видалити",
          style: "destructive",
          onPress: () => handleDelete(item.id),
        },
      ],
    );
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
          <Text style={styles.title}>Керування новинами</Text>
          <Text style={styles.text}>Доступ лише для адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Керування новинами</Text>
            <Text style={styles.text}>Додавання, редагування та публікація новин.</Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/staff/news-form")}
          >
            <Text style={styles.addButtonText}>+ Додати</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.cherry} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Новин поки немає</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                {!!item.image_url && (
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                )}

                <Text style={styles.cardTitle}>{item.title}</Text>
                {!!item.body && <Text style={styles.cardText}>{item.body}</Text>}

                <Text style={styles.statusText}>
                  {item.is_published ? "Опубліковано" : "Чернетка"}
                </Text>

                <View style={styles.actionsWrap}>
                  <Pressable
                    style={styles.editButton}
                    onPress={() =>
                      router.push({
                        pathname: "/staff/news-form",
                        params: { newsId: item.id },
                      })
                    }
                  >
                    <Text style={styles.editButtonText}>Редагувати</Text>
                  </Pressable>

                  {item.is_published ? (
                    <Pressable
                      style={styles.unpublishButton}
                      onPress={() => handleUnpublish(item)}
                    >
                      <Text style={styles.unpublishButtonText}>Зняти з публікації</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={styles.publishButton}
                      onPress={() => handlePublish(item)}
                    >
                      <Text style={styles.publishButtonText}>Опублікувати</Text>
                    </Pressable>
                  )}

                  <Pressable
                    style={[
                      styles.deleteButton,
                      deletingId === item.id && styles.deleteButtonDisabled,
                    ]}
                    onPress={() => confirmDelete(item)}
                    disabled={deletingId === item.id}
                  >
                    <Text style={styles.deleteButtonText}>
                      {deletingId === item.id ? "Видалення..." : "Видалити"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
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
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: "800",
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  addButton: {
    minHeight: 56,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#04120C",
    fontSize: 16,
    fontWeight: "800",
  },
  emptyBox: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    marginBottom: 14,
    backgroundColor: colors.bgSoft,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  cardText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  statusText: {
    color: colors.textSoft,
    fontSize: 13,
    marginTop: 12,
    fontWeight: "700",
  },
  actionsWrap: {
    marginTop: 14,
    gap: 10,
  },
  editButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(74,159,255,0.45)",
    backgroundColor: "rgba(74,159,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  editButtonText: {
    color: "#66B3FF",
    fontSize: 14,
    fontWeight: "800",
  },
  publishButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.cherry,
    alignItems: "center",
    justifyContent: "center",
  },
  publishButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },
  unpublishButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,195,0,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,195,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  unpublishButtonText: {
    color: "#FFD24D",
    fontSize: 14,
    fontWeight: "800",
  },
  deleteButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,59,48,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    color: "#FF6B6B",
    fontSize: 14,
    fontWeight: "800",
  },
});