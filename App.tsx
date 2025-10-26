import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { SermonSection } from './components/SermonSection';
import { SermonPoint } from './components/SermonPoint';
import { SermonGeneratorForm } from './components/SermonGeneratorForm';
import { TentIcon, BuildingIcon, DoveIcon, SaveIcon, DeleteIcon, CheckIcon, PresentationIcon } from './components/Icons';
import { GoogleGenAI, Type } from "@google/genai";
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

const sermonSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING, description: "O título principal e cativante do sermão. Deve ser memorável e refletir o tema central. Ex: 'Fugindo da Ira que Vem: O Juízo de Sodoma e a Salvação de Ló'." },
        theme_and_subtitle: { type: Type.STRING, description: "O subtítulo que resume a tese ou a ideia central do sermão em uma única frase. Ex: 'O juízo de Deus, a misericórdia graciosa e o perigo do coração dividido'." },
        context: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "Título para a seção de contexto. Ex: 'O Palco para o Juízo Divino'." },
                content: { type: Type.STRING, description: "Um parágrafo explicando o contexto da passagem, preparando o cenário para a mensagem. Use **texto** para enfatizar." },
            },
            required: ['title', 'content'],
        },
        introduction: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "O título para a introdução. Ex: 'O Coração Dividido e a Misericórdia Divina'." },
                hook: { type: Type.STRING, description: "Um 'gancho' para capturar a atenção, começando com 'Gancho:'. Pode ser uma pergunta ou declaração intrigante para conectar a audiência ao tema. Ex: 'Gancho: Já se perguntou se suas escolhas podem levá-lo para mais perto do perigo ou para mais longe da segurança?'" },
            },
            required: ['title', 'hook'],
        },
        development: {
            type: Type.ARRAY,
            description: "A lista de pontos principais do sermão. Deve haver entre 2 a 4 pontos.",
            items: {
                type: Type.OBJECT,
                properties: {
                    point: { type: Type.INTEGER, description: "O número do ponto (1, 2, 3...)." },
                    title: { type: Type.STRING, description: "O título do ponto, incluindo a referência bíblica. Ex: 'PONTO 1: O Juízo Anunciado: A Urgência da Saída (Gênesis 19:12-14)'." },
                    icon: { type: Type.STRING, enum: ['TentIcon', 'BuildingIcon', 'DoveIcon'], description: "Nome do ícone para representar visualmente o ponto." },
                    argument: { type: Type.STRING, description: "A declaração principal ou argumento deste ponto, resumindo sua ideia central." },
                    subsections: {
                        type: Type.ARRAY,
                        description: "Uma lista de subseções que detalham o argumento do ponto.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING, description: "O título da subseção, frequentemente incluindo versículos. Ex: 'A Ordem de Deus: A Urgência da Saída (v. 12-13)'." },
                                content: { type: Type.STRING, description: "O conteúdo da subseção, formatado como uma lista de sentenças curtas e diretas. Cada sentença DEVE começar em uma nova linha, sem marcadores como '-'. O modo de apresentação irá formatar isso como uma lista de tópicos. Use **texto** para enfatizar palavras-chave." },
                            },
                            required: ['title', 'content'],
                        }
                    },
                    application: { type: Type.STRING, description: "Uma aplicação pastoral prática e direta para a vida dos ouvintes, baseada neste ponto." },
                },
                required: ['point', 'title', 'icon', 'argument', 'subsections', 'application'],
            },
        },
        conclusion: {
            type: Type.OBJECT,
            properties: {
                title: { type: Type.STRING, description: "O título para a conclusão. Ex: 'Conclusão: Uma Decisão de Vida ou Morte'." },
                recap: { type: Type.STRING, description: "Uma breve recapitulação dos pontos principais do sermão." },
                appealToBelievers: { type: Type.STRING, description: "Um apelo aos crentes, com encorajamento e exortação. Use **texto** para enfatizar." },
                appealToUnbelievers: { type: Type.STRING, description: "Um apelo evangelístico direcionado aos não-crentes." },
            },
            required: ['title', 'recap', 'appealToBelievers', 'appealToUnbelievers'],
        },
    },
    required: ['title', 'theme_and_subtitle', 'context', 'introduction', 'development', 'conclusion'],
};

const JSONBIN_URL = "https://api.jsonbin.io/v3/b/68fd64e4ae596e708f2cb845";
const JSONBIN_API_KEY = "$2a$10$86MkeutZ8bgdTRGKhFAjBuKrVS.E2yw8b3fDYPEynVUrFUvO7aVdS";

interface ToolbarState {
  visible: boolean;
  top: number;
  left: number;
  originalFullText: string;
  selectedText: string;
  onComplete: (newText: string) => void;
}

// Helper function to get API key safely
const getApiKey = (): string => {
  // Try different ways to get the API key
  if (process.env.API_KEY) return process.env.API_KEY;
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  
  // For GitHub Pages, we'll use a different approach
  // This will be set via GitHub Actions environment variable
  return import.meta.env.VITE_GEMINI_API_KEY || '';
};

// Helper function to clean and parse JSON from the model's response
const parseJsonResponse = (text: string) => {
    // The model sometimes wraps the JSON in ```json ... ```.
    const cleanedText = text.replace(/^```json\s*/, '').replace(/```$/, '').trim();
    try {
        return JSON.parse(cleanedText);
    } catch (e) {
        console.error("Failed to parse JSON:", e);
        console.error("Original text from API:", text);
        // Attempt to find a JSON object within the string if it's not perfectly formatted
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                return JSON.parse(jsonMatch[0]);
            } catch (e2) {
                console.error("Failed to parse extracted JSON:", e2);
            }
        }
        // If all else fails, throw an error.
        throw new Error("A resposta da IA não estava no formato JSON esperado. Por favor, tente novamente.");
    }
};

const App: React.FC = () => {
  const [sermonData, setSermonData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bibleData] = useState<Book[]>(initialBibleStructure);
  const [progress, setProgress] = useState(0);
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
  const [isPreGenerating, setIsPreGenerating] = useState(false);
  const debounceTimerRef = useRef<number | null>(null);
  const isGeneratingRef = useRef(false);
  
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    visible: false, top: 0, left: 0, originalFullText: '', selectedText: '', onComplete: () => {}
  });
  const [isAiEditing, setIsAiEditing] = useState(false);

  useEffect(() => {
    isGeneratingRef.current = isGeneratingPresentation || isPreGenerating;
  }, [isGeneratingPresentation, isPreGenerating]);

  const fetchSavedSermons = useCallback(async () => {
    setIsLoadingSermons(true);
    setLoadSermonsError(null);
    try {
      const response = await fetch(`${JSONBIN_URL}/latest`, {
        headers: { 'X-Master-Key': JSONBIN_API_KEY }
      });
      if (!response.ok) {
        // If the bin is not found (e.g., new), treat it as empty.
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
    let animationFrameId: number;
    let startTime: number;
    // The total generation time is about 2-3 minutes.
    // Let's make the progress to 95% take 80 seconds (1 minute and 20 seconds).
    const DURATION_TO_95_PERCENT = 80 * 1000; 

    const updateProgress = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const elapsedTime = timestamp - startTime;
      const progressValue = Math.min((elapsedTime / DURATION_TO_95_PERCENT) * 95, 95);

      setProgress(progressValue);

      if (progressValue < 95) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };

    if (isLoading) {
      setProgress(0); // Start at 0
      animationFrameId = requestAnimationFrame(updateProgress);
    }

    return () => {
      if(animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isLoading]);

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
  
  const generatePresentationData = useCallback(async (sourceSermonData: any) => {
    if (!sourceSermonData) return null;
    setError(null);
    try {
        const apiKey = getApiKey();
        if (!apiKey) {
          throw new Error("Chave da API não configurada. Configure a VITE_GEMINI_API_KEY no GitHub.");
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
            Você é um assistente de pregação especializado em criar conteúdo visual para apresentações.
            Sua tarefa é converter um esboço de sermão detalhado, fornecido em formato JSON, em uma versão otimizada para slides.
            Para CADA campo de texto no JSON de entrada que contém conteúdo do sermão (como 'content', 'hook', 'argument', 'subsections.content', 'application', 'recap', etc.), você deve seguir estas regras:
            1. Analise o parágrafo ou texto original.
            2. Extraia as ideias principais.
            3. Reescreva essas ideias como uma lista de sentenças curtas, assertivas e independentes.
            4. Cada sentença deve ter entre 5 e 10 palavras.
            5. Para enfatizar palavras-chave ou conceitos teológicos importantes, envolva-os com asteriscos duplos (ex: **graça**). Use isso para destacar os termos mais significativos.
            6. O resultado para cada campo deve ser uma ÚNICA STRING, com cada sentença separada por um caractere de nova linha ('\\n').
            IMPORTANTE:
            - O JSON de saída deve ter EXATAMENTE a mesma estrutura, chaves e hierarquia do JSON de entrada.
            - Altere APENAS os valores dos campos de texto conforme as regras acima.
            - Campos que já são títulos curtos (como 'title') podem permanecer inalterados.
            - A resposta DEVE ser um objeto JSON válido, sem nenhum texto ou markdown adicional ao redor dele.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Use a faster model for this task
            contents: `${prompt}\n\nJSON de Entrada:\n${JSON.stringify(sourceSermonData)}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: sermonSchema,
            },
        });

        return parseJsonResponse(response.text);
    } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Não foi possível gerar o modo de apresentação.";
        setError(errorMessage);
        return null;
    }
  }, []);

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

      debounceTimerRef.current = window.setTimeout(async () => {
        if (isGeneratingRef.current) return; // Don't start if another generation is active
        
        setIsPreGenerating(true);
        const presData = await generatePresentationData(newData);
        setPresentationData(presData);
        setIsPreGenerating(false);
      }, 2000); // 2-second debounce

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
            top: rect.top + window.scrollY - 50, // Position above selection
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
            const apiKey = getApiKey();
            if (!apiKey) {
              throw new Error("Chave da API não configurada. Configure a VITE_GEMINI_API_KEY no GitHub.");
            }

            const ai = new GoogleGenAI({ apiKey });
            let prompt = '';
            switch (action) {
                case 'shorten':
                    prompt = `Encurte o seguinte texto, mantendo a ideia principal: "${selectedText}"`;
                    break;
                case 'lengthen':
                    prompt = `Alongue o seguinte texto, adicionando detalhes e expandindo as ideias, mas mantendo o mesmo sentido: "${selectedText}"`;
                    break;
                case 'rephrase':
                    prompt = `Reescreva o seguinte texto como uma série de sentenças curtas e assertivas: "${selectedText}"`;
                    break;
            }

            const response = await ai.models.generateContent({
              model: "gemini-2.5-flash",
              contents: prompt,
            });

            const newText = response.text.trim();
            // Replace only the first occurrence to avoid unintended changes
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


  const handleGenerateSermon = async (passage: string, pdfText: string | null) => {
    setIsLoading(true);
    setError(null);
    setSermonData(null);
    setPresentationData(null); // Clear any old presentation data
    setIsEditing(false);
    setCurrentPassage(passage);

    try {
      const apiKey = getApiKey();
      if (!apiKey) {
        throw new Error("Chave da API não configurada. Configure a VITE_GEMINI_API_KEY no GitHub.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const systemInstruction = `Você é um teólogo e pregador Batista Reformado criando um esboço de sermão expositivo. Sua resposta DEVE ser um único objeto JSON que adere estritamente ao schema fornecido. NÃO inclua nenhum texto, markdown ou explicação fora do objeto JSON. O tom deve ser teologicamente robusto, claro e pastoral.`;
      
      let prompt = `Gere um sermão expositivo sobre a passagem: ${passage}.`;

      if (pdfText) {
        // Truncate PDF text to a safer length to prevent model confusion
        const truncatedPdfText = pdfText.substring(0, 8000);
        prompt += `\n\nUse o seguinte documento como inspiração teológica. Integre seus conceitos onde for pertinente, mas foque na passagem bíblica fornecida. O documento é apenas um material de apoio.\n\n--- INÍCIO DO DOCUMENTO ---\n${truncatedPdfText}\n--- FIM DO DOCUMENTO ---`;
      }
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
          systemInstruction: systemInstruction,
          responseMimeType: "application/json",
          responseSchema: sermonSchema,
          temperature: 0.5,
          thinkingConfig: { thinkingBudget: 32768 },
        },
      });
      
      const sermonJson = parseJsonResponse(response.text);
      
      setProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500)); // Wait for 0.5s to show 100%
      setSermonData(sermonJson);
      setSaveSuccess(false);

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Não foi possível gerar o esboço. Verifique a passagem bíblica ou tente novamente mais tarde.";
      setError(errorMessage);
      setSermonData(null); 
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleEnterPresentationMode = async () => {
    if (!sermonData || isGeneratingRef.current) return;
    
    // Clear any pending debounced generation
    if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
    }

    // If presentation data already exists, use it immediately.
    if (presentationData) {
        setIsPresentationMode(true);
        return;
    }

    // Otherwise, generate it on-demand.
    setIsGeneratingPresentation(true);
    const presData = await generatePresentationData(sermonData);
    if (presData) {
        setPresentationData(presData);
    }
    setIsPresentationMode(true); // Enter presentation mode even if generation fails
    setIsGeneratingPresentation(false);
  };


  const handleSaveSermon = async () => {
    if (!sermonData || !currentPassage) return;

    const newSermon = {
      id: Date.now(),
      passage: currentPassage,
      data: sermonData,
      presentationData: presentationData, // Save presentation data with the sermon
    };
    const previousSermons = [...savedSermons];
    const updatedSermons = [...savedSermons, newSermon];

    // Optimistic UI update
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
      setPresentationData(sermon.presentationData || null); // Load presentation data if it exists
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const data = isPresentationMode ? (presentationData || sermonData) : sermonData;
  const isBusyGenerating = isGeneratingPresentation || isPreGenerating;

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
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 presentation-content-wrapper">
        <div className="hide-in-presentation">
            <Header 
              themeAndSubtitle={sermonData?.theme_and_subtitle || "Gere um novo esboço de sermão abaixo."}
              isEditing={isEditing}
              onUpdate={handleSermonDataChange}
            />
        </div>
        
        <div className="hide-in-presentation">
          <SermonGeneratorForm 
              onGenerate={handleGenerateSermon} 
              isLoading={isLoading} 
              error={error}
              bibleData={bibleData}
          />
        </div>
        
        <section className="my-12 hide-in-presentation">
          <h2 className="font-sans font-bold text-3xl text-primary-dark border-b border-border pb-3 mb-6">
            Meus Sermões Salvos
          </h2>
          {isLoadingSermons && <p className="text-text-secondary">Carregando sermões...</p>}
          {loadSermonsError && <p className="text-red-600 font-semibold bg-red-100 p-3 rounded-md">{loadSermonsError}</p>}
          {!isLoadingSermons && !loadSermonsError && (
            savedSermons.length === 0 ? (
              <p className="text-text-secondary">Você ainda não salvou nenhum sermão.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedSermons.map(sermon => (
                  <div key={sermon.id} className="bg-surface p-4 rounded-lg shadow-md border border-border flex justify-between items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-text-primary truncate">{sermon.data.title}</p>
                      <p className="text-sm text-text-secondary truncate">{sermon.passage}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button 
                        onClick={() => handleLoadSermon(sermon)}
                        className="px-3 py-1 text-sm font-semibold rounded-md text-primary-text bg-primary-main hover:bg-primary-dark transition"
                      >
                        Carregar
                      </button>
                      <button
                        onClick={() => handleDeleteSermon(sermon.id)}
                        className="p-2 text-text-secondary hover:text-red-600 hover:bg-background rounded-full transition"
                        aria-label="Deletar sermão"
                      >
                        <DeleteIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </section>

        {isLoading && (
          <div className="text-center my-12 transition-opacity duration-300">
            <p className="font-sans text-lg text-text-secondary mb-3">
                Gerando esboço, por favor aguarde...
            </p>
            <div className="w-full max-w-md mx-auto bg-surface rounded-full h-2.5 border border-border">
                <div
                    className="bg-primary-main h-2.5 rounded-full transition-all duration-100 ease-linear"
                    style={{ width: `${progress}%` }}
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    role="progressbar"
                    aria-label="Progresso da geração do sermão"
                ></div>
            </div>
            <p className="font-sans font-semibold text-xl text-primary-dark mt-3">
                {Math.round(progress)}%
            </p>
          </div>
        )}
        
        {data && !isLoading && (
          <>
            <div className="flex justify-end items-center gap-4 mb-4 edit-controls hide-in-presentation">
              <div className="relative flex items-center">
                  <button
                    onClick={handleSaveSermon}
                    disabled={isSaving || saveSuccess}
                    type="button"
                    className={`inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-background disabled:opacity-70 disabled:cursor-not-allowed ${
                      saveSuccess 
                        ? 'bg-accent-green-main text-white' 
                        : 'text-text-secondary bg-surface hover:bg-background'
                    }`}
                  >
                    {isSaving ? (
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : saveSuccess ? (
                      <CheckIcon className="h-5 w-5 mr-2" />
                    ) : (
                      <SaveIcon className="h-5 w-5 mr-2" />
                    )}
                    <span>{isSaving ? 'Salvando...' : saveSuccess ? 'Salvo!' : 'Salvar Sermão'}</span>
                  </button>
                  {saveError && <p className="ml-3 text-sm text-red-600">{saveError}</p>}
              </div>

              <ExportButton />
               <button
                  onClick={handleEnterPresentationMode}
                  disabled={isBusyGenerating}
                  type="button"
                  className="inline-flex items-center justify-center px-4 py-2 border border-border text-sm font-medium rounded-md text-text-secondary bg-surface hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-background disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isBusyGenerating ? (
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <PresentationIcon className="h-5 w-5 mr-2" />
                  )}
                  <span>{isBusyGenerating ? 'Preparando...' : 'Apresentação'}</span>
              </button>
              <EditModeToggle isEditing={isEditing} onToggle={() => setIsEditing(!isEditing)} />
            </div>
            
            {!isPresentationMode && data.title && (
              <div className="text-center mb-12">
                  <EditableField
                      as="h1"
                      className="font-sans font-bold text-4xl md:text-5xl text-primary-dark leading-tight"
                      isEditing={isEditing}
                      isPresentationMode={isPresentationMode}
                      value={data.title}
                      onChange={(newValue) => handleSermonDataChange(['title'], newValue)}
                      onTextSelect={handleTextSelect}
                  />
                  {data.theme_and_subtitle && (
                    <EditableField
                      as="p"
                      className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto mt-4"
                      isEditing={isEditing}
                      isPresentationMode={isPresentationMode}
                      value={data.theme_and_subtitle}
                      onChange={(newValue) => handleSermonDataChange(['theme_and_subtitle'], newValue)}
                      onTextSelect={handleTextSelect}
                    />
                  )}
              </div>
            )}

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
                <div className="space-y-12">
                  {data.development.map((point: any, index: number) => (
                    point && <SermonPoint 
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
                  ))}
                </div>
              </SermonSection>
            )}

            {data.conclusion && (
              <SermonSection title={data.conclusion.title} id="sermon-section-conclusion">
                <div className="mb-4 flex items-start">
                    <strong className="font-semibold text-primary-dark mr-2">Recapitulação:</strong>
                    <EditableField
                      as="span"
                      isEditing={isEditing}
                      isPresentationMode={isPresentationMode}
                      value={data.conclusion.recap}
                      onChange={(newValue) => handleSermonDataChange(['conclusion', 'recap'], newValue)}
                      onTextSelect={handleTextSelect}
                      className="flex-1"
                    />
                </div>

                <div className="mt-6 space-y-6">
                  {data.conclusion.appealToBelievers && <div className="p-4 bg-accent-green-light border-l-4 border-accent-green-main rounded-r-lg">
                    <h3 className="font-bold text-accent-green-dark mb-2">Apelo aos Crentes</h3>
                    <EditableField
                        as="p"
                        isEditing={isEditing}
                        isPresentationMode={isPresentationMode}
                        value={data.conclusion.appealToBelievers}
                        onChange={(newValue) => handleSermonDataChange(['conclusion', 'appealToBelievers'], newValue)}
                        onTextSelect={handleTextSelect}
                    />
                  </div>}
                  {data.conclusion.appealToUnbelievers && <div className="p-4 bg-accent-amber-light border-l-4 border-accent-amber-main rounded-r-lg">
                    <h3 className="font-bold text-accent-amber-dark mb-2">Apelo aos Não-Crentes</h3>
                     <EditableField
                        as="p"
                        isEditing={isEditing}
                        isPresentationMode={isPresentationMode}
                        value={data.conclusion.appealToUnbelievers}
                        onChange={(newValue) => handleSermonDataChange(['conclusion', 'appealToUnbelievers'], newValue)}
                        onTextSelect={handleTextSelect}
                    />
                  </div>}
                </div>
              </SermonSection>
            )}
          </>
        )}

        <footer className="text-center mt-16 text-text-secondary text-sm hide-in-presentation">
            <p>Esboço de Pregação Digital Gerado por IA</p>
            <p>&copy; {new Date().getFullYear()}</p>
        </footer>

      </main>
    </div>
  );
}

export default App;
