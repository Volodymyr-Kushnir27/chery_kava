import 'dotenv/config';

export default {
  expo: {
    name: 'Cherry Kava',
    slug: 'chery_kava',
    icon: './assets/images/Logo1.png',
    web: {
      favicon: './assets/images/expo-symbol 2.png',
    },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
  },
};