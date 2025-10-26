import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

type ThemeName = 'classic' | 'modern' | 'calm';

const themeOptions: { name: ThemeName, label: string }[] = [
  { name: 'classic', label: 'Clássico' },
  { name: 'modern', label: 'Moderno' },
  { name: 'calm', label: 'Calmo' },
];

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <div className="flex items-center space-x-2 bg-surface p-1 rounded-full shadow border border-border">
        {themeOptions.map((option) => (
          <button
            key={option.name}
            onClick={() => setTheme(option.name)}
            className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-background ${
              theme === option.name
                ? 'bg-primary-main text-primary-text'
                : 'text-text-secondary hover:bg-primary-light hover:text-primary-dark'
            }`}
            aria-pressed={theme === option.name}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
};