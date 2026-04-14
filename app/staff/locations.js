import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/['`’]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-а-яіїєґ]/gi, '-')
    .replace(/\-+/g, '-')
    .replace(/^\-|\-$/g, '');
}

export default function StaffLocationsScreen() {
  const listRef = useRef(null);

  const [checkingRole, setCheckingRole] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [title, setTitle] = useState('');
  const [shortTitle, setShortTitle] = useState('');
  const [address, setAddress] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    bootstrap();
  }, []);

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('locations')
        .select('id, slug, title, short_title, address, is_active, sort_order, created_at')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLocations(data || []);
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося завантажити локації');
    } finally {
      setLoading(false);
    }
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

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      const admin = data?.role === 'admin';
      setIsAdmin(admin);

      if (admin) {
        await loadLocations();
      }
    } catch (e) {
      setIsAdmin(false);
    } finally {
      setCheckingRole(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setShortTitle('');
    setAddress('');
  }

  function handleEdit(item) {
    setEditingId(item.id);
    setTitle(item.title || '');
    setShortTitle(item.short_title || '');
    setAddress(item.address || '');

    requestAnimationFrame(() => {
      listRef.current?.scrollToOffset?.({ offset: 0, animated: true });
    });
  }

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert('Увага', 'Введіть назву локації');
      return;
    }

    try {
      setSaving(true);

      const computedSlug = slugify(shortTitle.trim() || title.trim());

      if (editingId) {
        const { error } = await supabase
          .from('locations')
          .update({
            name: title.trim(),
            title: title.trim(),
            short_title: shortTitle.trim() || title.trim(),
            slug: computedSlug,
            address: address.trim() || null,
          })
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Готово', 'Локацію оновлено');
      } else {
        const nextSortOrder =
          locations.length > 0
            ? Math.max(...locations.map((x) => Number(x.sort_order || 0))) + 1
            : 1;

        const { error } = await supabase.from('locations').insert({
          name: title.trim(),
          title: title.trim(),
          short_title: shortTitle.trim() || title.trim(),
          slug: computedSlug,
          address: address.trim() || null,
          is_active: true,
          sort_order: nextSortOrder,
        });

        if (error) throw error;
        Alert.alert('Готово', 'Локацію створено');
      }

      resetForm();
      await loadLocations();
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося зберегти локацію');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item) {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: !item.is_active })
        .eq('id', item.id);

      if (error) throw error;

      if (editingId === item.id) {
        resetForm();
      }

      await loadLocations();
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося змінити статус локації');
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
          <Text style={styles.title}>Локації</Text>
          <Text style={styles.text}>Доступ лише для адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        ref={listRef}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <Text style={styles.title}>Локації</Text>
            <Text style={styles.text}>Додавання, редагування і вимкнення локацій.</Text>

            <View style={styles.formCard}>
              <Text style={styles.formTitle}>
                {editingId ? 'Редагування локації' : 'Нова локація'}
              </Text>

              <Text style={styles.label}>Назва локації</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Наприклад: Cherry Kava Main"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Коротка назва</Text>
              <TextInput
                style={styles.input}
                value={shortTitle}
                onChangeText={setShortTitle}
                placeholder="Наприклад: Kava Main"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Адреса</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Наприклад: Одеса, вул. ..."
                placeholderTextColor={colors.textMuted}
              />

              <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
                <Text style={styles.saveButtonText}>
                  {saving
                    ? 'Збереження...'
                    : editingId
                      ? 'Зберегти зміни'
                      : 'Додати локацію'}
                </Text>
              </Pressable>

              {editingId ? (
                <Pressable style={styles.cancelButton} onPress={resetForm}>
                  <Text style={styles.cancelButtonText}>Скасувати редагування</Text>
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.sectionTitle}>Існуючі локації</Text>
            <Text style={styles.sectionText}>
              Натисніть “Редагувати” — форма зверху автоматично відкриється.
            </Text>
          </View>
        }
        data={locations}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadLocations}
        contentContainerStyle={styles.container}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.title || item.short_title || item.slug}</Text>

            {!!item.short_title && (
              <Text style={styles.cardMeta}>Коротка назва: {item.short_title}</Text>
            )}

            {!!item.address && <Text style={styles.cardText}>{item.address}</Text>}
            {!!item.slug && <Text style={styles.cardMeta}>slug: {item.slug}</Text>}
            <Text style={styles.cardMeta}>
              Статус: {item.is_active ? 'Активна' : 'Вимкнена'}
            </Text>

            <View style={styles.cardActions}>
              <Pressable style={styles.editButton} onPress={() => handleEdit(item)}>
                <Text style={styles.editButtonText}>Редагувати</Text>
              </Pressable>

              <Pressable
                style={[styles.toggleButton, !item.is_active && styles.toggleButtonPassive]}
                onPress={() => handleToggle(item)}
              >
                <Text style={styles.toggleButtonText}>
                  {item.is_active ? 'Вимкнути локацію' : 'Повернути в додаток'}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>Локацій поки немає</Text>
            </View>
          ) : null
        }
      />
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
    paddingHorizontal: metrics.screenPadding,
    paddingBottom: 120,
    gap: 12,
  },
  headerContent: {
    paddingHorizontal: metrics.screenPadding,
    paddingTop: metrics.screenPadding,
    paddingBottom: 14,
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
    marginBottom: 16,
  },
  formCard: {
    backgroundColor: colors.card2,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  formTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
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
  saveButton: {
    marginTop: 18,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#04120C',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelButton: {
    marginTop: 10,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 18,
  },
  sectionText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 6,
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  cardText: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 6,
  },
  cardMeta: {
    color: colors.textSoft,
    fontSize: 12,
    marginTop: 6,
  },
  cardActions: {
    marginTop: 14,
    gap: 10,
  },
  editButton: {
    minHeight: 42,
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
  toggleButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.cherry,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleButtonPassive: {
    backgroundColor: colors.green,
  },
  toggleButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
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
});