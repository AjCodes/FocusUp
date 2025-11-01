import React, { useRef } from 'react';
import { View, PanResponder, Animated, StyleSheet } from 'react-native';
import { useTheme } from './ThemeProvider';
import { Ionicons } from '@expo/vector-icons';

interface SwipeableRowProps {
  children: React.ReactNode;
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  rightActionColor?: string;
  leftActionColor?: string;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
}

const SWIPE_THRESHOLD = 80;

export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  rightActionColor = '#10B981',
  leftActionColor = '#EF4444',
  rightIcon = 'checkmark-circle',
  leftIcon = 'trash',
  disabled = false,
}) => {
  const { colors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled && (!!onSwipeRight || !!onSwipeLeft),
      onMoveShouldSetPanResponder: () => !disabled && (!!onSwipeRight || !!onSwipeLeft),
      onPanResponderGrant: () => {
        translateX.setOffset(translateX._value);
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = gestureState.dx;
        // Constrain swiping to reasonable bounds
        const maxSwipe = 150;
        const constrainedX = Math.max(-maxSwipe, Math.min(maxSwipe, newX));
        translateX.setValue(constrainedX);
      },
      onPanResponderRelease: (_, gestureState) => {
        translateX.flattenOffset();
        const swipeDistance = gestureState.dx;
        const swipeVelocity = gestureState.vx;

        if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 0.5) {
          // Swipe right
          if (onSwipeRight) {
            Animated.spring(translateX, {
              toValue: 300,
              useNativeDriver: true,
              tension: 50,
            }).start(() => {
              onSwipeRight();
              translateX.setValue(0);
            });
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        } else if (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -0.5) {
          // Swipe left
          if (onSwipeLeft) {
            Animated.spring(translateX, {
              toValue: -300,
              useNativeDriver: true,
              tension: 50,
            }).start(() => {
              onSwipeLeft();
              translateX.setValue(0);
            });
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
            }).start();
          }
        } else {
          // Reset to center
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const rightActionOpacity = translateX.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const leftActionOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={styles.backgroundActions}>
        <Animated.View
          style={[
            styles.rightAction,
            {
              backgroundColor: rightActionColor,
              opacity: rightActionOpacity,
            },
          ]}
        >
          <Ionicons name={rightIcon} size={28} color="#FFFFFF" />
        </Animated.View>
        <Animated.View
          style={[
            styles.leftAction,
            {
              backgroundColor: leftActionColor,
              opacity: leftActionOpacity,
            },
          ]}
        >
          <Ionicons name={leftIcon} size={28} color="#FFFFFF" />
        </Animated.View>
      </View>

      {/* Foreground Content */}
      <Animated.View
        style={[
          styles.foreground,
          {
            transform: [{ translateX }] as any,
          },
        ]}
        {...panResponder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  backgroundActions: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rightAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  leftAction: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  foreground: {
    backgroundColor: 'transparent',
  },
});

