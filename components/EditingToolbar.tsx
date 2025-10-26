import React from 'react';
import { HighlightIcon, ShortenIcon, LengthenIcon, RephraseIcon } from './Icons';

export type AiAction = 'highlight' | 'shorten' | 'lengthen' | 'rephrase';

interface EditingToolbarProps {
  top: number;
  left: number;
  onAction: (action: AiAction) => void;
}

const toolbarButtons: { action: AiAction; icon: React.FC<any>; title: string }[] = [
    { action: 'highlight', icon: HighlightIcon, title: 'Marcar (Negrito)' },
    { action: 'shorten', icon: ShortenIcon, title: 'Encurtar Texto' },
    { action: 'lengthen', icon: LengthenIcon, title: 'Alongar Texto' },
    { action: 'rephrase', icon: RephraseIcon, title: 'Refinar (Frases Curtas)' },
];

export const EditingToolbar: React.FC<EditingToolbarProps> = ({ top, left, onAction }) => {
  const handleMouseDown = (e: React.MouseEvent, action: AiAction) => {
    e.preventDefault(); // Prevent the editable field from losing focus
    onAction(action);
  };
    
  return (
    <div
      className="fixed z-50 flex items-center gap-1 p-1 bg-surface rounded-lg shadow-lg border border-border"
      style={{
        top: `${top}px`,
        left: `${left}px`,
        transform: 'translateX(-50%)',
      }}
      onMouseDown={(e) => e.preventDefault()} // Prevent clicks inside the toolbar from closing it
    >
      {toolbarButtons.map(({ action, icon: Icon, title }) => (
         <button
            key={action}
            title={title}
            onMouseDown={(e) => handleMouseDown(e, action)}
            className="p-2 rounded-md text-text-secondary hover:bg-primary-light hover:text-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main"
        >
            <Icon className="h-5 w-5" />
        </button>
      ))}
    </div>
  );
};
