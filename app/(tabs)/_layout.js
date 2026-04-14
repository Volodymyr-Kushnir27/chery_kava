import { Tabs, useSegments } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/constants/theme';

function HeaderBrand() {
  return (
    <View style={styles.brandWrap}>
      <Text style={styles.brandLine}>CHERRY KAVA</Text>
      <Text style={styles.brandTagline}>Твоя кава — твій баланс</Text>
    </View>
  );
}

function HeaderLogo() {
  return (
    <Image
      source={require('../../assets/images/Logo1.png')}
      style={styles.headerLogo}
      resizeMode="contain"
    />
  );
}

function HeaderBeans() {
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const segments = useSegments();

  const loadBalance = useCallback(async () => {
    try {
      setLoading(true);

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      const userId = authData?.user?.id;

      if (!userId) {
        setBalance(0);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('bean_balance')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      setBalance(data?.bean_balance ?? 0);
    } catch (e) {
      console.log('header balance error:', e?.message);
      setBalance(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    loadBalance();
  }, [segments, loadBalance]);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadBalance();
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [loadBalance]);

  return (
    <View style={styles.headerBeans}>
      <Image
        source={require('../../assets/images/Zerno.png')}
        style={styles.beanIcon}
        resizeMode="contain"
      />
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Text style={styles.beanText}>{balance}</Text>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.bg,
          height: 86,
        },
        headerShadowVisible: false,
        headerTitle: () => <HeaderBrand />,
        headerTitleAlign: 'center',
        headerLeft: () => (
          <View style={styles.headerLeftWrap}>
            <HeaderLogo />
          </View>
        ),
        headerRight: () => (
          <View style={styles.headerRightWrap}>
            <HeaderBeans />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.white08,
          height: 72,
          paddingTop: 8,
          paddingBottom: 10,
        },
        tabBarActiveTintColor: colors.cherry,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        sceneStyle: {
          backgroundColor: colors.bg,
        },
      }}
    >
      <Tabs.Screen
        name="menu"
        options={{
          title: 'Меню',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="restaurant-menu" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="loyalty"
        options={{
          title: 'Лояльність',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-scanner" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Історія',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: 'Новини',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="campaign" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLeftWrap: {
    marginLeft: 14,
  },
  headerRightWrap: {
    marginRight: 14,
  },
  headerLogo: {
    width: 34,
    height: 34,
  },
  brandWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLine: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.3,
  },
  brandTagline: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  headerBeans: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    minWidth: 58,
    justifyContent: 'center',
  },
  beanIcon: {
    width: 18,
    height: 18,
  },
  beanText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
});