import { Slot, useRouter, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform, StatusBar, BackHandler, Animated } from "react-native";
import { ThemeProvider, useTheme } from "../components/ThemeProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import Toast from 'react-native-toast-message';

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior),
});

// Animated wrapper for theme transitions
function AnimatedSlot() {
  const { fadeAnim, currentTheme } = useTheme();

  // Update status bar based on theme
  const barStyle =
    currentTheme === 'solarDawn' || currentTheme === 'zenGarden'
      ? 'dark-content'
      : 'light-content';

  return (
    <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <StatusBar
        barStyle={barStyle}
        backgroundColor="transparent"
        translucent={true}
      />
      <Slot />
    </Animated.View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'android' && pathname?.startsWith('/(tabs)')) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        router.replace('/(tabs)/focus');
        return true;
      });
      return () => backHandler.remove();
    }
  }, [router, pathname]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {/* Render child routes with fade animation and adaptive status bar */}
        <AnimatedSlot />
        {/* Toast notifications - must be last child */}
        <Toast />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
