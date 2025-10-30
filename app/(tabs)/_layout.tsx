import { Tabs } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, Pressable, Animated, Dimensions } from "react-native";
import AuthGate from "../../src/features/auth/AuthGate";
import { useTheme } from "../../components/ThemeProvider";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const [animationValue] = useState(new Animated.Value(0));
  const { width: screenWidth } = Dimensions.get('window');
  const { colors } = useTheme();

  const hexToRgba = (hex: string, alpha: number) => {
    const normalized = hex.replace('#', '');
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const visibleRoutes = state.routes.filter((route: any) => route.name !== 'profile' && route.name !== 'settings');
  const activeRouteKey = state.routes[state.index]?.key;
  const focusedVisibleIndex = visibleRoutes.findIndex((route: any) => route.key === activeRouteKey);

  useEffect(() => {
    if (focusedVisibleIndex < 0) return;
    Animated.spring(animationValue, {
      toValue: focusedVisibleIndex,
      useNativeDriver: false,
      tension: 120,
      friction: 8,
    }).start();
  }, [focusedVisibleIndex]);

  const marginHorizontal = 16;
  const availableWidth = screenWidth - marginHorizontal * 2;
  const tabCount = visibleRoutes.length;
  const preferredTabWidth = 92;
  const tabBarWidth = Math.min(availableWidth, preferredTabWidth * tabCount);
  const tabWidth = tabBarWidth / tabCount;
  const maxShellWidth = Math.min(availableWidth, tabBarWidth + 12);
  const horizontalPadding = Math.max((maxShellWidth - tabBarWidth) / 2, 0);
  const containerHeight = 56;
  const indicatorWidth = tabWidth;
  const indicatorHeight = containerHeight;
  const translateInputRange = visibleRoutes.map((_: any, idx: number) => idx);
  const translateOutputRange = translateInputRange.map((idx: number) => idx * tabWidth);
  const indicatorBackground = hexToRgba(colors.primary, 0.25);
  const indicatorBorderColor = hexToRgba(colors.primary, 0.4);

  const indicatorStyle = {
    position: 'absolute' as const,
    top: 0,
    left: horizontalPadding,
    width: indicatorWidth,
    height: indicatorHeight,
    backgroundColor: indicatorBackground,
    borderRadius: containerHeight / 2,
    borderWidth: 1,
    borderColor: indicatorBorderColor,
    transform: [{
      translateX: animationValue.interpolate({
        inputRange: translateInputRange,
        outputRange: translateOutputRange,
        extrapolate: 'clamp',
      }),
    }],
  };

  return (
    <View
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        borderRadius: containerHeight / 2 + 3,
        marginHorizontal,
        marginBottom: 24,
        height: containerHeight,
        flexDirection: 'row',
        position: 'absolute',
        bottom: 0,
        alignSelf: 'center',
        width: maxShellWidth,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 18,
        elevation: 14,
        overflow: 'hidden',
        paddingHorizontal: horizontalPadding,
      }}
    >
      <Animated.View style={indicatorStyle} />
      {visibleRoutes.map((route: any) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;
        const displayLabel =
          typeof label === 'string'
            ? label.charAt(0).toUpperCase() + label.slice(1).toLowerCase()
            : label;
        const isFocused = route.key === activeRouteKey;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            android_ripple={{ color: 'rgba(255,255,255,0.12)' }}
            style={({ pressed }) => ({
              width: tabWidth,
              height: containerHeight,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Text style={{
              fontSize: isFocused ? 16 : 15,
              fontWeight: isFocused ? '700' : '500',
              color: isFocused ? '#F1F5F9' : '#94A3B8',
              textAlign: 'center',
              letterSpacing: 0.2,
              textTransform: 'none',
            }}>
              {displayLabel}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <AuthGate>
      <Tabs
        screenOptions={{ headerShown: false }}
        initialRouteName="focus"
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="tasks" options={{ title: 'Tasks' }} />
        <Tabs.Screen name="focus" options={{ title: 'Focus' }} />
        <Tabs.Screen name="habits" options={{ title: 'Habits' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile', href: null }} />
        <Tabs.Screen name="settings" options={{ title: 'Settings', href: null }} />
      </Tabs>
    </AuthGate>
  );
}


