import { useEffect, useMemo, useState } from 'react';
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
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { supabase } from '../../src/lib/supabase';
import { colors, metrics } from '../../src/constants/theme';

export default function StaffCustomersScreen() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [savingId, setSavingId] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    try {
      setLoading(true);

      const { data, error } = await supabase.rpc('list_profiles_admin');

      if (error) throw error;

      setRows(data || []);
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося завантажити клієнтів');
    } finally {
      setLoading(false);
    }
  }

  async function changeRole(userId, role) {
    try {
      setSavingId(userId);

      const { data, error } = await supabase.rpc('set_profile_role', {
        p_user_id: userId,
        p_role: role,
      });

      if (error) throw error;

      if (!data?.success) {
        Alert.alert('Помилка', data?.message || 'Не вдалося змінити роль');
        return;
      }

      setRows((prev) =>
        prev.map((item) =>
          item.id === userId ? { ...item, role } : item
        )
      );
    } catch (e) {
      Alert.alert('Помилка', e?.message || 'Не вдалося змінити роль');
    } finally {
      setSavingId('');
    }
  }

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

    return rows.filter((item) => {
      const fullName = [item.first_name, item.last_name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const email = String(item.email || '').toLowerCase();
      const phone = String(item.phone || '').toLowerCase();
      const phoneDigits = normalizePhone(item.phone);
      const qDigits = normalizePhone(q);
      const refCode = String(item.referral_code || '').toLowerCase();

      return (
        fullName.includes(q) ||
        email.includes(q) ||
        phone.includes(q) ||
        (qDigits && phoneDigits.includes(qDigits)) ||
        refCode.includes(q)
      );
    });
  }, [rows, query]);

  function getRoleBadgeStyle(role) {
    if (role === 'admin') return styles.roleAdmin;
    if (role === 'barista') return styles.roleBarista;
    return styles.roleCustomer;
  }

  function getRoleLabel(role) {
    if (role === 'admin') return 'admin';
    if (role === 'barista') return 'barista';
    return 'customer';
  }

  function renderItem({ item }) {
    const busy = savingId === item.id;
    const fullName =
      [item.first_name, item.last_name].filter(Boolean).join(' ') || 'Без імені';

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.nameWrap}>
            <Text style={styles.name} numberOfLines={1}>
              {fullName}
            </Text>

            <View style={[styles.roleBadge, getRoleBadgeStyle(item.role)]}>
              <Text style={styles.roleBadgeText}>{getRoleLabel(item.role)}</Text>
            </View>
          </View>

          <Text style={styles.beans}>🌰 {item.bean_balance ?? 0}</Text>
        </View>

        <View style={styles.metaBlock}>
          <Text style={styles.meta} numberOfLines={1}>
            {item.email || '—'}
          </Text>
          <Text style={styles.meta}>{item.phone || '—'}</Text>
          <Text style={styles.meta}>Код: {item.referral_code || '—'}</Text>
          <Text style={styles.meta}>
            {item.is_active ? 'Активний' : 'Неактивний'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <Pressable
            style={[
              styles.smallBtn,
              styles.smallBtnAdmin,
              busy && styles.btnDisabled,
            ]}
            onPress={() => changeRole(item.id, 'admin')}
            disabled={busy}
          >
            <Text style={styles.smallBtnText}>admin</Text>
          </Pressable>

          <Pressable
            style={[
              styles.smallBtn,
              styles.smallBtnBarista,
              busy && styles.btnDisabled,
            ]}
            onPress={() => changeRole(item.id, 'barista')}
            disabled={busy}
          >
            <Text style={styles.smallBtnText}>barista</Text>
          </Pressable>

          <Pressable
            style={[
              styles.smallBtn,
              styles.smallBtnCustomer,
              busy && styles.btnDisabled,
            ]}
            onPress={() => changeRole(item.id, 'customer')}
            disabled={busy}
          >
            <Text style={styles.smallBtnText}>customer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.cherry} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        data={filteredRows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerWrap}>
            <Text style={styles.title}>Клієнти</Text>
            <Text style={styles.subtitle}>
              Пошук по номеру, email, імені або реферальному коду
            </Text>

            <View style={styles.searchWrap}>
              <MaterialIcons
                name="search"
                size={18}
                color={colors.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="Пошук по телефону або email"
                placeholderTextColor={colors.textMuted}
                keyboardType="default"
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} style={styles.clearBtn}>
                  <MaterialIcons name="close" size={18} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <Text style={styles.counter}>
              Знайдено: {filteredRows.length}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>Нічого не знайдено</Text>
          </View>
        }
      />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    padding: metrics.screenPadding,
    paddingBottom: 100,
  },
  headerWrap: {
    marginBottom: 12,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 10,
  },
  searchWrap: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 10,
  },
  clearBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.card2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  nameWrap: {
    flex: 1,
    gap: 8,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  beans: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  roleAdmin: {
    backgroundColor: 'rgba(255,45,85,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,45,85,0.35)',
  },
  roleBarista: {
    backgroundColor: 'rgba(59,130,246,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
  },
  roleCustomer: {
    backgroundColor: 'rgba(16,185,129,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
  },
  roleBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  metaBlock: {
    marginTop: 10,
    gap: 4,
  },
  meta: {
    color: colors.textSoft,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  smallBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  smallBtnAdmin: {
    backgroundColor: colors.cherry,
  },
  smallBtnBarista: {
    backgroundColor: '#3B82F6',
  },
  smallBtnCustomer: {
    backgroundColor: '#10B981',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  smallBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
});