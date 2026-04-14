import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';

export default function StaffMenuScreen() {
  const params = useLocalSearchParams();
  const preferredLocationId =
    typeof params.locationId === 'string' ? params.locationId : '';

  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRole();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        loadAll(preferredLocationId || null);
      }
    }, [isAdmin, preferredLocationId]),
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
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(data?.role === 'admin');
    } catch {
      setIsAdmin(false);
    } finally {
      setCheckingRole(false);
    }
  }

  async function loadAll(forcedLocationId = null) {
    try {
      setLoading(true);

      const { data: locationsData, error: locationsError } = await supabase
        .from('locations')
        .select('id, title, short_title, is_active, sort_order')
        .order('sort_order', { ascending: true });

      if (locationsError) throw locationsError;

      const locationList = (locationsData || []).filter((x) => x.is_active !== false);
      setLocations(locationList);

      const chosen =
        locationList.find((x) => x.id === forcedLocationId) ||
        locationList[0] ||
        null;

      setSelectedLocation(chosen);

      if (!chosen?.id) {
        setItems([]);
        return;
      }

      await loadItemsByLocation(chosen.id);
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося завантажити меню');
    } finally {
      setLoading(false);
    }
  }

  async function loadItemsByLocation(locationId) {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('location_menu_prices')
        .select(`
          id,
          price,
          is_available,
          is_active,
          item_size:menu_item_sizes (
            id,
            size_code,
            size_label,
            volume_ml,
            item:menu_items (
              id,
              name,
              title,
              description,
              ingredients,
              is_active,
              category:menu_categories (
                id,
                title,
                name
              )
            )
          )
        `)
        .eq('location_id', locationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const map = new Map();

      for (const row of data || []) {
        const item = row?.item_size?.item;
        const itemSize = row?.item_size;
        if (!item?.id || !itemSize?.id) continue;

        if (!map.has(item.id)) {
          map.set(item.id, {
            id: item.id,
            title: item.title || item.name || 'Без назви',
            description: item.description,
            ingredients: item.ingredients,
            is_active: item.is_active,
            categoryTitle: item.category?.title || item.category?.name || 'Без категорії',
            sizes: [],
          });
        }

        map.get(item.id).sizes.push({
          id: itemSize.id,
          label: itemSize.size_label,
          volume_ml: itemSize.volume_ml,
          price: row.price,
          is_available: row.is_available,
          is_active: row.is_active,
        });
      }

      setItems(Array.from(map.values()));
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося завантажити позиції');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectLocation(location) {
    setSelectedLocation(location);
    await loadItemsByLocation(location.id);
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
        </View>

        <View style={styles.actionsRow}>
          <Pressable style={styles.addButton} onPress={() => router.push('/staff/menu-form')}>
            <Text style={styles.addButtonText}>+ Товар</Text>
          </Pressable>

          <Pressable
            style={[styles.addButton, styles.secondaryAction]}
            onPress={() => router.push('/staff/locations')}
          >
            <Text style={[styles.addButtonText, styles.secondaryActionText]}>Локації</Text>
          </Pressable>
        </View>

        <View style={styles.locationsRow}>
          {locations.map((location) => {
            const active = selectedLocation?.id === location.id;

            return (
              <Pressable
                key={location.id}
                style={[styles.locationButton, active && styles.locationButtonActive]}
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
            data={items}
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
                        {size.volume_ml ? ` · ${size.volume_ml} мл` : ''}
                      </Text>

                      <Text style={styles.priceText}>{Number(size.price || 0)} грн</Text>
                    </View>
                  ))}
                </View>

                <Pressable
                  style={styles.editButton}
                  onPress={() =>
                    router.push({
                      pathname: '/staff/menu-form',
                      params: {
                        itemId: item.id,
                        locationId: selectedLocation?.id || '',
                      },
                    })
                  }
                >
                  <Text style={styles.editButtonText}>Редагувати позицію</Text>
                </Pressable>
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  headerRow: {
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#04120C',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryAction: {
    backgroundColor: colors.card2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    color: colors.text,
  },
  locationsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  locationButton: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonActive: {
    borderColor: colors.cherry,
    backgroundColor: 'rgba(255,45,85,0.10)',
  },
  locationButtonText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
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
    fontWeight: '800',
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
    fontWeight: '700',
    marginBottom: 4,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sizeText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  priceText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: '800',
  },
  editButton: {
    marginTop: 14,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(74,159,255,0.45)',
    backgroundColor: 'rgba(74,159,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#66B3FF',
    fontSize: 14,
    fontWeight: '800',
  },
});