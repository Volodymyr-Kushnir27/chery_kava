import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';

function money(value) {
  return `${Number(value || 0).toFixed(2)} грн`;
}

export default function StaffAnalyticsScreen() {
  const [checkingRole, setCheckingRole] = useState(true);
  const [isStaff, setIsStaff] = useState(false);
  const [staffId, setStaffId] = useState('');

  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(false);

  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedSizeId, setSelectedSizeId] = useState('');
  const [qty, setQty] = useState('1');

  const [cart, setCart] = useState([]);
  const [comment, setComment] = useState('');

  const [saving, setSaving] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [todaySales, setTodaySales] = useState([]);
  const [todayTotal, setTodayTotal] = useState(0);

  useEffect(() => {
    bootstrap();
  }, []);

  const selectedItem = useMemo(
    () => menuItems.find((item) => item.id === selectedItemId) || null,
    [menuItems, selectedItemId]
  );

  const selectedSize = useMemo(
    () => selectedItem?.sizes?.find((size) => size.id === selectedSizeId) || null,
    [selectedItem, selectedSizeId]
  );

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, row) => sum + Number(row.line_total || 0), 0);
  }, [cart]);

  const groupedTodayStats = useMemo(() => {
    const map = new Map();

    for (const row of todaySales) {
      const key = `${row.item_title}__${row.size_label || ''}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          item_title: row.item_title,
          size_label: row.size_label || '',
          qty: 0,
          total: 0,
        });
      }

      const stat = map.get(key);
      stat.qty += Number(row.qty || 0);
      stat.total += Number(row.line_total || 0);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [todaySales]);

  async function bootstrap() {
    try {
      setCheckingRole(true);

      const { data: authData } = await supabase.auth.getUser();
      const userId = authData?.user?.id;

      if (!userId) {
        setIsStaff(false);
        return;
      }

      setStaffId(userId);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;

      const allowed = ['barista', 'admin'].includes(profile?.role);
      setIsStaff(allowed);

      if (!allowed) return;

      const { data: locationRows, error: locationError } = await supabase
        .from('locations')
        .select('id, title, short_title, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (locationError) throw locationError;

      const locationList = locationRows || [];
      setLocations(locationList);

      const firstLocation = locationList[0] || null;
      setSelectedLocation(firstLocation);

      if (firstLocation?.id) {
        await Promise.all([
          loadMenuByLocation(firstLocation.id),
          loadTodayStats(firstLocation.id),
        ]);
      }
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося підготувати аналітику');
    } finally {
      setCheckingRole(false);
    }
  }

  async function loadMenuByLocation(locationId) {
    try {
      setLoadingMenu(true);

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
              is_active
            )
          )
        `)
        .eq('location_id', locationId)
        .eq('is_active', true)
        .eq('is_available', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const map = new Map();

      for (const row of data || []) {
        const item = row?.item_size?.item;
        const size = row?.item_size;

        if (!item?.id || !size?.id) continue;

        if (!map.has(item.id)) {
          map.set(item.id, {
            id: item.id,
            title: item.title || item.name || 'Без назви',
            sizes: [],
          });
        }

        map.get(item.id).sizes.push({
          id: size.id,
          size_label: size.size_label,
          volume_ml: size.volume_ml,
          price: Number(row.price || 0),
        });
      }

      const items = Array.from(map.values()).map((item) => ({
        ...item,
        sizes: item.sizes.sort((a, b) => Number(a.price) - Number(b.price)),
      }));

      setMenuItems(items);
      setSelectedItemId('');
      setSelectedSizeId('');
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося завантажити товари');
    } finally {
      setLoadingMenu(false);
    }
  }

  async function loadTodayStats(locationId) {
  try {
    setLoadingStats(true);

    const today = new Date().toISOString().slice(0, 10);

    const { data: salesRows, error: salesError } = await supabase
      .from('sales')
      .select('id, total_amount')
      .eq('location_id', locationId)
      .eq('sale_date', today);

    if (salesError) throw salesError;

    const saleIds = (salesRows || []).map((x) => x.id);

    if (!saleIds.length) {
      setTodaySales([]);
      setTodayTotal(0);
      return;
    }

    const { data: itemRows, error: itemsError } = await supabase
      .from('sale_items')
      .select('id, sale_id, item_title, size_label, qty, unit_price, line_total')
      .in('sale_id', saleIds);

    if (itemsError) throw itemsError;

    setTodaySales(itemRows || []);
    setTodayTotal(
      (salesRows || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0)
    );
  } catch (e) {
    Alert.alert('Помилка', e?.message || 'Не вдалося завантажити статистику');
  } finally {
    setLoadingStats(false);
  }
}

  async function handleSelectLocation(location) {
    setSelectedLocation(location);
    setCart([]);
    setSelectedItemId('');
    setSelectedSizeId('');
    await Promise.all([
      loadMenuByLocation(location.id),
      loadTodayStats(location.id),
    ]);
  }

  function handleSelectItem(itemId) {
    setSelectedItemId(itemId);
    setSelectedSizeId('');
  }

  function handleAddRow() {
    if (!selectedLocation?.id) {
      Alert.alert('Увага', 'Оберіть локацію');
      return;
    }

    if (!selectedItem) {
      Alert.alert('Увага', 'Оберіть товар');
      return;
    }

    if (!selectedSize) {
      Alert.alert('Увага', 'Оберіть розмір');
      return;
    }

    const qtyNumber = Number(qty);
    if (!Number.isInteger(qtyNumber) || qtyNumber <= 0) {
      Alert.alert('Увага', 'Кількість має бути більше 0');
      return;
    }

    const lineTotal = Number(selectedSize.price) * qtyNumber;

    setCart((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random()}`,
        menu_item_id: selectedItem.id,
        menu_item_size_id: selectedSize.id,
        item_title: selectedItem.title,
        size_label: selectedSize.size_label || '',
        qty: qtyNumber,
        unit_price: Number(selectedSize.price),
        line_total: lineTotal,
      },
    ]);

    setQty('1');
  }

  function handleRemoveRow(rowId) {
    setCart((prev) => prev.filter((row) => row.id !== rowId));
  }

  async function handleSaveSale() {
    if (!staffId) {
      Alert.alert('Помилка', 'Не знайдено staff id');
      return;
    }

    if (!selectedLocation?.id) {
      Alert.alert('Увага', 'Оберіть локацію');
      return;
    }

    if (!cart.length) {
      Alert.alert('Увага', 'Додайте хоча б один товар');
      return;
    }

    try {
      setSaving(true);

      const totalAmount = cart.reduce((sum, row) => sum + Number(row.line_total || 0), 0);

      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          location_id: selectedLocation.id,
          created_by: staffId,
          sale_date: new Date().toISOString().slice(0, 10),
          total_amount: totalAmount,
          comment: comment.trim() || null,
        })
        .select('id')
        .single();

      if (saleError) throw saleError;

      const rows = cart.map((row) => ({
        sale_id: sale.id,
        menu_item_id: row.menu_item_id,
        menu_item_size_id: row.menu_item_size_id,
        item_title: row.item_title,
        size_label: row.size_label || null,
        qty: row.qty,
        unit_price: row.unit_price,
        line_total: row.line_total,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(rows);

      if (itemsError) throw itemsError;

      Alert.alert('Готово', `Продаж збережено на суму ${money(totalAmount)}`);

      setCart([]);
      setComment('');
      setQty('1');

      await loadTodayStats(selectedLocation.id);
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося зберегти продаж');
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

  if (!isStaff) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Аналітика продажів</Text>
          <Text style={styles.text}>Доступ лише для бариста або адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Аналітика продажів</Text>
        <Text style={styles.text}>
          Оберіть локацію, додайте продані товари, сума порахується автоматично.
        </Text>

        <View style={styles.locationsRow}>
          {locations.map((location) => {
            const active = selectedLocation?.id === location.id;

            return (
              <Pressable
                key={location.id}
                style={[styles.locationButton, active && styles.locationButtonActive]}
                onPress={() => handleSelectLocation(location)}
              >
                <Text style={[styles.locationButtonText, active && styles.locationButtonTextActive]}>
                  {location.short_title || location.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Товар</Text>

          {loadingMenu ? (
            <ActivityIndicator size="small" color={colors.cherry} />
          ) : (
            <>
              <View style={styles.chipsWrap}>
                {menuItems.map((item) => {
                  const active = selectedItemId === item.id;

                  return (
                    <Pressable
                      key={item.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => handleSelectItem(item.id)}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {item.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectedItem ? (
                <>
                  <Text style={styles.label}>Розмір</Text>
                  <View style={styles.chipsWrap}>
                    {selectedItem.sizes.map((size) => {
                      const active = selectedSizeId === size.id;

                      return (
                        <Pressable
                          key={size.id}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setSelectedSizeId(size.id)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {size.size_label}
                            {size.volume_ml ? ` · ${size.volume_ml} мл` : ''}
                            {` · ${money(size.price)}`}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              <Text style={styles.label}>Кількість</Text>
              <TextInput
                style={styles.input}
                value={qty}
                onChangeText={setQty}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.previewText}>
                Ціна: {selectedSize ? money(selectedSize.price) : '—'}
              </Text>
              <Text style={styles.previewText}>
                Сума рядка:{' '}
                {selectedSize ? money(Number(selectedSize.price || 0) * Number(qty || 0)) : '—'}
              </Text>

              <Pressable style={styles.primaryButton} onPress={handleAddRow}>
                <Text style={styles.primaryButtonText}>Додати в продаж</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Поточний продаж</Text>

          {!cart.length ? (
            <Text style={styles.emptyText}>Поки що жодного рядка</Text>
          ) : (
            <FlatList
              data={cart}
              scrollEnabled={false}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 10 }}
              renderItem={({ item }) => (
                <View style={styles.saleRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleRowTitle}>
                      {item.item_title} {item.size_label ? `· ${item.size_label}` : ''}
                    </Text>
                    <Text style={styles.saleRowMeta}>
                      {item.qty} × {money(item.unit_price)}
                    </Text>
                  </View>

                  <Text style={styles.saleRowTotal}>{money(item.line_total)}</Text>

                  <Pressable onPress={() => handleRemoveRow(item.id)} style={styles.removeButton}>
                    <Text style={styles.removeButtonText}>×</Text>
                  </Pressable>
                </View>
              )}
            />
          )}

          <Text style={styles.label}>Коментар</Text>
          <TextInput
            style={[styles.input, styles.commentInput]}
            value={comment}
            onChangeText={setComment}
            placeholder="Необов'язково"
            placeholderTextColor={colors.textMuted}
            multiline
          />

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Разом</Text>
            <Text style={styles.totalValue}>{money(cartTotal)}</Text>
          </View>

          <Pressable
            style={[styles.primaryButton, saving && styles.buttonDisabled]}
            onPress={handleSaveSale}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>
              {saving ? 'Збереження...' : 'Зберегти продаж'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Статистика за сьогодні</Text>
          <Text style={styles.previewText}>
            Локація: {selectedLocation?.title || '—'}
          </Text>
          <Text style={styles.previewText}>
            Загальна виручка: {loadingStats ? '...' : money(todayTotal)}
          </Text>

          {!groupedTodayStats.length ? (
            <Text style={styles.emptyText}>За сьогодні записів поки немає</Text>
          ) : (
            <FlatList
              data={groupedTodayStats}
              scrollEnabled={false}
              keyExtractor={(item) => item.key}
              contentContainerStyle={{ gap: 10, marginTop: 12 }}
              renderItem={({ item }) => (
                <View style={styles.statRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.saleRowTitle}>
                      {item.item_title} {item.size_label ? `· ${item.size_label}` : ''}
                    </Text>
                    <Text style={styles.saleRowMeta}>К-сть: {item.qty}</Text>
                  </View>
                  <Text style={styles.saleRowTotal}>{money(item.total)}</Text>
                </View>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 120,
    gap: 16,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  locationsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
    backgroundColor: 'rgba(255,45,85,0.10)',
    borderColor: colors.cherry,
  },
  locationButtonText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  locationButtonTextActive: {
    color: colors.cherry,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: {
    borderColor: colors.cherry,
    backgroundColor: 'rgba(255,45,85,0.10)',
  },
  chipText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.cherry,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 8,
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
  commentInput: {
    minHeight: 90,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  previewText: {
    color: colors.textSoft,
    fontSize: 14,
    marginTop: 8,
  },
  primaryButton: {
    marginTop: 16,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#04120C',
    fontSize: 15,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  saleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.white06,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    padding: 12,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.white06,
  },
  saleRowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  saleRowMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  saleRowTotal: {
    color: colors.green,
    fontSize: 14,
    fontWeight: '800',
  },
  removeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,59,48,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#FF6B6B',
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  totalBox: {
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(45,211,111,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(45,211,111,0.25)',
  },
  totalLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  totalValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 6,
  },
});