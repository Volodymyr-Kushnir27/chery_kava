import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";
import { getLocations, getMenuByLocation } from "../../src/services/menuService";

export default function StaffMenuScreen() {
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        loadMenu();
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
    } catch (e) {
      console.log("check role error:", e?.message);
      setIsAdmin(false);
    } finally {
      setCheckingRole(false);
    }
  }

  async function loadMenu(preferredLocationId = null) {
    try {
      setLoading(true);

      const locationList = await getLocations();
      setLocations(locationList || []);

      const chosenLocation =
        (locationList || []).find((x) => x.id === preferredLocationId) ||
        locationList?.[0] ||
        null;

      setSelectedLocation(chosenLocation);

      if (!chosenLocation?.id) {
        setCategories([]);
        return;
      }

      const result = await getMenuByLocation(chosenLocation.id);
      setCategories(result?.categories || []);
    } catch (e) {
      console.log("staff menu load error:", e?.message);
      Alert.alert("Помилка", e?.message || "Не вдалося завантажити меню");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectLocation(location) {
    if (!location?.id) return;

    setSelectedLocation(location);

    try {
      setLoading(true);
      const result = await getMenuByLocation(location.id);
      setCategories(result?.categories || []);
    } catch (e) {
      Alert.alert("Помилка", e?.message || "Не вдалося завантажити локацію");
    } finally {
      setLoading(false);
    }
  }

  const flatItems = categories.flatMap((category) =>
    (category.items || []).map((item) => ({
      ...item,
      categoryTitle: category.title,
    })),
  );

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
          <Text style={styles.title}>Керування меню</Text>
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
            <Text style={styles.title}>Керування меню</Text>
            <Text style={styles.text}>Додавання та перегляд позицій меню.</Text>
          </View>

          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/staff/menu-form")}
          >
            <Text style={styles.addButtonText}>+ Додати</Text>
          </Pressable>
        </View>

        <View style={styles.locationsRow}>
          {locations.map((location) => {
            const active = location.id === selectedLocation?.id;

            return (
              <Pressable
                key={location.id}
                style={[
                  styles.locationButton,
                  active && styles.locationButtonActive,
                ]}
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

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.cherry} />
          </View>
        ) : (
          <FlatList
            data={flatItems}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 120, gap: 12 }}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyTitle}>Позицій немає</Text>
                <Text style={styles.emptyText}>
                  Для цієї локації ще немає активного меню.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.categoryText}>{item.categoryTitle}</Text>
                <Text style={styles.itemTitle}>{item.title}</Text>

                {!!item.description && (
                  <Text style={styles.itemDesc}>{item.description}</Text>
                )}

                <View style={styles.sizesWrap}>
                  {(item.sizes || []).map((size) => (
                    <View key={size.id} style={styles.sizeRow}>
                      <Text style={styles.sizeText}>
                        {size.label}
                        {size.volume_ml ? ` · ${size.volume_ml} мл` : ""}
                      </Text>

                      <Text style={styles.priceText}>{size.priceLabel}</Text>
                    </View>
                  ))}
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
  },
  addButton: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#04120C",
    fontSize: 14,
    fontWeight: "800",
  },
  locationsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 18,
  },
  locationButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  locationButtonActive: {
    borderColor: colors.cherry,
    backgroundColor: "rgba(255,45,85,0.10)",
  },
  locationButtonText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  locationButtonTextActive: {
    color: colors.cherry,
  },
  emptyBox: {
    backgroundColor: colors.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  categoryText: {
    color: colors.cherry,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  itemDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  sizesWrap: {
    marginTop: 12,
    gap: 8,
  },
  sizeRow: {
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.white06,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sizeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  priceText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "800",
  },
});