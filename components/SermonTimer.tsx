

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PlayIcon, PauseIcon, RefreshIcon, MinimizeIcon, EnterFullscreenIcon, CloseIcon } from './Icons';

interface SermonTimerProps {
  sermonData: any;
  onExit: () => void;
}

const TOTAL_DURATION = 40 * 60; // 40 minutes in seconds

const formatTime = (seconds: number): string => {
  const flooredSeconds = Math.floor(seconds);
  const minutes = Math.floor(flooredSeconds / 60);
  const remainingSeconds = flooredSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

export const SermonTimer: React.FC<SermonTimerProps> = ({ sermonData, onExit }) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  
  const startTimeRef = useRef<number | null>(null);
  // Fix: The useRef hook requires an initial value. Provided 'undefined' to resolve the "Expected 1 arguments, but got 0" error.
  const animationFrameRef = useRef<number | undefined>(undefined);

  const sectionMap = useMemo(() => {
    if (!sermonData) return [];
    
    const sections: {start: number, end: number, label: string, title: string, id: string}[] = [];

    if (sermonData.introduction) {
        sections.push({ 
            start: 0, 
            end: 5 * 60, 
            label: 'Introdução', 
            title: sermonData.introduction.title || 'Introdução', 
            id: 'sermon-section-introduction' 
        });
    }

    if (sermonData.development) {
        sermonData.development.forEach((point: any, index: number) => {
            const pointStartTime = (5 + index * 10) * 60;
            const pointEndTime = pointStartTime + 10 * 60;
            sections.push({
                start: pointStartTime,
                end: pointEndTime,
                label: `Ponto ${point.point}`,
                title: point.title || `Ponto ${point.point}`,
                id: `sermon-point-${index}`
            });
        });
    }

    if (sermonData.conclusion) {
        sections.push({ 
            start: 35 * 60, 
            end: 40 * 60, 
            label: 'Conclusão', 
            title: sermonData.conclusion.title || 'Conclusão',
            id: 'sermon-section-conclusion' 
        });
    }
    
    return sections;
  }, [sermonData]);
  
  useEffect(() => {
    const tick = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp - elapsedTime * 1000;
      }

      const currentElapsedTime = (timestamp - startTimeRef.current) / 1000;

      if (currentElapsedTime >= TOTAL_DURATION) {
        setElapsedTime(TOTAL_DURATION);
        setIsRunning(false);
        return; 
      }
      
      setElapsedTime(currentElapsedTime);

      animationFrameRef.current = requestAnimationFrame(tick);
    };

    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(tick);
    } else {
      startTimeRef.current = null;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, elapsedTime]);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  const handleTogglePlay = () => {
    if (elapsedTime >= TOTAL_DURATION && !isRunning) return;
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedTime(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const progressPercentage = useMemo(() => (elapsedTime / TOTAL_DURATION) * 100, [elapsedTime]);
  
  const currentSectionInfo = useMemo(() => {
    if (elapsedTime >= TOTAL_DURATION) {
      return { label: 'Concluído', title: 'Sermão finalizado.' };
    }
    if (elapsedTime <= 0 && sectionMap.length > 0) {
        return sectionMap[0];
    }
    const currentSection = sectionMap.slice().reverse().find(
      section => elapsedTime >= section.start
    );
    return currentSection || (sectionMap.length > 0 ? sectionMap[0] : undefined);
  }, [elapsedTime, sectionMap]);
  
  const markers = useMemo(() => sectionMap.map(sec => ({ time: sec.end, label: `${sec.label}: ${sec.title}` })), [sectionMap]);

  const buttonClasses = "p-2 rounded-full text-text-secondary hover:bg-primary-light hover:text-primary-dark transition-colors focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-surface";

  return (
    <div className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-sm text-text-primary shadow-lg border-b border-border font-sans transition-all duration-300">
      <div className="relative h-14 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <button onClick={handleTogglePlay} title={isRunning ? 'Pausar' : 'Iniciar'} className={buttonClasses}>
            {isRunning ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </button>
          <button onClick={handleReset} title="Reiniciar" className={buttonClasses}>
            <RefreshIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none text-center min-w-0 px-2">
            {currentSectionInfo && (
                <div className="flex items-baseline gap-2 bg-background rounded-full border border-border shadow-inner px-4 py-1">
                    <span className="font-semibold text-text-secondary text-lg truncate">{currentSectionInfo.label}</span>
                    <span className="font-normal text-text-primary text-lg truncate hidden sm:inline">{currentSectionInfo.title}</span>
                </div>
            )}
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-3xl font-bold text-primary-dark tracking-tighter">
            {formatTime(elapsedTime)}
          </span>
          <button onClick={toggleFullscreen} title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'} className={buttonClasses}>
            {isFullscreen ? <MinimizeIcon className="h-6 w-6" /> : <EnterFullscreenIcon className="h-6 w-6" />}
          </button>
          <button onClick={onExit} title="Sair da Apresentação (Esc)" className={buttonClasses}>
            <CloseIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-1.5 bg-background border-t border-border">
          <div
            className="h-full bg-primary-main"
            style={{ width: `${progressPercentage}%` }}
          />
          {markers.map((marker, index) => {
            const markerPos = (marker.time / TOTAL_DURATION) * 100;
            const isPassed = elapsedTime >= marker.time;
            return (
              <div
                key={index}
                className={`absolute top-0 h-full w-1 ${isPassed ? 'bg-primary-dark' : 'bg-border'}`}
                style={{ left: `${markerPos}%` }}
                title={`${marker.label} (${formatTime(marker.time)})`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};