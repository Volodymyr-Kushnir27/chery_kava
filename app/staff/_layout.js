import { Tabs } from 'expo-router';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../src/constants/theme';

function HeaderBrand() {
  return (
    <View style={styles.brandWrap}>
      <Text style={styles.brandLine}>CHERRY KAVA</Text>
      <Text style={styles.brandTagline}>Адмін-панель</Text>
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

export default function StaffTabsLayout() {
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
        name="index"
        options={{
          href: null,
        }}
      />

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
        name="daily-code"
        options={{
          title: 'QR-код',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="qr-code-2" size={size} color={color} />
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
            <MaterialIcons name="admin-panel-settings" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="menu-form"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="news-form"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="locations"
        options={{
          href: null,
        }}
      />

      <Tabs.Screen
        name="redeem"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerLeftWrap: {
    marginLeft: 14,
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
});