import { Slot, useRouter, usePathname } from "expo-router";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";
import { Platform, StatusBar, BackHandler } from "react-native";
import { ThemeProvider } from "../components/ThemeProvider";
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
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent={true}
        />
        {/* Render child routes */}
        <Slot />
        {/* Toast notifications - must be last child */}
        <Toast />
      </ThemeProvider>
    </ErrorBoundary>
  );
}
