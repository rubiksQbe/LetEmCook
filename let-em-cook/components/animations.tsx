import Colors from "@/constants/Colors";
import React, { useEffect } from "react";
import { DimensionValue, StyleSheet, ViewStyle } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

// ============= ANIMATED PRESSABLE CARD =============
// Subtle scale down when pressed, spring back on release

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

interface PressableChildProps {
  onPress?: () => void;
  onLongPress?: () => void;
}

export function AnimatedPressable({
  children,
  onPress,
  onLongPress,
  style,
  disabled = false,
}: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.985, {
      damping: 20,
      stiffness: 400,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 20,
      stiffness: 400,
    });
  };

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Animated.View
        onTouchStart={disabled ? undefined : handlePressIn}
        onTouchEnd={disabled ? undefined : handlePressOut}
        onTouchCancel={disabled ? undefined : handlePressOut}
      >
        {React.cloneElement(
          children as React.ReactElement<PressableChildProps>,
          {
            onPress: disabled ? undefined : onPress,
            onLongPress: disabled ? undefined : onLongPress,
          }
        )}
      </Animated.View>
    </Animated.View>
  );
}

// ============= ANIMATED SCALE BUTTON =============
// For vote buttons, like buttons, etc. - subtle bounce when pressed

interface AnimatedScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
  bounceScale?: number;
}

export function AnimatedScaleButton({
  children,
  onPress,
  style,
  disabled = false,
  bounceScale = 1.05,
}: AnimatedScaleButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSequence(
      withSpring(bounceScale, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    onPress?.();
  };

  return (
    <Animated.View
      style={[style, animatedStyle]}
      onTouchEnd={disabled ? undefined : handlePress}
    >
      {children}
    </Animated.View>
  );
}

// ============= STAGGERED FADE IN =============
// For list items that fade in one after another - subtle

interface FadeInViewProps {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
  duration?: number;
  delay?: number;
}

export function FadeInView({
  children,
  index,
  style,
  duration = 250,
  delay = 30,
}: FadeInViewProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    opacity.value = withDelay(
      index * delay,
      withTiming(1, { duration, easing: Easing.out(Easing.ease) })
    );
    translateY.value = withDelay(
      index * delay,
      withTiming(0, { duration, easing: Easing.out(Easing.ease) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

// ============= PULSE ANIMATION =============
// For highlighting items or success feedback

interface PulseViewProps {
  children: React.ReactNode;
  active?: boolean;
  style?: ViewStyle;
}

export function PulseView({ children, active = false, style }: PulseViewProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

// ============= SKELETON LOADER =============
// Shimmer effect for loading states

interface SkeletonProps {
  width: DimensionValue;
  height: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width,
  height,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmer.value, [0, 1], [-100, 100]);
    return {
      transform: [{ translateX }],
    };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: "#E0E0E0",
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.4)",
          },
          animatedStyle,
        ]}
      />
    </Animated.View>
  );
}

// ============= CHALLENGE CARD SKELETON =============
// Pre-built skeleton for challenge cards

export function ChallengeCardSkeleton() {
  return (
    <Animated.View style={skeletonStyles.card}>
      <Skeleton width="100%" height={160} borderRadius={16} />
      <Animated.View style={skeletonStyles.content}>
        <Skeleton
          width="70%"
          height={20}
          borderRadius={4}
          style={{ marginBottom: 8 }}
        />
        <Skeleton width="40%" height={16} borderRadius={4} />
      </Animated.View>
    </Animated.View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    marginTop: 12,
    paddingHorizontal: 4,
  },
});

// ============= VOTE BUTTON WITH ANIMATION =============
// Animated vote button with subtle bounce

interface AnimatedVoteButtonProps {
  isActive: boolean;
  voteType: "up" | "down";
  count: number;
  onPress: () => void;
  style?: ViewStyle;
}

export function AnimatedVoteButton({
  isActive,
  voteType,
  count,
  onPress,
  style,
}: AnimatedVoteButtonProps) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    // Subtle bounce animation
    scale.value = withSequence(
      withSpring(1.08, { damping: 12, stiffness: 400 }),
      withSpring(1, { damping: 15, stiffness: 400 })
    );
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} onTouchEnd={handlePress}>
      {/* Render children or default vote button */}
    </Animated.View>
  );
}

// ============= PIN SUCCESS ANIMATION =============
// Checkmark animation when pinning

interface PinSuccessAnimationProps {
  visible: boolean;
  onComplete?: () => void;
}

export function PinSuccessAnimation({
  visible,
  onComplete,
}: PinSuccessAnimationProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withSpring(1.2, { damping: 8, stiffness: 300 }),
        withSpring(1, { damping: 12, stiffness: 400 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(800, withTiming(0, { duration: 300 }))
      );

      // Call onComplete after animation
      if (onComplete) {
        setTimeout(onComplete, 1300);
      }
    } else {
      scale.value = 0;
      opacity.value = 0;
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[pinStyles.container, animatedStyle]}>
      <Animated.View style={pinStyles.checkCircle}>
        <Animated.Text style={pinStyles.checkmark}>✓</Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const pinStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 1000,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.palette.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: Colors.palette.darkest,
  },
  checkmark: {
    fontSize: 40,
    color: Colors.palette.darkest,
    fontWeight: "bold",
  },
});

// ============= SLIDE UP MODAL =============
// For modal entrance animations

interface SlideUpModalProps {
  children: React.ReactNode;
  visible: boolean;
  style?: ViewStyle;
}

export function SlideUpModal({ children, visible, style }: SlideUpModalProps) {
  const translateY = useSharedValue(300);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withTiming(300, { duration: 250 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}

// ============= FLOATING ACTION BUTTON =============
// Animated FAB with subtle press feedback

interface AnimatedFABProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  visible?: boolean;
}

export function AnimatedFAB({
  children,
  onPress,
  style,
  visible = true,
}: AnimatedFABProps) {
  const scale = useSharedValue(visible ? 1 : 0);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSpring(visible ? 1 : 0, {
      damping: 15,
      stiffness: 300,
    });
  }, [visible]);

  const handlePressIn = () => {
    pressScale.value = withSpring(0.95, { damping: 20, stiffness: 400 });
  };

  const handlePressOut = () => {
    pressScale.value = withSpring(1, { damping: 20, stiffness: 400 });
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pressScale.value }],
  }));

  return (
    <Animated.View
      style={[style, animatedStyle]}
      onTouchStart={handlePressIn}
      onTouchEnd={() => {
        handlePressOut();
        onPress?.();
      }}
      onTouchCancel={handlePressOut}
    >
      {children}
    </Animated.View>
  );
}

// ============= CONFETTI BURST =============
// Simple confetti-like animation for celebrations

interface ConfettiBurstProps {
  visible: boolean;
  onComplete?: () => void;
}

export function ConfettiBurst({ visible, onComplete }: ConfettiBurstProps) {
  const particles = Array.from({ length: 8 }, (_, i) => i);

  return visible ? (
    <Animated.View style={confettiStyles.container}>
      {particles.map((i) => (
        <ConfettiParticle
          key={i}
          index={i}
          onComplete={i === 0 ? onComplete : undefined}
        />
      ))}
    </Animated.View>
  ) : null;
}

function ConfettiParticle({
  index,
  onComplete,
}: {
  index: number;
  onComplete?: () => void;
}) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotation = useSharedValue(0);

  const angle = (index / 8) * Math.PI * 2;
  const distance = 100 + Math.random() * 50;

  useEffect(() => {
    translateX.value = withTiming(Math.cos(angle) * distance, {
      duration: 800,
    });
    translateY.value = withSequence(
      withTiming(-50, { duration: 300 }),
      withTiming(100, { duration: 500 })
    );
    rotation.value = withTiming(360 * (Math.random() > 0.5 ? 1 : -1), {
      duration: 800,
    });
    opacity.value = withDelay(500, withTiming(0, { duration: 300 }));

    if (onComplete) {
      setTimeout(onComplete, 800);
    }
  }, []);

  const colors = [
    Colors.palette.accent,
    Colors.palette.blue,
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
  ];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        confettiStyles.particle,
        { backgroundColor: colors[index % colors.length] },
        animatedStyle,
      ]}
    />
  );
}

const confettiStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
    zIndex: 1000,
  },
  particle: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

// ============= HEART BURST =============
// Heart animation for likes

interface HeartBurstProps {
  visible: boolean;
  style?: ViewStyle;
}

export function HeartBurst({ visible, style }: HeartBurstProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSequence(
        withSpring(1.5, { damping: 6, stiffness: 300 }),
        withSpring(0, { damping: 10, stiffness: 200 })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(300, withTiming(0, { duration: 200 }))
      );
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[heartStyles.container, style, animatedStyle]}>
      <Animated.Text style={heartStyles.heart}>❤️</Animated.Text>
    </Animated.View>
  );
}

const heartStyles = StyleSheet.create({
  container: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  heart: {
    fontSize: 50,
  },
});

// ============= SHAKE ANIMATION =============
// For error feedback or attention

interface ShakeViewProps {
  children: React.ReactNode;
  shake: boolean;
  style?: ViewStyle;
}

export function ShakeView({ children, shake, style }: ShakeViewProps) {
  const translateX = useSharedValue(0);

  useEffect(() => {
    if (shake) {
      translateX.value = withSequence(
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(-10, { duration: 50 }),
        withTiming(10, { duration: 50 }),
        withTiming(0, { duration: 50 })
      );
    }
  }, [shake]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
  );
}
