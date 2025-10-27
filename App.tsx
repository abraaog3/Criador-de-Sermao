import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SermonSection } from './components/SermonSection';
import { SermonPoint } from './components/SermonPoint';
import { TentIcon, BuildingIcon, DoveIcon, SaveIcon, DeleteIcon, CheckIcon, PresentationIcon } from './components/Icons';
import { Book, bibleStructure as initialBibleStructure } from './data/bibleStructure';
import { EditModeToggle } from './components/EditModeToggle';
import { EditableField } from './components/EditableField';
import { ExportButton } from './components/ExportButton';
import { SermonTimer } from './components/SermonTimer';
import { EditingToolbar, AiAction } from './components/EditingToolbar';

const iconComponents = {
  TentIcon,
  BuildingIcon,
  DoveIcon,
};
type IconName = keyof typeof iconComponents;

const emptySermon = {
  title: "Novo Sermão",
  theme_and_subtitle: "Adicione o tema e subtítulo aqui",
  context: {
    title: "Contexto",
    content: "Descreva o contexto bíblico aqui."
  },
  introduction: {
    title: "Introdução",
    hook: "Gancho: Adicione um gancho impactante aqui."
  },
  development: [
    {
      point: 1,
      title: "PONTO 1: Título do primeiro ponto",
      icon: "TentIcon",
      argument: "Argumento principal deste ponto.",
      subsections: [
        {
          title: "Subseção 1",
          content: "Conteúdo da primeira subseção."
        }
      ],
      application: "Aplicação prática para a vida."
    }
  ],
  conclusion: {
    title: "Conclusão",
    recap: "Recapitulação dos pontos principais.",
    appealToBelievers: "Apelo direcionado aos crentes.",
    appealToUnbelievers: "Apelo evangelístico."
  }
};

const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${import.meta.env.VITE_JSONBIN_BIN_ID || '68fd64e4ae596e708f2cb845'}`;
const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY || '$2a$10$86MkeutZ8bgdTRGKhFAjBuKrVS.E2yw8b3fDYPEynVUrFUvO7aVdS';

interface ToolbarState {
  visible: boolean;
  top: number;
  left: number;
  originalFullText: string;
  selectedText: string;
  onComplete: (newText: string) => void;
}

const App: React.FC = () => {
  const [sermonData, setSermonData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [bibleData] = useState<Book[]>(initialBibleStructure);
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassage, setCurrentPassage] = useState('');

  const [savedSermons, setSavedSermons] = useState<any[]>([]);
  const [isLoadingSermons, setIsLoadingSermons] = useState(true);
  const [loadSermonsError, setLoadSermonsError] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [presentationData, setPresentationData] = useState<any>(null);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
  const isGeneratingRef = useRef(false);
  
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    visible: false, top: 0, left: 0, originalFullText: '', selectedText: '', onComplete: () => {}
  });
  const [isAiEditing, setIsAiEditing] = useState(false);

  useEffect(() => {
    isGeneratingRef.current = isGeneratingPresentation;
  }, [isGeneratingPresentation]);

  const fetchSavedSermons = useCallback(async () => {
    setIsLoadingSermons(true);
    setLoadSermonsError(null);
    try {
      const response = await fetch(`${JSONBIN_URL}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY }
      });
      if (!response.ok) {
        if (response.status === 404) {
          setSavedSermons([]);
          return;
        }
        throw new Error("Não foi possível buscar os sermões salvos.");
      }
      const data = await response.json();
      setSavedSermons(Array.isArray(data.record) ? data.record : []);
    } catch (e: any) {
      setLoadSermonsError(e.message);
      setSavedSermons([]);
    } finally {
      setIsLoadingSermons(false);
    }
  }, []);

  useEffect(() => {
    fetchSavedSermons();
  }, [fetchSavedSermons]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isPresentationMode) {
        setIsPresentationMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPresentationMode]);

  useEffect(() => {
    if (isPresentationMode) {
      document.body.classList.add('presentation-mode-active');
    } else {
      document.body.classList.remove('presentation-mode-active');
    }
  }, [isPresentationMode]);
  
  useEffect(() => {
    const handleClickOutside = () => {
      if (toolbarState.visible) {
        setToolbarState(prev => ({ ...prev, visible: false }));
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [toolbarState.visible]);

  const handleCreateNewSermon = () => {
    setSermonData(emptySermon);
    setPresentationData(null);
    setIsEditing(true);
    setCurrentPassage("Novo Sermão");
  };

  const handleSermonDataChange = (path: (string | number)[], value: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    setSermonData((currentData: any) => {
      const newData = JSON.parse(JSON.stringify(currentData));
      let current = newData;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      
      setPresentationData(null);
      return newData;
    });
  };
  
  const handleTextSelect = (
    originalFullText: string,
    selectedText: string,
    onComplete: (newText: string) => void
  ) => {
    if (!isEditing || !selectedText) {
      if (toolbarState.visible) setToolbarState(prev => ({ ...prev, visible: false }));
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setToolbarState({
      visible: true,
      top: rect.top + window.scrollY - 50,
      left: rect.left + window.scrollX + rect.width / 2,
      originalFullText,
      selectedText,
      onComplete,
    });
  };
  
  const handleToolbarAction = async (action: AiAction) => {
    const { originalFullText, selectedText, onComplete } = toolbarState;

    if (!selectedText || !onComplete) return;
    
    setToolbarState(prev => ({ ...prev, visible: false }));

    if (action === 'highlight') {
      const newFullText = originalFullText.replace(selectedText, `**${selectedText}**`);
      onComplete(newFullText);
      return;
    }

    setIsAiEditing(true);
    setError(null);
    
    try {
      let newText = selectedText;
      
      switch (action) {
        case 'shorten':
          newText = selectedText.split('.').slice(0, 2).join('.') + '.';
          break;
        case 'lengthen':
          newText = selectedText + ' Desenvolva mais este pensamento.';
          break;
        case 'rephrase':
          newText = selectedText.split('.')
            .map(sentence => sentence.trim())
            .filter(sentence => sentence)
            .join('\n');
          break;
      }

      const newFullText = originalFullText.replace(selectedText, newText);
      onComplete(newFullText);
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Não foi possível processar a solicitação.";
      setError(errorMessage);
    } finally {
      setIsAiEditing(false);
    }
  };

  const handleEnterPresentationMode = async () => {
    if (!sermonData || isGeneratingRef.current) return;
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (presentationData) {
      setIsPresentationMode(true);
      return;
    }

    setIsGeneratingPresentation(true);
    
    const formatForPresentation = (data: any) => {
      const formatted = JSON.parse(JSON.stringify(data));
      
      if (formatted.context?.content) {
        formatted.context.content = formatted.context.content
          .split('.')
          .filter((s: string) => s.trim())
          .map((s: string) => s.trim() + '.')
          .join('\n');
      }
      
      if (formatted.development) {
        formatted.development.forEach((point: any) => {
          if (point.argument) {
            point.argument = point.argument
              .split('.')
              .filter((s: string) => s.trim())
              .map((s: string) => s.trim() + '.')
              .join('\n');
          }
          
          if (point.subsections) {
            point.subsections.forEach((subsection: any) => {
              if (subsection.content) {
                subsection.content = subsection.content
                  .split('.')
                  .filter((s: string) => s.trim())
                  .map((s: string) => s.trim() + '.')
                  .join('\n');
              }
            });
          }
          
          if (point.application) {
            point.application = point.application
              .split('.')
              .filter((s: string) => s.trim())
              .map((s: string) => s.trim() + '.')
              .join('\n');
          }
        });
      }
      
      if (formatted.conclusion) {
        if (formatted.conclusion.recap) {
          formatted.conclusion.recap = formatted.conclusion.recap
            .split('.')
            .filter((s: string) => s.trim())
            .map((s: string) => s.trim() + '.')
            .join('\n');
        }
        
        if (formatted.conclusion.appealToBelievers) {
          formatted.conclusion.appealToBelievers = formatted.conclusion.appealToBelievers
            .split('.')
            .filter((s: string) => s.trim())
            .map((s: string) => s.trim() + '.')
            .join('\n');
        }
        
        if (formatted.conclusion.appealToUnbelievers) {
          formatted.conclusion.appealToUnbelievers = formatted.conclusion.appealToUnbelievers
            .split('.')
            .filter((s: string) => s.trim())
            .map((s: string) => s.trim() + '.')
            .join('\n');
        }
      }
      
      return formatted;
    };
    
    const presData = formatForPresentation(sermonData);
    setPresentationData(presData);
    setIsPresentationMode(true);
    setIsGeneratingPresentation(false);
  };

  const handleSaveSermon = async () => {
    if (!sermonData || !currentPassage) return;

    const newSermon = {
      id: Date.now(),
      passage: currentPassage,
      data: sermonData,
      presentationData: presentationData,
    };
    const previousSermons = [...savedSermons];
    const updatedSermons = [...savedSermons, newSermon];

    setSavedSermons(updatedSermons);
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const response = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(updatedSermons),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ DEBUG - Erro detalhado:", errorText);
        
        if (response.status === 401) {
          throw new Error("Erro de autenticação: API Key inválida ou sem permissão de escrita");
        } else if (response.status === 404) {
          throw new Error("Bin não encontrado. Verifique se o Bin ID está correto");
        } else {
          throw new Error(`Erro HTTP ${response.status}: ${response.statusText}`);
        }
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e: any) {
      setSaveError(e.message);
      setSavedSermons(previousSermons);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSermon = async (sermonId: number) => {
    const previousSermons = [...savedSermons];
    const updatedSermons = savedSermons.filter(s => s.id !== sermonId);
    setSavedSermons(updatedSermons);

    try {
      const response = await fetch(JSONBIN_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
        },
        body: JSON.stringify(updatedSermons),
      });
      if (!response.ok) {
        setSavedSermons(previousSermons);
        throw new Error("Falha ao deletar o sermão.");
      }
    } catch (e: any) {
      console.error(e);
      setLoadSermonsError(e.message);
      setSavedSermons(previousSermons);
    }
  };

  const handleLoadSermon = (sermon: any) => {
    setSermonData(sermon.data);
    setCurrentPassage(sermon.passage);
    setPresentationData(sermon.presentationData || null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const data = isPresentationMode ? (presentationData || sermonData) : sermonData;
  const isBusyGenerating = isGeneratingPresentation;

  return (
    <div className="bg-background min-h-screen font-serif text-text-primary">
      {isPresentationMode && data && (
        <SermonTimer 
          sermonData={data}
          onExit={() => {
            setIsPresentationMode(false)
          }} 
        />
      )}
      
      {toolbarState.visible && !isAiEditing && (
        <EditingToolbar
          top={toolbarState.top}
          left={toolbarState.left}
          onAction={handleToolbarAction}
        />
      )}
      
      {isAiEditing && (
        <div
          style={{ top: `${toolbarState.top}px`, left: `${toolbarState.left}px`, transform: 'translateX(-50%)' }}
          className="fixed z-50 p-2 bg-surface rounded-full shadow-lg border border-border"
        >
          <svg className="animate-spin h-5 w-5 text-primary-main" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      <main className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-8 lg:py-12 presentation-content-wrapper">
        
        {/* HEADER */}
        <div className="hide-in-presentation">
          <Header 
            themeAndSubtitle={sermonData?.theme_and_subtitle || "Crie ou carregue um sermão para começar"}
            isEditing={isEditing}
            onUpdate={handleSermonDataChange}
          />
        </div>
        
        {/* BOTÃO CRIAR NOVO SERMÃO */}
        <div className="hide-in-presentation my-6 sm:my-8 text-center">
          <button
            onClick={handleCreateNewSermon}
            className="bg-primary-main text-white px-4 py-3 sm:px-6 sm:py-3 rounded-lg font-sans font-semibold text-base sm:text-lg hover:bg-primary-dark transition-colors w-full sm:w-auto"
          >
            ✨ Criar Novo Sermão
          </button>
          <p className="text-text-secondary mt-2 text-sm sm:text-base px-4">
            Comece um sermão do zero e edite manualmente
          </p>
        </div>
        
        {/* LISTA DE SERMÕES SALVOS */}
        <section className="my-8 sm:my-12 hide-in-presentation">
          <h2 className="font-sans font-bold text-2xl sm:text-3xl text-primary-dark border-b border-border pb-3 mb-4 sm:mb-6">
            Meus Sermões Salvos
          </h2>
          
          {isLoadingSermons && <p className="text-text-secondary">Carregando sermões...</p>}
          {loadSermonsError && (
            <p className="text-red-600 font-semibold bg-red-100 p-3 rounded-md">{loadSermonsError}</p>
          )}
          
          {!isLoadingSermons && !loadSermonsError && (
            savedSermons.length === 0 ? (
              <p className="text-text-secondary">Você ainda não salvou nenhum sermão.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 sm:gap-4">
                {savedSermons.map(sermon => (
                  <div key={sermon.id} className="bg-surface p-3 sm:p-4 rounded-lg shadow-md border border-border flex justify-between items-center gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text-primary truncate text-sm sm:text-base">
                        {sermon.data.title}
                      </p>
                      <p className="text-xs sm:text-sm text-text-secondary truncate">
                        {sermon.passage}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                      <button 
                        onClick={() => handleLoadSermon(sermon)}
                        className="px-2 py-1 sm:px-3 sm:py-1 text-xs sm:text-sm font-semibold rounded-md text-primary-text bg-primary-main hover:bg-primary-dark transition"
                      >
                        Carregar
                      </button>
                      <button
                        onClick={() => handleDeleteSermon(sermon.id)}
                        className="p-1 sm:p-2 text-text-secondary hover:text-red-600 hover:bg-background rounded-full transition"
                        aria-label="Deletar sermão"
                      >
                        <DeleteIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </section>

        {/* EDITOR DE SERMÃO */}
        {data && (
          <>
            {/* BARRA DE CONTROLES */}
            <div className="flex flex-col sm:flex-row justify-between sm:justify-end items-stretch sm:items-center gap-2 sm:gap-4 mb-4 edit-controls hide-in-presentation">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
                <div className="relative flex items-center justify-center sm:justify-start">
                  <button
                    onClick={handleSaveSermon}
                    disabled={isSaving || saveSuccess}
                    type="button"
                    className={`inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-border text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-background disabled:opacity-70 disabled:cursor-not-allowed w-full sm:w-auto ${
                      saveSuccess 
                        ? 'bg-accent-green-main text-white' 
                        : 'text-text-secondary bg-surface hover:bg-background'
                    }`}
                  >
                    {isSaving ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : saveSuccess ? (
                      <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    ) : (
                      <SaveIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    )}
                    <span>{isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Sermão'}</span>
                  </button>
                </div>

                <div className="flex flex-row gap-2 sm:gap-4 justify-center sm:justify-end">
                  <ExportButton />
                  <button
                    onClick={handleEnterPresentationMode}
                    disabled={isBusyGenerating}
                    type="button"
                    className="inline-flex items-center justify-center px-3 py-2 sm:px-4 sm:py-2 border border-border text-sm font-medium rounded-md text-text-secondary bg-surface hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-background disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isBusyGenerating ? (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 sm:h-5 sm:w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <PresentationIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                    )}
                    <span className="hidden sm:inline">{isBusyGenerating ? 'Preparando...' : 'Apresentação'}</span>
                    <span className="sm:hidden">Slide</span>
                  </button>
                  <EditModeToggle isEditing={isEditing} onToggle={() => setIsEditing(!isEditing)} />
                </div>
              </div>
              {saveError && (
                <p className="text-sm text-red-600 text-center sm:text-left mt-2 sm:mt-0 w-full">
                  {saveError}
                </p>
              )}
            </div>
            
            {/* TÍTULO DO SERMÃO */}
            {!isPresentationMode && data.title && (
              <div className="text-center mb-8 sm:mb-12">
                <EditableField
                  as="h1"
                  className="font-sans font-bold text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-primary-dark leading-tight px-2"
                  isEditing={isEditing}
                  isPresentationMode={isPresentationMode}
                  value={data.title}
                  onChange={(newValue) => handleSermonDataChange(['title'], newValue)}
                  onTextSelect={handleTextSelect}
                />
                {data.theme_and_subtitle && (
                  <EditableField
                    as="p"
                    className="text-base sm:text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mt-3 sm:mt-4 px-4"
                    isEditing={isEditing}
                    isPresentationMode={isPresentationMode}
                    value={data.theme_and_subtitle}
                    onChange={(newValue) => handleSermonDataChange(['theme_and_subtitle'], newValue)}
                    onTextSelect={handleTextSelect}
                  />
                )}
              </div>
            )}

            {/* SEÇÕES DO SERMÃO */}
            {data.context && (
              <SermonSection title={data.context.title} id="sermon-section-context">
                <EditableField
                  as="p"
                  isEditing={isEditing}
                  isPresentationMode={isPresentationMode}
                  value={data.context.content}
                  onChange={(newValue) => handleSermonDataChange(['context', 'content'], newValue)}
                  onTextSelect={handleTextSelect}
                />
              </SermonSection>
            )}

            {data.introduction && (
              <SermonSection title={data.introduction.title} id="sermon-section-introduction">
                <EditableField
                  as="p"
                  className="italic"
                  isEditing={isEditing}
                  isPresentationMode={isPresentationMode}
                  value={data.introduction.hook}
                  onChange={(newValue) => handleSermonDataChange(['introduction', 'hook'], newValue)}
                  onTextSelect={handleTextSelect}
                />
              </SermonSection>
            )}

            {data.development && (
              <SermonSection title="II. Desenvolvimento da Mensagem">
                <div className="space-y-8 sm:space-y-12">
                  {data.development.map((point: any, index: number) => (
                    point && (
                      <SermonPoint 
                        key={point.point}
                        id={`sermon-point-${index}`}
                        pointIndex={index}
                        pointNumber={point.point}
                        title={point.title}
                        IconComponent={iconComponents[point.icon as IconName] || TentIcon}
                        argument={point.argument}
                        subsections={point.subsections}
                        application={point.application}
                        isEditing={isEditing}
                        isPresentationMode={isPresentationMode}
                        onUpdate={handleSermonDataChange}
                        onTextSelect={handleTextSelect}
                      />
                    )
                  ))}
                </div>
              </SermonSection>
            )}

            {data.conclusion && (
              <SermonSection title={data.conclusion.title} id="sermon-section-conclusion">
                <div className="mb-4 flex items-start">
                  <strong className="font-semibold text-primary-dark mr-2 text-sm sm:text-base">
                    Recapitulação:
                  </strong>
                  <EditableField
                    as="span"
                    isEditing={isEditing}
                    isPresentationMode={isPresentationMode}
                    value={data.conclusion.recap}
                    onChange={(newValue) => handleSermonDataChange(['conclusion', 'recap'], newValue)}
                    onTextSelect={handleTextSelect}
                    className="flex-1 text-sm sm:text-base"
                  />
                </div>

                <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
                  {data.conclusion.appealToBelievers && (
                    <div className="p-3 sm:p-4 bg-accent-green-light border-l-4 border-accent-green-main rounded-r-lg">
                      <h3 className="font-bold text-accent-green-dark mb-2 text-sm sm:text-base">
                        Apelo aos Crentes
                      </h3>
                      <EditableField
                        as="p"
                        isEditing={isEditing}
                        isPresentationMode={isPresentationMode}
                        value={data.conclusion.appealToBelievers}
                        onChange={(newValue) => handleSermonDataChange(['conclusion', 'appealToBelievers'], newValue)}
                        onTextSelect={handleTextSelect}
                        className="text-sm sm:text-base"
                      />
                    </div>
                  )}
                  
                  {data.conclusion.appealToUnbelievers && (
                    <div className="p-3 sm:p-4 bg-accent-amber-light border-l-4 border-accent-amber-main rounded-r-lg">
                      <h3 className="font-bold text-accent-amber-dark mb-2 text-sm sm:text-base">
                        Apelo aos Não-Crentes
                      </h3>
                      <EditableField
                        as="p"
                        isEditing={isEditing}
                        isPresentationMode={isPresentationMode}
                        value={data.conclusion.appealToUnbelievers}
                        onChange={(newValue) => handleSermonDataChange(['conclusion', 'appealToUnbelievers'], newValue)}
                        onTextSelect={handleTextSelect}
                        className="text-sm sm:text-base"
                      />
                    </div>
                  )}
                </div>
              </SermonSection>
            )}
          </>
        )}

        {/* FOOTER */}
        <footer className="text-center mt-12 sm:mt-16 text-text-secondary text-xs sm:text-sm hide-in-presentation">
          <p>Editor de Esboço de Pregação Digital</p>
          <p>&copy; {new Date().getFullYear()}</p>
        </footer>
      </main>
    </div>
  );
};

export default App;
