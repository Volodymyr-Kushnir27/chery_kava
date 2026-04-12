import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { colors, metrics } from "../../src/constants/theme";

export default function StaffHomeScreen() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadRole();
  }, []);

  async function loadRole() {
    try {
      setLoading(true);

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
      console.log("staff role error:", e?.message);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
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

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.title}>Staff</Text>
          <Text style={styles.text}>Доступ лише для адміністратора.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Адмін-панель</Text>
        <Text style={styles.text}>Керування меню Cherry Kava.</Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/staff/menu")}
        >
          <Text style={styles.buttonText}>Відкрити керування меню</Text>
        </Pressable>
      </View>
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
    flex: 1,
    padding: metrics.screenPadding,
    justifyContent: "center",
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  text: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.cherry,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
});