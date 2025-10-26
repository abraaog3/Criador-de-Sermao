import React from 'react';
import { PencilIcon } from './Icons';

interface EditModeToggleProps {
  isEditing: boolean;
  onToggle: () => void;
}

export const EditModeToggle: React.FC<EditModeToggleProps> = ({ isEditing, onToggle }) => {
  return (
    <div className="flex items-center">
      <label htmlFor="edit-mode-toggle" className="mr-3 font-sans text-sm font-semibold text-text-secondary">
        Modo de Edição
      </label>
      <button
        id="edit-mode-toggle"
        onClick={onToggle}
        type="button"
        className={`${
          isEditing ? 'bg-primary-main' : 'bg-surface'
        } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 ring-offset-background`}
        role="switch"
        aria-checked={isEditing}
      >
        <span
          aria-hidden="true"
          className={`${
            isEditing ? 'translate-x-5' : 'translate-x-0'
          } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
        >
            <PencilIcon className={`h-5 w-5 p-1 ${isEditing ? 'text-primary-main' : 'text-text-secondary'}`} />
        </span>
      </button>
    </div>
  );
};