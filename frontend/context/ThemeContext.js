import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'goon.theme.v1';

// `pink` / `pinkSoft` d\u00e9signent la couleur d'accent du th\u00e8me (nom conserv\u00e9 pour ne pas toucher tous les styles).
export const THEMES = {
  goon: {
    label: { fr: 'GoOn', en: 'GoOn' },
    dark: true,
    colors: { background: '#100D13', surface: '#19151D', surfaceRaised: '#242029', border: '#302B35', text: '#F8F5F7', muted: '#A8A1AA', pink: '#8B2FC9', pinkSoft: '#C58BF2', tint: '#2E1A45', tintText: '#E6D2FA', green: '#70D6A4', amber: '#F2BE6E' },
  },
  light: {
    label: { fr: 'Clair', en: 'Light' },
    dark: false,
    colors: { background: '#F8F0FF', surface: '#FFFFFF', surfaceRaised: '#F0EAFE', border: '#E5D7F2', text: '#1A1A2E', muted: '#6B6472', pink: '#8B2FC9', pinkSoft: '#6A1FA0', tint: '#EADCFB', tintText: '#5B1C8A', green: '#157347', amber: '#B7791F' },
  },
  midnight: {
    label: { fr: 'Minuit', en: 'Midnight' },
    dark: true,
    colors: { background: '#0B1220', surface: '#121B2E', surfaceRaised: '#1B2740', border: '#26344F', text: '#EAF1FF', muted: '#93A4C4', pink: '#3B82F6', pinkSoft: '#8DB8FF', tint: '#16294D', tintText: '#CFE0FF', green: '#5EEAD4', amber: '#FCD34D' },
  },
  sunset: {
    label: { fr: 'Coucher de soleil', en: 'Sunset' },
    dark: true,
    colors: { background: '#140D0A', surface: '#1E1410', surfaceRaised: '#2A1C16', border: '#3A2A22', text: '#FFF4EC', muted: '#BBA595', pink: '#F97316', pinkSoft: '#FDBA74', tint: '#3A2112', tintText: '#FFE0C7', green: '#86EFAC', amber: '#FDE68A' },
  },
  forest: {
    label: { fr: 'For\u00eat', en: 'Forest' },
    dark: true,
    colors: { background: '#0A1410', surface: '#101E18', surfaceRaised: '#17291F', border: '#223A2D', text: '#ECFFF4', muted: '#8FB5A0', pink: '#16A34A', pinkSoft: '#86EFAC', tint: '#12301F', tintText: '#C9F7DB', green: '#86EFAC', amber: '#FDE68A' },
  },
  rose: {
    label: { fr: 'Rose', en: 'Rose' },
    dark: true,
    colors: { background: '#100D13', surface: '#19151D', surfaceRaised: '#242029', border: '#302B35', text: '#F8F5F7', muted: '#A8A1AA', pink: '#EF476F', pinkSoft: '#FF8298', tint: '#44202B', tintText: '#FFD4DE', green: '#70D6A4', amber: '#F2BE6E' },
  },
};

export const DEFAULT_THEME = 'goon';

const ThemeContext = createContext({
  themeKey: DEFAULT_THEME,
  colors: THEMES[DEFAULT_THEME].colors,
  isDark: true,
  setThemeKey: () => {},
});

export function ThemeProvider({ children }) {
  const [themeKey, setThemeKeyState] = useState(DEFAULT_THEME);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => { if (stored && THEMES[stored]) setThemeKeyState(stored); })
      .catch(() => {});
  }, []);

  const setThemeKey = useCallback((next) => {
    if (!THEMES[next]) return;
    setThemeKeyState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({
    themeKey,
    colors: THEMES[themeKey].colors,
    isDark: THEMES[themeKey].dark,
    setThemeKey,
  }), [themeKey, setThemeKey]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
