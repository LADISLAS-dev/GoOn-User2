import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const THUMB = 22;

function Thumb({ x, onMove, onEnd, getStart, styles }) {
  const start = useRef(0);
  const handlers = useRef({ onMove, onEnd, getStart });
  handlers.current = { onMove, onEnd, getStart };
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => { start.current = handlers.current.getStart(); },
      onPanResponderMove: (_, gesture) => handlers.current.onMove(start.current + gesture.dx),
      onPanResponderRelease: () => handlers.current.onEnd?.(),
    }),
  ).current;
  return <View {...responder.panHandlers} style={[styles.thumb, { left: x - THUMB / 2 }]} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} />;
}

export default function RangeSlider({ min, max, low, high, onChange }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);
  const span = Math.max(1, max - min);
  const toX = (value) => ((value - min) / span) * width;
  const toValue = (x) => Math.round(min + (Math.min(Math.max(x, 0), width) / Math.max(1, width)) * span);
  const latest = useRef({ low, high });
  latest.current = { low, high };

  return (
    <View style={styles.wrap} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <View style={styles.track} />
      <View style={[styles.fill, { left: toX(low), width: Math.max(0, toX(high) - toX(low)) }]} />
      <Thumb styles={styles} x={toX(low)} getStart={() => toX(latest.current.low)} onMove={(x) => onChange(Math.min(toValue(x), latest.current.high), latest.current.high)} />
      <Thumb styles={styles} x={toX(high)} getStart={() => toX(latest.current.high)} onMove={(x) => onChange(latest.current.low, Math.max(toValue(x), latest.current.low))} />
    </View>
  );
}

const createStyles = (COLORS) => StyleSheet.create({
  wrap: { height: 32, justifyContent: 'center', marginHorizontal: THUMB / 2 },
  track: { height: 4, borderRadius: 2, backgroundColor: COLORS.surfaceRaised },
  fill: { position: 'absolute', height: 4, borderRadius: 2, backgroundColor: COLORS.pink },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, backgroundColor: COLORS.pink, top: (32 - THUMB) / 2, ...(Platform.OS === 'web' ? { touchAction: 'none' } : {}) },
});
