import React from 'react';
import { PrintIcon } from './Icons';

export const ExportButton: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      onClick={handlePrint}
      type="button"
      className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-md text-text-secondary bg-surface hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-background"
    >
      <PrintIcon className="h-5 w-5 mr-2" />
      <span>Exportar / Imprimir</span>
    </button>
  );
};