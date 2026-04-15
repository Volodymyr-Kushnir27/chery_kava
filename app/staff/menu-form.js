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

function parsePrice(value) {
  const num = Number(String(value || "").replace(",", "."));
  return Number.isFinite(num) && num > 0 ? num : null;
}

function normalizePriceInput(value) {
  return String(value || "")
    .replace(",", ".")
    .replace(/[^\d.]/g, "");
}

const SIZE_CONFIG = {
  small: { code: "small", label: "Малий", volume: 250, sort: 1 },
  medium: { code: "medium", label: "Середній", volume: 350, sort: 2 },
  large: { code: "large", label: "Великий", volume: 450, sort: 3 },
};

export default function StaffMenuFormScreen() {
  const params = useLocalSearchParams();
  const itemId = typeof params.itemId === "string" ? params.itemId : "";
  const initialLocationId =
    typeof params.locationId === "string" ? params.locationId : "";

  const isEditMode = useMemo(() => Boolean(itemId), [itemId]);

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

  function buildEmptyPrices(locationList) {
    const result = {};
    (locationList || []).forEach((loc) => {
      result[loc.id] = "";
    });
    return result;
  }

  function updatePrice(setter, locationId, value) {
    setter((prev) => ({
      ...prev,
      [locationId]: normalizePriceInput(value),
    }));
  }

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

      const [
        { data: categoryList, error: catError },
        { data: locationList, error: locError },
      ] = await Promise.all([
        supabase
          .from("menu_categories")
          .select("id, name, title, subtitle, slug, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase
          .from("locations")
          .select("id, title, short_title, is_active, sort_order")
          .order("sort_order", { ascending: true }),
      ]);

      if (catError) throw catError;
      if (locError) throw locError;

      const normalizedCategories = categoryList || [];
      const normalizedLocations = (locationList || []).filter(
        (x) => x.is_active !== false,
      );

      setCategories(normalizedCategories);
      setLocations(normalizedLocations);

      const initialSmall = buildEmptyPrices(normalizedLocations);
      const initialMedium = buildEmptyPrices(normalizedLocations);
      const initialLarge = buildEmptyPrices(normalizedLocations);

      setSmallPrice(initialSmall);
      setMediumPrice(initialMedium);
      setLargePrice(initialLarge);

      if (isEditMode) {
        await loadExistingItem(
          itemId,
          normalizedLocations,
          normalizedCategories,
        );
      } else if (normalizedCategories?.[0]?.id) {
        setSelectedCategoryId(normalizedCategories[0].id);
      }
    } catch (e) {
      console.log("menu form bootstrap error:", e?.message);
      Alert.alert("Помилка", e?.message || "Не вдалося підготувати форму");
    } finally {
      setCheckingRole(false);
      setLoadingData(false);
    }
  }

  async function loadExistingItem(targetItemId, locationList, categoryList) {
    const { data: item, error: itemError } = await supabase
      .from("menu_items")
      .select("id, category_id, name, title, description, ingredients, slug")
      .eq("id", targetItemId)
      .maybeSingle();

    if (itemError) throw itemError;
    if (!item) throw new Error("Товар не знайдено");

    setSelectedCategoryId(item.category_id || categoryList?.[0]?.id || "");
    setTitle(item.title || item.name || "");
    setDescription(item.description || "");
    setIngredients(item.ingredients || "");

    const { data: sizeRows, error: sizeError } = await supabase
      .from("menu_item_sizes")
      .select("id, size_code, size_label, volume_ml")
      .eq("item_id", targetItemId);

    if (sizeError) throw sizeError;

    const sizeMap = {};
    for (const row of sizeRows || []) {
      sizeMap[row.size_code] = row;
    }

    const sizeIds = (sizeRows || []).map((x) => x.id);
    if (!sizeIds.length) return;

    const { data: priceRows, error: priceError } = await supabase
      .from("location_menu_prices")
      .select("id, location_id, item_size_id, price, is_available, is_active")
      .in("item_size_id", sizeIds);

    if (priceError) throw priceError;

    const nextSmall = buildEmptyPrices(locationList);
    const nextMedium = buildEmptyPrices(locationList);
    const nextLarge = buildEmptyPrices(locationList);

    for (const row of priceRows || []) {
      const size = Object.values(sizeMap).find(
        (s) => s.id === row.item_size_id,
      );
      if (!size) continue;

      const priceValue =
        row.price === null || row.price === undefined
          ? ""
          : String(Number(row.price));

      if (size.size_code === "small") nextSmall[row.location_id] = priceValue;
      if (size.size_code === "medium") nextMedium[row.location_id] = priceValue;
      if (size.size_code === "large") nextLarge[row.location_id] = priceValue;
    }

    setSmallPrice(nextSmall);
    setMediumPrice(nextMedium);
    setLargePrice(nextLarge);
  }

  async function ensureItemSize(itemIdValue, code) {
    const cfg = SIZE_CONFIG[code];

    const { data: existing, error: existingError } = await supabase
      .from("menu_item_sizes")
      .select("id, item_id, size_code")
      .eq("item_id", itemIdValue)
      .eq("size_code", code)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing?.id) return existing;

    const { data: created, error: createError } = await supabase
      .from("menu_item_sizes")
      .insert({
        item_id: itemIdValue,
        size_code: cfg.code,
        size_label: cfg.label,
        volume_ml: cfg.volume,
        sort_order: cfg.sort,
        is_active: true,
      })
      .select("id, item_id, size_code")
      .single();

    if (createError) throw createError;
    return created;
  }

  async function upsertPrice({ locationId, itemSizeId, price, sortOrder }) {
    const { data: existing, error: existingError } = await supabase
      .from("location_menu_prices")
      .select("id")
      .eq("location_id", locationId)
      .eq("item_size_id", itemSizeId)
      .maybeSingle();

    if (existingError) throw existingError;

    const payload = {
      location_id: locationId,
      item_size_id: itemSizeId,
      price,
      is_available: true,
      is_active: true,
      sort_order: sortOrder,
    };

    if (existing?.id) {
      const { error } = await supabase
        .from("location_menu_prices")
        .update(payload)
        .eq("id", existing.id);

      if (error) throw error;
      return;
    }

    const { error } = await supabase
      .from("location_menu_prices")
      .insert(payload);
    if (error) throw error;
  }

  async function handleSave() {
    if (!selectedCategoryId) {
      Alert.alert("Увага", "Оберіть категорію");
      return;
    }

    if (!title.trim()) {
      Alert.alert("Увага", "Введіть назву товару");
      return;
    }

    try {
      setSaving(true);

      const itemSlug = await makeUniqueItemSlug(title, isEditMode ? itemId : '');
      let savedItemId = itemId;

      if (isEditMode) {
        const { error: updateError } = await supabase
          .from("menu_items")
          .update({
            category_id: selectedCategoryId,
            name: title.trim(),
            title: title.trim(),
            slug: itemSlug,
            description: description.trim() || null,
            ingredients: ingredients.trim() || null,
            is_active: true,
          })
          .eq("id", itemId);

        if (updateError) throw updateError;
      } else {
        const { data: createdItem, error: createError } = await supabase
          .from("menu_items")
          .insert({
            category_id: selectedCategoryId,
            name: title.trim(),
            slug: itemSlug,
            title: title.trim(),
            description: description.trim() || null,
            ingredients: ingredients.trim() || null,
            sort_order: 0,
            is_active: true,
          })
          .select("id")
          .single();

        if (createError) throw createError;
        savedItemId = createdItem.id;
      }

      const smallSize = await ensureItemSize(savedItemId, "small");
      const mediumSize = await ensureItemSize(savedItemId, "medium");
      const largeSize = await ensureItemSize(savedItemId, "large");

      for (const location of locations) {
        const pSmall = parsePrice(smallPrice[location.id]);
        const pMedium = parsePrice(mediumPrice[location.id]);
        const pLarge = parsePrice(largePrice[location.id]);

        if (pSmall) {
          await upsertPrice({
            locationId: location.id,
            itemSizeId: smallSize.id,
            price: pSmall,
            sortOrder: 1,
          });
        }

        if (pMedium) {
          await upsertPrice({
            locationId: location.id,
            itemSizeId: mediumSize.id,
            price: pMedium,
            sortOrder: 2,
          });
        }

        if (pLarge) {
          await upsertPrice({
            locationId: location.id,
            itemSizeId: largeSize.id,
            price: pLarge,
            sortOrder: 3,
          });
        }
      }

      Alert.alert(
        "Готово",
        isEditMode ? "Позицію меню оновлено" : "Позицію меню створено",
      );

      if (initialLocationId) {
        router.replace({
          pathname: "/staff/menu",
          params: { locationId: initialLocationId },
        });
      } else {
        router.replace("/staff/menu");
      }
    } catch (e) {
      console.log("menu save error:", e?.message);
      Alert.alert("Помилка", e?.message || "Не вдалося зберегти позицію");
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
            {isEditMode ? "Редагування товару" : "Додавання товару"}
          </Text>
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
        <Text style={styles.title}>
          {isEditMode ? "Редагування товару" : "Новий товар"}
        </Text>
        <Text style={styles.text}>
          {isEditMode
            ? "Оновіть назву, опис, склад і ціни по локаціях."
            : "Створення позиції меню з цінами по локаціях."}
        </Text>

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
                <Text
                  style={[styles.pillText, active && styles.pillTextActive]}
                >
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
          placeholder="Наприклад: Американо"
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
          placeholder="Еспресо, вода..."
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
              onChangeText={(value) =>
                updatePrice(setSmallPrice, location.id, value)
              }
              placeholder="Ціна"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.subLabel}>Середній</Text>
            <TextInput
              style={styles.input}
              value={mediumPrice[location.id] || ""}
              onChangeText={(value) =>
                updatePrice(setMediumPrice, location.id, value)
              }
              placeholder="Ціна"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.subLabel}>Великий</Text>
            <TextInput
              style={styles.input}
              value={largePrice[location.id] || ""}
              onChangeText={(value) =>
                updatePrice(setLargePrice, location.id, value)
              }
              placeholder="Ціна"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        ))}

        <Pressable
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>
            {saving
              ? "Збереження..."
              : isEditMode
                ? "Зберегти зміни"
                : "Створити товар"}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Назад</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

async function makeUniqueItemSlug(baseTitle, currentItemId = "") {
  const baseSlug = slugify(baseTitle);
  let candidate = baseSlug;
  let counter = 2;

  while (true) {
    let query = supabase
      .from("menu_items")
      .select("id, slug")
      .eq("slug", candidate);

    if (currentItemId) {
      query = query.neq("id", currentItemId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;
    if (!data) return candidate;

    candidate = `${baseSlug}-${counter}`;
    counter += 1;
  }
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
