
import React, { useRef, useEffect } from 'react';

interface EditableFieldProps {
  isEditing: boolean;
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  as?: React.ElementType;
  onTextSelect?: (originalFullText: string, selectedText: string, onComplete: (newText: string) => void) => void;
  isPresentationMode?: boolean;
}

const parseToHtml = (text: string): string => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .split(/(\*\*.*?\*\*)/g)
    .map(part =>
      part.startsWith('**') && part.endsWith('**')
        ? `<strong>${part.slice(2, -2)}</strong>`
        : part
    )
    .join('');
};

const parseToText = (html: string): string => {
  return html
    .replace(/<strong>/gi, '**')
    .replace(/<\/strong>/gi, '**')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '');
};

export const EditableField: React.FC<EditableFieldProps> = ({
  isEditing,
  value,
  onChange,
  className,
  as: Tag = 'p',
  onTextSelect,
  isPresentationMode = false,
}) => {
  if (isPresentationMode) {
    if (typeof value !== 'string' || value.trim() === '') {
      return null;
    }
    const lines = value.split('\n').filter(line => line.trim() !== '');

    // For single-line text (like titles), render it as is, parsing for bold.
    if (lines.length <= 1) {
        return <Tag className={className} dangerouslySetInnerHTML={{ __html: parseToHtml(value) }} />;
    }
    
    // For multi-line text from the API, render as a cleaner list for presentations.
    return (
        <ul className="list-none text-left space-y-3 text-xl md:text-2xl leading-relaxed">
            {lines.map((line, index) => (
                <li key={index} className="flex items-start">
                    <span className="text-primary-main mr-3 mt-1 flex-shrink-0" aria-hidden="true">&#9679;</span>
                    <span dangerouslySetInnerHTML={{ __html: parseToHtml(line) }} />
                </li>
            ))}
        </ul>
    );
  }


  const elementRef = useRef<HTMLElement>(null);
  const initialHtml = parseToHtml(value);

  useEffect(() => {
    const element = elementRef.current;
    if (element && element.innerHTML !== initialHtml) {
      element.innerHTML = initialHtml;
    }
  }, [value, initialHtml]);

  const handleBlur = () => {
    const element = elementRef.current;
    if (element) {
      const newText = parseToText(element.innerHTML);
      if (newText !== value) {
        onChange(newText);
      }
    }
  };

  const handleMouseUp = () => {
    if (isEditing && onTextSelect) {
      const selection = window.getSelection();
      const selectedText = selection ? selection.toString().trim() : '';
      if (selectedText) {
        onTextSelect(value, selectedText, onChange);
      }
    }
  };

  const commonProps = {
    className: `${className} ${isEditing ? 'focus:outline-none focus:bg-primary-light/50 focus:ring-2 focus:ring-primary-main rounded-sm cursor-text' : ''}`,
    ref: elementRef,
    onMouseUp: handleMouseUp,
    dangerouslySetInnerHTML: { __html: initialHtml },
  };

  if (!isEditing) {
    return <Tag {...commonProps} />;
  }

  return (
    <Tag
      {...commonProps}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
    />
  );
};
