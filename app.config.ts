export default ({ config }: { config: any }) => ({
  ...config,
  name: "FocusUp",
  slug: "focusup54",
  scheme: "focusup",
  plugins: ["expo-router", "expo-notifications", "expo-web-browser"],
  ios: { supportsTablet: true, bundleIdentifier: "com.aj.focusup" },
  android: { package: "com.aj.focusup" },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  },
});
