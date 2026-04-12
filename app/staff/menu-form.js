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
import {
  createMenuItem,
  createMenuItemSize,
  getLocations,
  upsertLocationMenuPrice,
} from "../../src/services/menuService";

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

export default function StaffMenuFormScreen() {
  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState("");

  const [smallPrice, setSmallPrice] = useState({});
  const [mediumPrice, setMediumPrice] = useState({});
  const [largePrice, setLargePrice] = useState({});

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    try {
      setCheckingRole(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setIsAdmin(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const admin = profile?.role === "admin";
      setIsAdmin(admin);

      if (!admin) return;

      setLoadingData(true);

      const [{ data: categoryList, error: catError }, locationList] =
        await Promise.all([
          supabase
            .from("menu_categories")
            .select("id, name, title, subtitle, slug, sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true }),
          getLocations(),
        ]);

      if (catError) throw catError;

      setCategories(categoryList || []);
      setLocations(locationList || []);

      if (categoryList?.[0]?.id) {
        setSelectedCategoryId(categoryList[0].id);
      }

      const initialPrices = {};
      (locationList || []).forEach((loc) => {
        initialPrices[loc.id] = "";
      });

      setSmallPrice(initialPrices);
      setMediumPrice(initialPrices);
      setLargePrice(initialPrices);
    } catch (e) {
      console.log("menu form bootstrap error:", e?.message);
      Alert.alert("Помилка", e?.message || "Не вдалося підготувати форму");
    } finally {
      setCheckingRole(false);
      setLoadingData(false);
    }
  }

  function updatePrice(setter, locationId, value) {
    const cleaned = String(value || "").replace(",", ".").replace(/[^\d.]/g, "");
    setter((prev) => ({ ...prev, [locationId]: cleaned }));
  }

  function parsePrice(value) {
    const num = Number(String(value || "").replace(",", "."));
    return Number.isFinite(num) && num > 0 ? num : null;
  }

  async function handleSave() {
    if (!selectedCategoryId) {
      Alert.alert("Увага", "Оберіть категорію");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Увага", "Введіть назву напою");
      return;
    }

    try {
      setSaving(true);

      const itemSlug = slugify(title);

      const newItem = await createMenuItem({
        category_id: selectedCategoryId,
        slug: itemSlug,
        title: title.trim(),
        description: description.trim() || null,
        ingredients: ingredients.trim() || null,
        sort_order: 0,
        is_active: true,
      });

      const smallSize = await createMenuItemSize({
        item_id: newItem.id,
        size_code: "small",
        size_label: "Малий",
        volume_ml: 250,
        sort_order: 1,
        is_active: true,
      });

      const mediumSize = await createMenuItemSize({
        item_id: newItem.id,
        size_code: "medium",
        size_label: "Середній",
        volume_ml: 350,
        sort_order: 2,
        is_active: true,
      });

      const largeSize = await createMenuItemSize({
        item_id: newItem.id,
        size_code: "large",
        size_label: "Великий",
        volume_ml: 450,
        sort_order: 3,
        is_active: true,
      });

      for (const location of locations) {
        const pSmall = parsePrice(smallPrice[location.id]);
        const pMedium = parsePrice(mediumPrice[location.id]);
        const pLarge = parsePrice(largePrice[location.id]);

        if (pSmall) {
          await upsertLocationMenuPrice({
            location_id: location.id,
            item_size_id: smallSize.id,
            price: pSmall,
            is_available: true,
            is_active: true,
            sort_order: 1,
          });
        }

        if (pMedium) {
          await upsertLocationMenuPrice({
            location_id: location.id,
            item_size_id: mediumSize.id,
            price: pMedium,
            is_available: true,
            is_active: true,
            sort_order: 2,
          });
        }

        if (pLarge) {
          await upsertLocationMenuPrice({
            location_id: location.id,
            item_size_id: largeSize.id,
            price: pLarge,
            is_available: true,
            is_active: true,
            sort_order: 3,
          });
        }
      }

      Alert.alert("Готово", "Позицію меню створено");
      router.replace("/staff/menu");
    } catch (e) {
      console.log("menu create error:", e?.message);
      Alert.alert("Помилка", e?.message || "Не вдалося створити позицію");
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
          <Text style={styles.title}>Додавання товару</Text>
          <Text style={styles.text}>Доступ лише для адміністратора.</Text>
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
        <Text style={styles.title}>Новий товар</Text>
        <Text style={styles.text}>Створення позиції меню з цінами по локаціях.</Text>

        <Text style={styles.label}>Категорія</Text>
        <View style={styles.pillsWrap}>
          {categories.map((category) => {
            const active = selectedCategoryId === category.id;
            const label = category.title || category.name;

            return (
              <Pressable
                key={category.id}
                style={[styles.pill, active && styles.pillActive]}
                onPress={() => setSelectedCategoryId(category.id)}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.label}>Назва</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Наприклад: Flat White"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Опис</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          placeholder="Короткий опис"
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.label}>Склад</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={ingredients}
          onChangeText={setIngredients}
          placeholder="Еспресо, молоко..."
          placeholderTextColor={colors.textMuted}
          multiline
        />

        {locations.map((location) => (
          <View key={location.id} style={styles.locationCard}>
            <Text style={styles.locationTitle}>
              {location.short_title || location.title}
            </Text>

            <Text style={styles.subLabel}>Малий</Text>
            <TextInput
              style={styles.input}
              value={smallPrice[location.id] || ""}
              onChangeText={(value) => updatePrice(setSmallPrice, location.id, value)}
              placeholder="Ціна"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.subLabel}>Середній</Text>
            <TextInput
              style={styles.input}
              value={mediumPrice[location.id] || ""}
              onChangeText={(value) => updatePrice(setMediumPrice, location.id, value)}
              placeholder="Ціна"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.subLabel}>Великий</Text>
            <TextInput
              style={styles.input}
              value={largePrice[location.id] || ""}
              onChangeText={(value) => updatePrice(setLargePrice, location.id, value)}
              placeholder="Ціна"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        ))}

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>
            {saving ? "Збереження..." : "Створити товар"}
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
  subLabel: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
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
    minHeight: 96,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  pillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    borderColor: colors.cherry,
    backgroundColor: "rgba(255,45,85,0.10)",
  },
  pillText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: "700",
  },
  pillTextActive: {
    color: colors.cherry,
  },
  locationCard: {
    marginTop: 16,
    backgroundColor: colors.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  locationTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4,
  },
  saveButton: {
    marginTop: 24,
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