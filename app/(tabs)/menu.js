import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, metrics } from "../../src/constants/theme";
import {
  getInitialMenuState,
  refreshMenuForLocation,
} from "../../src/services/menuService";

export default function MenuScreen() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [switchingLocation, setSwitchingLocation] = useState(false);
  const [error, setError] = useState("");

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const result = await getInitialMenuState();

      setLocations(result.locations || []);
      setSelectedLocation(result.selectedLocation || null);
      setCategories(result.categories || []);
    } catch (e) {
      setError(e?.message || "Не вдалося завантажити меню");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  async function handleSelectLocation(location) {
    if (!location?.id) return;
    if (location.id === selectedLocation?.id) return;

    try {
      setSwitchingLocation(true);
      setError("");

      const result = await refreshMenuForLocation(location.id);

      setSelectedLocation(
        result.selectedLocation
          ? {
              id: result.selectedLocation.id,
              slug: result.selectedLocation.slug,
              title: result.selectedLocation.title,
              short_title: result.selectedLocation.short_title,
              address: result.selectedLocation.address,
              sort_order: result.selectedLocation.sort_order,
            }
          : location,
      );

      setCategories(result.categories || []);
    } catch (e) {
      setError(e?.message || "Не вдалося переключити локацію");
    } finally {
      setSwitchingLocation(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={colors.cherry} />
          <Text style={styles.loaderText}>Завантаження меню...</Text>
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
          <Text style={styles.heroTitle}>Меню</Text>
          <Text style={styles.heroText}>
            Оберіть локацію та перегляньте актуальні ціни по розмірах.
          </Text>
        </View>

        <View style={styles.locationsWrap}>
          <Text style={styles.blockTitle}>Локація</Text>

          <View style={styles.locationButtonsRow}>
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
                  disabled={switchingLocation}
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

          {!!selectedLocation?.address && (
            <Text style={styles.locationAddress}>{selectedLocation.address}</Text>
          )}
        </View>

        {switchingLocation && (
          <View style={styles.switchingBox}>
            <ActivityIndicator size="small" color={colors.green} />
            <Text style={styles.switchingText}>Оновлюємо меню...</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>

            <Pressable style={styles.retryButton} onPress={loadInitialData}>
              <Text style={styles.retryButtonText}>Спробувати ще раз</Text>
            </Pressable>
          </View>
        )}

        {!error && categories.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>Меню порожнє</Text>
            <Text style={styles.emptyText}>
              Для цієї локації ще не додано активних позицій.
            </Text>
          </View>
        )}

        {!error &&
          categories.map((category) => (
            <View key={category.id} style={styles.section}>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>{category.title}</Text>
                {!!category.subtitle && (
                  <Text style={styles.sectionSub}>{category.subtitle}</Text>
                )}
              </View>

              {category.items.map((item) => (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardLeft}>
                      <View style={styles.dot} />
                      <View style={styles.cardMainInfo}>
                        <Text style={styles.itemName}>{item.title}</Text>

                        {!!item.description && (
                          <Text style={styles.itemDesc}>{item.description}</Text>
                        )}

                        {!!item.ingredients && (
                          <Text style={styles.itemIngredients}>
                            Склад: {item.ingredients}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.sizesWrap}>
                    {item.sizes
                      .filter((size) => size.is_available)
                      .map((size) => (
                        <View key={size.id} style={styles.sizeRow}>
                          <View style={styles.sizeLeft}>
                            <Text style={styles.sizeLabel}>{size.label}</Text>

                            {size.volume_ml ? (
                              <Text style={styles.sizeVolume}>
                                {size.volume_ml} мл
                              </Text>
                            ) : null}
                          </View>

                          <View style={styles.priceBadge}>
                            <Text style={styles.priceText}>
                              {size.priceLabel}
                            </Text>
                          </View>
                        </View>
                      ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
    gap: 18,
  },

  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 12,
  },

  loaderText: {
    color: colors.textMuted,
    fontSize: 14,
  },

  hero: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.white08,
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

  locationsWrap: {
    gap: 10,
  },

  blockTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },

  locationButtonsRow: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },

  locationButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  locationButtonActive: {
    backgroundColor: "rgba(255,45,85,0.12)",
    borderColor: "rgba(255,45,85,0.35)",
  },

  locationButtonText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "700",
  },

  locationButtonTextActive: {
    color: colors.cherry,
  },

  locationAddress: {
    color: colors.textMuted,
    fontSize: 13,
  },

  switchingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  switchingText: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: "600",
  },

  errorBox: {
    backgroundColor: "rgba(255,59,48,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,59,48,0.28)",
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },

  errorText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },

  retryButton: {
    alignSelf: "flex-start",
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.cherry,
    alignItems: "center",
    justifyContent: "center",
  },

  retryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "800",
  },

  emptyBox: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  section: {
    gap: 10,
  },

  sectionHead: {
    marginTop: 4,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },

  sectionSub: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  cardMainInfo: {
    flex: 1,
  },

  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.cherry,
    marginTop: 4,
  },

  itemName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },

  itemDesc: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },

  itemIngredients: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 18,
  },

  sizesWrap: {
    gap: 10,
  },

  sizeRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    backgroundColor: colors.bgSoft,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.white06,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  sizeLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    flex: 1,
  },

  sizeLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },

  sizeVolume: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "500",
  },

  priceBadge: {
    backgroundColor: "rgba(54,243,162,0.10)",
    borderWidth: 1,
    borderColor: "rgba(54,243,162,0.30)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  priceText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "800",
  },
});