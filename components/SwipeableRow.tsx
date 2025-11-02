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
const MAX_SWIPE_DISTANCE = 180;

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
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (disabled || (!onSwipeRight && !onSwipeLeft)) {
          return false;
        }
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
        opacity.stopAnimation();
        scale.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        const newX = gestureState.dx;
        const constrainedX = Math.max(-MAX_SWIPE_DISTANCE, Math.min(MAX_SWIPE_DISTANCE, newX));
        translateX.setValue(constrainedX);

        // Subtle scale effect while swiping
        const scaleValue = 1 - Math.abs(constrainedX) / MAX_SWIPE_DISTANCE * 0.05;
        scale.setValue(scaleValue);
      },
      onPanResponderRelease: (_, gestureState) => {
        const swipeDistance = gestureState.dx;
        const swipeVelocity = gestureState.vx;

        if (swipeDistance > SWIPE_THRESHOLD || swipeVelocity > 0.5) {
          // Swipe right
          if (onSwipeRight) {
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: 400,
                duration: 250,
                useNativeDriver: false,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: false,
              }),
              Animated.timing(scale, {
                toValue: 0.8,
                duration: 250,
                useNativeDriver: false,
              }),
            ]).start(() => {
              onSwipeRight();
              translateX.setValue(0);
              opacity.setValue(1);
              scale.setValue(1);
            });
          } else {
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: false,
                tension: 80,
                friction: 10,
              }),
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: false,
                tension: 80,
                friction: 10,
              }),
            ]).start();
          }
        } else if (swipeDistance < -SWIPE_THRESHOLD || swipeVelocity < -0.5) {
          // Swipe left
          if (onSwipeLeft) {
            Animated.parallel([
              Animated.timing(translateX, {
                toValue: -400,
                duration: 250,
                useNativeDriver: false,
              }),
              Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: false,
              }),
              Animated.timing(scale, {
                toValue: 0.8,
                duration: 250,
                useNativeDriver: false,
              }),
            ]).start(() => {
              onSwipeLeft();
              translateX.setValue(0);
              opacity.setValue(1);
              scale.setValue(1);
            });
          } else {
            Animated.parallel([
              Animated.spring(translateX, {
                toValue: 0,
                useNativeDriver: false,
                tension: 80,
                friction: 10,
              }),
              Animated.spring(scale, {
                toValue: 1,
                useNativeDriver: false,
                tension: 80,
                friction: 10,
              }),
            ]).start();
          }
        } else {
          // Reset to center
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: false,
              tension: 80,
              friction: 10,
            }),
            Animated.spring(scale, {
              toValue: 1,
              useNativeDriver: false,
              tension: 80,
              friction: 10,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const rightActionOpacity = translateX.interpolate({
    inputRange: [0, 12, SWIPE_THRESHOLD],
    outputRange: [0, 0.35, 1],
    extrapolate: 'clamp',
  });

  const leftActionOpacity = translateX.interpolate({
    inputRange: [-SWIPE_THRESHOLD, -12, 0],
    outputRange: [1, 0.35, 0],
    extrapolate: 'clamp',
  });

  const rightActionWidth = translateX.interpolate({
    inputRange: [0, MAX_SWIPE_DISTANCE],
    outputRange: [0, MAX_SWIPE_DISTANCE],
    extrapolate: 'clamp',
  });

  const leftActionWidth = translateX.interpolate({
    inputRange: [-MAX_SWIPE_DISTANCE, 0],
    outputRange: [MAX_SWIPE_DISTANCE, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Background Actions */}
      <View style={styles.backgroundActions}>
        <Animated.View
          style={[
            styles.action,
            styles.rightAction,
            {
              backgroundColor: rightActionColor,
              opacity: rightActionOpacity,
              width: rightActionWidth,
            },
          ]}
        >
          <Ionicons name={rightIcon} size={28} color="#FFFFFF" />
        </Animated.View>
        <Animated.View
          style={[
            styles.action,
            styles.leftAction,
            {
              backgroundColor: leftActionColor,
              opacity: leftActionOpacity,
              width: leftActionWidth,
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
            transform: [{ translateX }, { scale }] as any,
            opacity,
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
    borderRadius: 18,
  },
  backgroundActions: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 18,
  },
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    pointerEvents: 'none',
    justifyContent: 'center',
  },
  rightAction: {
    left: 0,
    alignItems: 'flex-start',
    paddingLeft: 20,
  },
  leftAction: {
    right: 0,
    alignItems: 'flex-end',
    paddingRight: 20,
  },
  foreground: {
    backgroundColor: 'transparent',
    borderRadius: 18,
  },
});
