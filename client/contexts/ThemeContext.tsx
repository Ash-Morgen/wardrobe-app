import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  THEME_COLOR: '@wardrobe/theme_color',
  CATEGORIES: '@wardrobe/categories',
};

export const THEME_COLORS = [
  { id: 'coffee', name: '咖啡棕', color: '#8B7355', hex: '8B7355' },
  { id: 'sky', name: '天空蓝', color: '#4A90D9', hex: '4A90D9' },
  { id: 'forest', name: '森林绿', color: '#5A8A6B', hex: '5A8A6B' },
  { id: 'rose', name: '玫瑰粉', color: '#C48B9F', hex: 'C48B9F' },
  { id: 'lavender', name: '薰衣草', color: '#9B8AA6', hex: '9B8AA6' },
  { id: 'sunset', name: '日落橙', color: '#D98E4B', hex: 'D98E4B' },
  { id: 'graphite', name: '石墨灰', color: '#6B7280', hex: '6B7280' },
  { id: 'classic', name: '经典黑', color: '#1F2937', hex: '1F2937' },
];

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
  themeColorName: string;
}

const ThemeContext = createContext<ThemeContextType>({
  themeColor: THEME_COLORS[0].color,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setThemeColor: () => {},
  themeColorName: THEME_COLORS[0].name,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeColor, setThemeColorState] = useState<string>(THEME_COLORS[0].color);
  const [isLoaded, setIsLoaded] = useState(false);

  // 初始化加载主题色
  useEffect(() => {
    let cancelled = false;
    const loadColor = async () => {
      try {
        const savedColor = await AsyncStorage.getItem(STORAGE_KEYS.THEME_COLOR);
        if (!cancelled && savedColor) {
          setThemeColorState(savedColor);
        }
      } catch (error) {
        console.error('Failed to load theme color:', error);
      } finally {
        if (!cancelled) {
          setIsLoaded(true);
        }
      }
    };
    loadColor();
    return () => { cancelled = true; };
  }, []);

  const setThemeColor = useCallback(async (color: string) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.THEME_COLOR, color);
      setThemeColorState(color);
    } catch (error) {
      console.error('Failed to save theme color:', error);
    }
  }, []);

  const themeColorName = useMemo(
    () => THEME_COLORS.find(c => c.color === themeColor)?.name || '自定义',
    [themeColor]
  );

  return (
    <ThemeContext.Provider value={{ themeColor, accentColor: themeColor, setThemeColor, themeColorName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const STORAGE_KEYS_THEME = STORAGE_KEYS;
