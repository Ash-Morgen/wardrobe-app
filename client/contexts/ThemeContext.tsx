import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import * as DB from "@/database";

export interface ThemeColors {
  primary: string;      // Main accent (tab active, buttons)
  background: string;   // Page background
  surface: string;      // Card background
  text: string;         // Primary text
  textSecondary: string;// Secondary text
  border: string;       // Borders
  tabBar: string;       // Tab bar background
}

const THEMES: Record<DB.ThemeName, ThemeColors> = {
  default: {
    primary: "#8B7355",
    background: "#FAFAFA",
    surface: "#FFFFFF",
    text: "#1A1A1A",
    textSecondary: "#8A8A8A",
    border: "#E5E5E5",
    tabBar: "#FFFFFF",
  },
  forest: {
    primary: "#2D6A4F",
    background: "#F0F7F4",
    surface: "#FFFFFF",
    text: "#1B3D2F",
    textSecondary: "#6B8F7C",
    border: "#D0E3D8",
    tabBar: "#FFFFFF",
  },
  ocean: {
    primary: "#0E5E8A",
    background: "#F0F6FA",
    surface: "#FFFFFF",
    text: "#0C2D48",
    textSecondary: "#5F8BAE",
    border: "#C9DDEB",
    tabBar: "#FFFFFF",
  },
  sunset: {
    primary: "#C75B3A",
    background: "#FDF6F0",
    surface: "#FFFFFF",
    text: "#3D2418",
    textSecondary: "#B07D64",
    border: "#F0DDD0",
    tabBar: "#FFFFFF",
  },
  lavender: {
    primary: "#7C5DA8",
    background: "#F8F5FC",
    surface: "#FFFFFF",
    text: "#2E1F47",
    textSecondary: "#9884B8",
    border: "#DDD0ED",
    tabBar: "#FFFFFF",
  },
};

interface ThemeContextType {
  theme: DB.ThemeName;
  colors: ThemeColors;
  setTheme: (t: DB.ThemeName) => Promise<void>;
  availableThemes: { id: DB.ThemeName; name: string }[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  colors: THEMES.default,
  setTheme: async () => {},
  availableThemes: [],
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<DB.ThemeName>("default");

  useEffect(() => {
    DB.getSetting("theme", "default").then((t) => {
      const valid = t in THEMES ? t as DB.ThemeName : "default";
      setThemeState(valid);
    });
  }, []);

  const setTheme = useCallback(async (t: DB.ThemeName) => {
    setThemeState(t);
    await DB.setSetting("theme", t);
  }, []);

  const colors = THEMES[theme] || THEMES.default;
  const availableThemes = Object.keys(THEMES).map((id) => ({
    id: id as DB.ThemeName,
    name: { default: "默认", forest: "森林", ocean: "海洋", sunset: "日落", lavender: "薰衣草" }[id] || id,
  }));

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme, availableThemes }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
