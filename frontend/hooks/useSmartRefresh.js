import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

export const useSmartRefresh = ({
  refreshFn,
  enabled = true,
  intervalMs = 60000,
  minGapMs = 3000,
  runOnFocus = true,
  runOnAppActive = true,
}) => {
  const inFlightRef = useRef(false);
  const lastRunAtRef = useRef(0);
  const isFocusedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const runRefresh = useCallback(async ({ force = false } = {}) => {
    if (!enabled || typeof refreshFn !== 'function') return false;
    if (inFlightRef.current) return false;

    const now = Date.now();
    if (!force && now - lastRunAtRef.current < minGapMs) return false;

    inFlightRef.current = true;
    try {
      await refreshFn({ force });
      lastRunAtRef.current = Date.now();
      return true;
    } finally {
      inFlightRef.current = false;
    }
  }, [enabled, minGapMs, refreshFn]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      if (runOnFocus) {
        runRefresh({ force: true });
      }

      return () => {
        isFocusedRef.current = false;
      };
    }, [runOnFocus, runRefresh])
  );

  useEffect(() => {
    if (!enabled || !runOnAppActive) return undefined;

    const appStateSub = AppState.addEventListener('change', (nextState) => {
      const wasActive = appStateRef.current === 'active';
      appStateRef.current = nextState;

      if (!wasActive && nextState === 'active' && isFocusedRef.current) {
        runRefresh({ force: true });
      }
    });

    return () => {
      appStateSub.remove();
    };
  }, [enabled, runOnAppActive, runRefresh]);

  useEffect(() => {
    if (!enabled || !intervalMs || intervalMs <= 0) return undefined;

    const intervalId = setInterval(() => {
      if (!isFocusedRef.current) return;
      if (AppState.currentState !== 'active') return;
      runRefresh();
    }, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, intervalMs, runRefresh]);

  return {
    runRefresh,
    refreshInFlightRef: inFlightRef,
  };
};
