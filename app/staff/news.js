import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
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

  useEffect(() => {
    checkRole();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) loadNews();
    }, [isAdmin])
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
    } catch (e) {
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

  async function togglePublished(item) {
    try {
      const nextValue = !item.is_published;

      const { error } = await supabase
        .from("news_posts")
        .update({
          is_published: nextValue,
          published_at: nextValue ? new Date().toISOString() : null,
        })
        .eq("id", item.id);

      if (error) throw error;
      await loadNews();
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося оновити статус");
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
          <Text style={styles.title}>Новини</Text>
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
            <Text style={styles.text}>Додавання та публікація новин.</Text>
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
            renderItem={({ item }) => (
              <View style={styles.card}>
                {!!item.image_url && (
                  <Image source={{ uri: item.image_url }} style={styles.image} />
                )}

                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardText} numberOfLines={3}>
                  {item.body}
                </Text>

                <View style={styles.row}>
                  <Text style={styles.statusText}>
                    {item.is_published ? "Опубліковано" : "Чернетка"}
                  </Text>

                  <Pressable
                    style={styles.publishBtn}
                    onPress={() => togglePublished(item)}
                  >
                    <Text style={styles.publishBtnText}>
                      {item.is_published ? "Зняти з публікації" : "Опублікувати"}
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
  safe: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, padding: metrics.screenPadding },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: { flexDirection: "row", gap: 12, marginBottom: 18 },
  title: { color: colors.text, fontSize: 26, fontWeight: "800" },
  text: { color: colors.textMuted, fontSize: 14, marginTop: 6 },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: { color: "#04120C", fontSize: 14, fontWeight: "800" },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  image: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: colors.bgSoft,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: "800" },
  cardText: { color: colors.textMuted, fontSize: 13, marginTop: 8, lineHeight: 18 },
  row: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  statusText: { color: colors.textSoft, fontSize: 13, fontWeight: "700" },
  publishBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.cherry,
    alignItems: "center",
    justifyContent: "center",
  },
  publishBtnText: { color: colors.text, fontSize: 13, fontWeight: "800" },
});