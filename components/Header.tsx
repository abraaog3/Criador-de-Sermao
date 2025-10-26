import React from 'react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { EditableField } from './EditableField';

interface HeaderProps {
  themeAndSubtitle: string;
  isEditing: boolean;
  onUpdate: (path: (string | number)[], value: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ themeAndSubtitle, isEditing, onUpdate }) => {
  return (
    <header className="mb-12 border-b-2 border-primary-light pb-8">
      <div className="flex justify-end mb-4">
        <ThemeSwitcher />
      </div>
      <div className="text-center">
        {/* Title and theme are now rendered directly in App.tsx to better control visibility in presentation mode */}
      </div>
    </header>
  );
};