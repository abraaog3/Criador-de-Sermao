import React, { createContext, useState, useEffect, useContext, useMemo } from 'react';

type ThemeName = 'classic' | 'modern' | 'calm';

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const themes: Record<ThemeName, Record<string, string>> = {
  classic: {
    '--color-background': '#f8fafc', // slate-50
    '--color-surface': '#ffffff', // white
    '--color-text-primary': '#1e293b', // slate-800
    '--color-text-secondary': '#475569', // slate-600
    '--color-primary-light': '#e0f2fe', // sky-100
    '--color-primary-main': '#0369a1', // sky-700
    '--color-primary-dark': '#0c4a6e', // sky-900
    '--color-primary-text': '#ffffff', // white
    '--color-border': '#cbd5e1', // slate-300
    '--color-accent-green-light': '#f0fdf4', // green-50
    '--color-accent-green-main': '#22c55e', // green-500
    '--color-accent-green-dark': '#15803d', // green-800
    '--color-accent-amber-light': '#fffbeb', // amber-50
    '--color-accent-amber-main': '#f59e0b', // amber-500
    '--color-accent-amber-dark': '#b45309', // amber-800
  },
  modern: {
    '--color-background': '#1e293b', // slate-800
    '--color-surface': '#334155', // slate-700
    '--color-text-primary': '#f1f5f9', // slate-100
    '--color-text-secondary': '#94a3b8', // slate-400
    '--color-primary-light': '#0c4a6e', // sky-900
    '--color-primary-main': '#38bdf8', // sky-400
    '--color-primary-dark': '#7dd3fc', // sky-300
    '--color-primary-text': '#0c4a6e', // sky-900
    '--color-border': '#475569', // slate-600
    '--color-accent-green-light': '#166534', // green-800
    '--color-accent-green-main': '#4ade80', // green-400
    '--color-accent-green-dark': '#bbf7d0', // green-200
    '--color-accent-amber-light': '#92400e', // amber-800
    '--color-accent-amber-main': '#facc15', // amber-400
    '--color-accent-amber-dark': '#fef08a', // amber-200
  },
  calm: {
    '--color-background': '#f5f3ff', // violet-50
    '--color-surface': '#ffffff', // white
    '--color-text-primary': '#374151', // gray-700
    '--color-text-secondary': '#6b7280', // gray-500
    '--color-primary-light': '#eef2ff', // indigo-100
    '--color-primary-main': '#4f46e5', // indigo-600
    '--color-primary-dark': '#3730a3', // indigo-800
    '--color-primary-text': '#ffffff', // white
    '--color-border': '#d1d5db', // gray-300
    '--color-accent-green-light': '#ecfdf5', // emerald-50
    '--color-accent-green-main': '#10b981', // emerald-500
    '--color-accent-green-dark': '#047857', // emerald-700
    '--color-accent-amber-light': '#fff7ed', // orange-50
    '--color-accent-amber-main': '#f97316', // orange-500
    '--color-accent-amber-dark': '#c2410c', // orange-700
  },
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeName>(() => {
    try {
      const savedTheme = localStorage.getItem('sermon-theme') as ThemeName;
      return savedTheme && themes[savedTheme] ? savedTheme : 'classic';
    } catch (error) {
      return 'classic';
    }
  });

  useEffect(() => {
    const currentTheme = themes[theme];
    const root = window.document.documentElement;

    Object.entries(currentTheme).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });

    try {
      localStorage.setItem('sermon-theme', theme);
    } catch (error) {
      // FIX: The error object in a catch block is of type 'unknown'. It must be explicitly converted to a string to be safely used.
      console.error('Failed to save theme to localStorage:', String(error));
    }
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
