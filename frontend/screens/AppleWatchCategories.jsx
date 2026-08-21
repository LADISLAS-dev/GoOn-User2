import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';

import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const ICON_SIZE = 70;

const categories = [
  '🏠',
  '🍔',
  '🚗',
  '💼',
  '🎵',
  '⚽',
  '🛒',
  '🏥',
  '📚',
  '🎬',
  '💻',
  '✈️',
  '📷',
  '🎮',
  '🐶',
  '🍕',
  '🚀',
  '❤️',
  '🏖️',
  '🧑‍💻',
];

function AppIcon({
  item,
  x,
  y,
  translateX,
  translateY,
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const centerX = width / 2;
    const centerY = height / 2;

    const currentX = x + translateX.value;
    const currentY = y + translateY.value;

    const distance = Math.sqrt(
      Math.pow(currentX - centerX, 2) +
      Math.pow(currentY - centerY, 2)
    );

    const maxDistance = 250;

    const scale =
      1.8 - Math.min(distance / maxDistance, 1);

    return {
      transform: [
        {
          translateX: currentX,
        },
        {
          translateY: currentY,
        },
        {
          scale: Math.max(scale, 0.6),
        },
      ],
      zIndex: Math.round(1000 - distance),
    };
  });

  return (
    <Animated.View
      style={[styles.icon, animatedStyle]}
    >
      <Text style={styles.emoji}>{item}</Text>
    </Animated.View>
  );
}

export default function AppleWatchCategories() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan().onUpdate(
    (event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    }
  );

  const positions = [];

  const spacing = 90;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      positions.push({
        x:
          col * spacing +
          (row % 2 ? spacing / 2 : 0),
        y: row * spacing * 0.85,
      });
    }
  }

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {positions.map((pos, index) => (
          <AppIcon
            key={index}
            item={
              categories[
                index % categories.length
              ]
            }
            x={pos.x}
            y={pos.y}
            translateX={translateX}
            translateY={translateY}
          />
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  icon: {
    position: 'absolute',
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emoji: {
    fontSize: 36,
  },
});