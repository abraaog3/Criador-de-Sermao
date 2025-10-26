import React from 'react';
import { EditableField } from './EditableField';

interface Subsection {
  title: string;
  content?: string;
}

interface SermonPointProps {
  id?: string;
  pointIndex: number;
  pointNumber: number;
  title: string;
  IconComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  argument: string;
  subsections: Subsection[];
  application: string;
  isEditing: boolean;
  isPresentationMode: boolean;
  onUpdate: (path: (string | number)[], value: string) => void;
  onTextSelect: (originalFullText: string, selectedText: string, onComplete: (newText: string) => void) => void;
}

export const SermonPoint: React.FC<SermonPointProps> = ({ 
  id,
  pointIndex, 
  pointNumber, 
  title, 
  IconComponent, 
  argument, 
  subsections, 
  application,
  isEditing,
  isPresentationMode,
  onUpdate,
  onTextSelect
}) => {

  const renderWithBold = (text: string) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div id={id} className="bg-surface rounded-xl shadow-md overflow-hidden transition-shadow hover:shadow-xl scroll-mt-20">
      <div className="p-8">
        <div className="flex items-center mb-4">
          <div className="bg-primary-light text-primary-main rounded-full p-3 mr-4">
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <p className="font-sans text-sm font-semibold text-primary-main uppercase tracking-wider">Ponto {pointNumber}</p>
            <EditableField
              as="h3"
              className="font-sans text-xl font-bold text-text-primary"
              isEditing={isEditing}
              isPresentationMode={isPresentationMode}
              value={title}
              onChange={(newValue) => onUpdate(['development', pointIndex, 'title'], newValue)}
              onTextSelect={onTextSelect}
            />
          </div>
        </div>
        
        <EditableField
          as="p"
          className="italic text-text-secondary mb-6 border-l-4 border-border pl-4 text-justify"
          isEditing={isEditing}
          isPresentationMode={isPresentationMode}
          value={argument}
          onChange={(newValue) => onUpdate(['development', pointIndex, 'argument'], newValue)}
          onTextSelect={onTextSelect}
        />

        <div className="space-y-4 mb-6">
          {subsections && subsections.map((subsection, subIndex) => {
            const content = subsection.content || '';
            const lines = content.split('\n');
            const isList = lines.some(line => line.trim().startsWith('- '));

            return (
              <div key={subIndex}>
                <h4 className="font-sans font-semibold text-text-primary">{subsection.title}</h4>
                { isPresentationMode ? (
                  <EditableField
                    as="div"
                    className="text-text-secondary"
                    isEditing={false}
                    value={content}
                    onChange={() => {}}
                    onTextSelect={onTextSelect}
                    isPresentationMode={true}
                  />
                ) : isEditing && isList ? (
                  <textarea
                    value={content}
                    onChange={(e) => onUpdate(['development', pointIndex, 'subsections', subIndex, 'content'], e.target.value)}
                    className="w-full p-2 mt-2 font-serif text-lg bg-primary-light/50 border border-border rounded-md shadow-sm focus:ring-primary-main focus:border-primary-main"
                    rows={lines.length + 1}
                  />
                ) : isList ? (
                  <ul className="list-disc pl-5 space-y-3 mt-2">
                    {lines.filter(line => line.trim().startsWith('- ')).map((item, i) => (
                      <li key={i} className="text-text-secondary">{renderWithBold(item.trim().substring(1).trim())}</li>
                    ))}
                  </ul>
                ) : (
                  <EditableField
                    as="p"
                    className="text-text-secondary text-justify"
                    isEditing={isEditing}
                    value={content}
                    onChange={(newValue) => onUpdate(['development', pointIndex, 'subsections', subIndex, 'content'], newValue)}
                    onTextSelect={onTextSelect}
                    isPresentationMode={false}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6">
            <h4 className="font-sans font-semibold text-text-primary mb-2">Aplicação Pastoral:</h4>
            <EditableField
              as="p"
              className="p-4 bg-primary-light text-primary-dark rounded-lg text-justify"
              isEditing={isEditing}
              isPresentationMode={isPresentationMode}
              value={application}
              onChange={(newValue) => onUpdate(['development', pointIndex, 'application'], newValue)}
              onTextSelect={onTextSelect}
            />
        </div>
      </div>
    </div>
  );
};