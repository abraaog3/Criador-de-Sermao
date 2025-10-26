import React, { useState, useMemo } from 'react';
import { DocumentIcon, PasteIcon } from './Icons';
import { Book } from '../data/bibleStructure';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^4.5.136/build/pdf.worker.mjs';


interface SermonGeneratorFormProps {
  onGenerate: (passage: string, pdfText: string | null) => void;
  isLoading: boolean;
  error: string | null;
  bibleData: Book[];
}

export const SermonGeneratorForm: React.FC<SermonGeneratorFormProps> = ({ 
    onGenerate, 
    isLoading, 
    error,
    bibleData,
}) => {
  const [selectedBook, setSelectedBook] = useState('');
  const [startRef, setStartRef] = useState('');
  const [endRef, setEndRef] = useState('');

  const [file, setFile] = useState<File | null>(null);
  const [extractedPdfText, setExtractedPdfText] = useState<string | null>(null);
  const [isPdfProcessing, setIsPdfProcessing] = useState(false);
  const [pdfExtractionError, setPdfExtractionError] = useState<string | null>(null);
  const [pdfProcessingProgress, setPdfProcessingProgress] = useState(0);

  const [pastedText, setPastedText] = useState<string | null>(null);
  const [showPasteTextarea, setShowPasteTextarea] = useState(false);
  const [textareaContent, setTextareaContent] = useState('');

  const bookOptions = useMemo(() => bibleData.map(book => book.name), [bibleData]);
  
  const handleBookChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBook(e.target.value);
  };

  const extractTextFromPdf = async (file: File, onProgress: (progress: number) => void): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';
    const numPages = pdf.numPages;
    if (numPages === 0) {
        onProgress(100);
        return '';
    }
    for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => 'str' in item ? item.str : '').join(' ');
        fullText += '\n';
        onProgress(Math.round((i / numPages) * 100));
    }
    return fullText;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
       // Clear other reference types
      setPastedText(null);
      setShowPasteTextarea(false);
      setTextareaContent('');
      
      setFile(selectedFile);
      setIsPdfProcessing(true);
      setPdfExtractionError(null);
      setExtractedPdfText(null);
      setPdfProcessingProgress(0);

      try {
        const text = await extractTextFromPdf(selectedFile, setPdfProcessingProgress);
        setExtractedPdfText(text);
      } catch (err) {
        console.error("PDF Extraction Error:", err);
        setPdfExtractionError("Falha ao ler o PDF. O arquivo pode estar corrompido ou protegido.");
      } finally {
        setIsPdfProcessing(false);
      }
    } else {
        removeFile();
    }
    e.target.value = '';
  };

  const removeFile = () => {
    setFile(null);
    setExtractedPdfText(null);
    setIsPdfProcessing(false);
    setPdfExtractionError(null);
    setPdfProcessingProgress(0);
  };
  
  const handlePasteTextClick = () => {
    removeFile(); // Clear file if exists
    setTextareaContent(pastedText || '');
    setShowPasteTextarea(true);
  };

  const handleSavePastedText = () => {
      setPastedText(textareaContent);
      setShowPasteTextarea(false);
  };

  const handleCancelPastedText = () => {
      setShowPasteTextarea(false);
  };
  
  const removePastedText = () => {
      setPastedText(null);
      setTextareaContent('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const passage = `${selectedBook} ${startRef}${endRef ? `-${endRef}` : ''}`.trim();
    if (passage && !isLoading) {
      onGenerate(passage, extractedPdfText || pastedText);
    }
  };
  
  const isFormValid = selectedBook && startRef;
  const showSuccessMessage = !isPdfProcessing && !pdfExtractionError && extractedPdfText !== null;
  const selectClasses = "w-full px-4 py-3 font-sans text-lg bg-background border border-border rounded-md shadow-sm focus:ring-primary-main focus:border-primary-main transition disabled:opacity-50 disabled:cursor-not-allowed";
  const inputClasses = "w-full px-4 py-3 font-sans text-lg bg-background border border-border rounded-md shadow-sm focus:ring-primary-main focus:border-primary-main transition disabled:opacity-50";


  return (
    <section className="my-12 p-6 sm:p-8 bg-surface shadow-lg rounded-lg border border-border">
      <h2 className="font-sans font-bold text-2xl sm:text-3xl text-primary-dark mb-4">Gerador de Esboço de Sermão</h2>
      <p className="text-text-secondary mb-6 text-lg text-justify">Selecione uma passagem bíblica e anexe um PDF de referência (opcional) para gerar um esboço de sermão expositivo.</p>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="book-select" className="block text-sm font-medium text-text-secondary mb-1">Livro</label>
            <select id="book-select" value={selectedBook} onChange={handleBookChange} disabled={isLoading} className={selectClasses} required>
              <option value="" disabled>Selecione...</option>
              {bookOptions.map(bookName => <option key={bookName} value={bookName}>{bookName}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="start-ref" className="block text-sm font-medium text-text-secondary mb-1">Versículo Inicial</label>
            <input 
              type="text" 
              id="start-ref" 
              value={startRef}
              onChange={(e) => setStartRef(e.target.value)}
              className={inputClasses}
              placeholder="ex: 1:1"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label htmlFor="end-ref" className="block text-sm font-medium text-text-secondary mb-1">Versículo Final (Opcional)</label>
            <input 
              type="text" 
              id="end-ref" 
              value={endRef}
              onChange={(e) => setEndRef(e.target.value)}
              className={inputClasses}
              placeholder="ex: 1:10"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-border pt-6">
            <h3 className="text-sm font-medium text-text-secondary mb-3">Referência (Opcional)</h3>

            {/* State 1: Show paste textarea */}
            {showPasteTextarea && (
              <div className="p-3 bg-background rounded-md border border-border transition-all duration-300">
                <label htmlFor="pasted-text" className="block text-sm font-medium text-text-secondary mb-2">
                  Cole o texto de referência abaixo:
                </label>
                <textarea
                  id="pasted-text"
                  rows={8}
                  className="w-full p-2 font-sans text-base bg-surface border border-border rounded-md shadow-sm focus:ring-primary-main focus:border-primary-main"
                  value={textareaContent}
                  onChange={(e) => setTextareaContent(e.target.value)}
                  placeholder="Cole seu texto aqui..."
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button type="button" onClick={handleCancelPastedText} className="px-3 py-1 text-sm font-semibold rounded-md text-text-secondary hover:bg-background">
                    Cancelar
                  </button>
                  <button type="button" onClick={handleSavePastedText} disabled={!textareaContent} className="px-3 py-1 text-sm font-semibold rounded-md text-primary-text bg-primary-main hover:bg-primary-dark disabled:bg-text-secondary disabled:opacity-70">
                    Salvar Texto
                  </button>
                </div>
              </div>
            )}

            {/* State 2: Show PDF info */}
            {file && !showPasteTextarea && (
              <div className="mt-3 bg-background p-3 rounded-md border border-border max-w-sm">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-text-secondary truncate pr-2 font-medium">{file.name}</p>
                    <button onClick={removeFile} type="button" disabled={isLoading || isPdfProcessing} className="text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-main rounded-full p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <span className="sr-only">Remover arquivo</span>
                    </button>
                </div>
                {isPdfProcessing && (
                    <div className="mt-2">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-text-secondary">Extraindo texto...</span>
                            <span className="text-sm font-medium text-text-secondary">{pdfProcessingProgress}%</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-1.5">
                            <div 
                                className="bg-primary-main h-1.5 rounded-full transition-all duration-300" 
                                style={{ width: `${pdfProcessingProgress}%` }}
                                role="progressbar"
                                aria-valuenow={pdfProcessingProgress}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Progresso da extração do PDF"
                            ></div>
                        </div>
                    </div>
                )}
                {pdfExtractionError && (
                  <div className="flex items-center text-sm text-red-600 mt-2 font-sans">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{pdfExtractionError}</span>
                  </div>
                )}
                {showSuccessMessage && (
                    <div className="flex items-center text-sm text-accent-green-dark mt-2 font-sans">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>PDF lido com sucesso!</span>
                  </div>
                )}
              </div>
            )}
            
            {/* State 3: Show pasted text info */}
            {pastedText && !showPasteTextarea && (
              <div className="bg-background p-3 rounded-md border border-border max-w-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center min-w-0">
                      <PasteIcon className="h-5 w-5 mr-2 text-text-secondary flex-shrink-0" />
                      <p className="text-sm text-text-secondary font-medium truncate">Texto de referência adicionado.</p>
                  </div>
                  <button onClick={removePastedText} type="button" className="text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-main rounded-full p-1 transition-colors">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span className="sr-only">Remover texto</span>
                  </button>
                </div>
                <p className="mt-2 text-sm text-text-secondary italic bg-surface p-2 rounded truncate">
                  "{pastedText}"
                </p>
              </div>
            )}

            {/* State 4: Initial state, show choices */}
            {!file && !pastedText && !showPasteTextarea && (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <label htmlFor="pdf-upload" className="cursor-pointer inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-text-secondary bg-surface hover:bg-background transition-colors w-full sm:w-auto justify-center">
                  <DocumentIcon className="h-5 w-5 mr-2" />
                  <span>Anexar PDF</span>
                </label>
                <input id="pdf-upload" name="pdf-upload" type="file" accept=".pdf" className="sr-only" onChange={handleFileChange} disabled={isLoading || isPdfProcessing} />
                
                <span className="text-text-secondary text-sm">ou</span>
                
                <button type="button" onClick={handlePasteTextClick} className="inline-flex items-center px-4 py-2 border border-border text-sm font-medium rounded-md text-text-secondary bg-surface hover:bg-background transition-colors w-full sm:w-auto justify-center">
                  <PasteIcon className="h-5 w-5 mr-2" />
                  <span>Colar Texto</span>
                </button>
              </div>
            )}
        </div>

        <div className="flex justify-end mt-8">
            <button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-3 font-sans font-bold text-lg text-primary-text bg-primary-main rounded-md shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-main disabled:bg-text-secondary disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Gerando...
                </>
                ) : 'Gerar Esboço'}
            </button>
        </div>
      </form>
      {error && <p id="error-message" className="mt-4 text-red-700 font-semibold bg-red-100 p-3 rounded-md">{error}</p>}
    </section>
  );
};