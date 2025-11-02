import { Tabs } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, Pressable, Animated, Dimensions } from "react-native";
import AuthGate from "../../src/features/auth/AuthGate";
import { useTheme } from "../../components/ThemeProvider";

function CustomTabBar({ state, descriptors, navigation }: any) {
  const [animationValue] = useState(new Animated.Value(0));
  const { width: screenWidth } = Dimensions.get('window');
  const { colors, currentTheme } = useTheme();

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
  const preferredTabWidth = 88;
  const tabBarWidth = Math.min(availableWidth, preferredTabWidth * tabCount);
  const tabWidth = tabBarWidth / tabCount;
  const maxShellWidth = Math.min(availableWidth, tabBarWidth + 12);
  const horizontalPadding = Math.max((maxShellWidth - tabBarWidth) / 2, 0);
  const containerHeight = 48;
  const indicatorWidth = tabWidth;
  const indicatorInset = isLightTheme ? 4 : 2;
  const indicatorHeight = containerHeight - indicatorInset * 2;
  const translateInputRange = visibleRoutes.map((_: any, idx: number) => idx);
  const translateOutputRange = translateInputRange.map((idx: number) => idx * tabWidth);
  const isLightTheme = currentTheme === 'solarDawn' || currentTheme === 'zenGarden';

  const containerBackground = isLightTheme
    ? (currentTheme === 'zenGarden' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.92)')
    : 'rgba(15, 23, 42, 0.88)';
  const containerBorderColor = isLightTheme ? 'rgba(148, 163, 184, 0.25)' : 'transparent';
  const indicatorBackground = isLightTheme
    ? hexToRgba(colors.primary, 0.18)
    : hexToRgba(colors.primary, 0.25);
  const indicatorBorderColor = isLightTheme
    ? hexToRgba(colors.primary, 0.35)
    : hexToRgba(colors.primary, 0.4);
  const inactiveLabelColor = isLightTheme ? '#64748B' : '#94A3B8';
  const activeLabelColor = isLightTheme ? colors.primary : '#F1F5F9';
  const shadowColor = isLightTheme ? 'rgba(15, 23, 42, 0.25)' : colors.primary;

  const indicatorStyle = {
    position: 'absolute' as const,
    top: indicatorInset,
    left: horizontalPadding,
    width: indicatorWidth,
    height: indicatorHeight,
    backgroundColor: indicatorBackground,
    borderRadius: (containerHeight / 2) - indicatorInset,
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
        backgroundColor: containerBackground,
        borderWidth: isLightTheme ? 1 : 0,
        borderColor: containerBorderColor,
        borderRadius: containerHeight / 2 + 3,
        marginHorizontal,
        marginBottom: 16,
        height: containerHeight,
        flexDirection: 'row',
        position: 'absolute',
        bottom: 0,
        alignSelf: 'center',
        width: maxShellWidth,
        shadowColor,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isLightTheme ? 0.18 : 0.25,
        shadowRadius: isLightTheme ? 12 : 16,
        elevation: isLightTheme ? 6 : 12,
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
              fontSize: isFocused ? 15 : 14,
              fontWeight: isFocused ? '700' : '500',
              color: isFocused ? activeLabelColor : inactiveLabelColor,
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


