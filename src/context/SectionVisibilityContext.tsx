import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';

interface SectionVisibilityContextType {
    hiddenSections: Record<string, boolean>;
    toggleSectionVisibility: (sectionId: string) => void;
    isSectionVisible: (sectionId: string) => boolean;
    isLoading: boolean;
    getVisibleSections: () => string[];
    getHiddenSections: () => string[];
    resetAllSectionsToVisible: () => void;
    summaryMode: boolean;
    setSummaryMode: (enabled: boolean) => void;
}

const SectionVisibilityContext = createContext<SectionVisibilityContextType | undefined>(undefined);

// Lista de todas as seções possíveis (ordem desejada)
const ALL_SECTION_IDS = [
    "summary",                     // Resumo Financeiro
    "total-asset-allocation",     // Gestão de Ativos
    "retirement",                 // Aposentadoria
    "beach-house",                // Aquisição de Imóveis
    "protection",                 // Proteção Patrimonial
    "succession",                 // Planejamento Sucessório
    "tax",                        // Planejamento Tributário
    "financial-security-indicator", // Indicador de Segurança Financeira
    "action-plan",                // Plano de Ação
    "life-projects",              // Projetos de Vida
    "implementation-monitoring"   // Implementação e Monitoramento
];

// Função para criar um objeto com todas as seções visíveis
const createAllSectionsVisibleState = () => {
    return ALL_SECTION_IDS.reduce((acc, sectionId) => {
        acc[sectionId] = false; // false = visível (não oculto)
        return acc;
    }, {} as Record<string, boolean>);
};

export const SectionVisibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hiddenSections, setHiddenSections] = useState<Record<string, boolean>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [initialized, setInitialized] = useState(false);
    const [summaryMode, setSummaryModeState] = useState(false);
    const previousHiddenRef = React.useRef<Record<string, boolean> | null>(null);

    // Função para obter o session_id da URL
    const getSessionId = useCallback(() => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('sessionId');
    }, []);

    // Função para buscar o estado inicial do backend
    const fetchInitialState = useCallback(async () => {
        const sessionId = getSessionId();
        if (!sessionId || initialized) {
            setIsLoading(false);
            return;
        }

        try {
            const apiUrl = import.meta.env.VITE_API_THE_WAY;
            const response = await axios.get(`${apiUrl}/clients/hidden-sections?session_id=${sessionId}`);

            let hiddenSectionsData = response.data.hiddenSections;

            // Se hiddenSections for null/undefined ou não for um objeto, inicializa com todas as seções visíveis
            if (!hiddenSectionsData || typeof hiddenSectionsData !== 'object') {
                hiddenSectionsData = createAllSectionsVisibleState();

                // Salva o estado inicial no backend
                await axios.post(`${apiUrl}/clients/update-hidden-sections`, {
                    session_id: sessionId,
                    hiddenSections: hiddenSectionsData
                });
            } else {
                // Garante que todas as seções estejam presentes no objeto retornado
                const allSectionsState = createAllSectionsVisibleState();
                // Prioriza o estado do backend, mas garante que seções não existentes sejam visíveis
                hiddenSectionsData = { ...allSectionsState, ...hiddenSectionsData };

                // Força todas as seções a serem visíveis por padrão se não estiverem definidas
                ALL_SECTION_IDS.forEach(sectionId => {
                    if (hiddenSectionsData[sectionId] === undefined) {
                        hiddenSectionsData[sectionId] = false; // false = visível
                    }
                });
            }

            setHiddenSections(hiddenSectionsData);
            setInitialized(true);
        } catch (error) {
            console.error('Error fetching hidden sections state:', error);
            // Em caso de erro, define todas as seções como visíveis
            setHiddenSections(createAllSectionsVisibleState());
        } finally {
            setIsLoading(false);
        }
    }, [initialized, getSessionId]);

    // Função para atualizar o estado no backend
    const updateBackendState = useCallback(async (newState: Record<string, boolean>) => {
        const sessionId = getSessionId();
        if (!sessionId) return;

        try {
            const apiUrl = import.meta.env.VITE_API_THE_WAY;
            await axios.post(`${apiUrl}/clients/update-hidden-sections`, {
                session_id: sessionId,
                hiddenSections: newState
            });
        } catch (error) {
            console.error('Error updating hidden sections state:', error);
        }
    }, [getSessionId]);

    // Buscar estado inicial ao montar o componente
    useEffect(() => {
        fetchInitialState();
    }, [fetchInitialState]);

    // Função para alternar visibilidade de uma seção
    const toggleSectionVisibility = useCallback((sectionId: string) => {
        setHiddenSections(prev => {
            const newState = {
                ...prev,
                [sectionId]: !prev[sectionId]
            };

            // Atualizar o backend quando houver mudança
            updateBackendState(newState);

            return newState;
        });
    }, [updateBackendState]);

    // Alterna o modo resumido do relatório
    const setSummaryMode = useCallback((enabled: boolean) => {
        setSummaryModeState(enabled);

        // Se ainda não inicializou o estado de seções, não faz nada
        if (isLoading) return;

        if (enabled) {
            // Salva estado anterior para restaurar depois
            previousHiddenRef.current = { ...hiddenSections };

            const newState = {
                ...hiddenSections,
                // Ocultar seções para versão resumida
                'beach-house': true,     // Aquisição de Imóveis
                'succession': true,      // Planejamento Sucessório
                'tax': true,             // Planejamento Tributário
                'financial-security-indicator': true  // Indicador de Segurança Financeira
            };
            setHiddenSections(newState);
            updateBackendState(newState);
        } else {
            // Restaurar estado anterior (ou todas visíveis se não houver)
            const restored = previousHiddenRef.current ?? createAllSectionsVisibleState();
            setHiddenSections(restored);
            updateBackendState(restored);
            previousHiddenRef.current = null;
        }
    }, [hiddenSections, isLoading, updateBackendState]);

    // Função para verificar se uma seção está visível
    const isSectionVisible = useCallback((sectionId: string) => {
        return !hiddenSections[sectionId];
    }, [hiddenSections]);

    // Função para obter lista de seções visíveis
    const getVisibleSections = useCallback(() => {
        return ALL_SECTION_IDS.filter(sectionId => isSectionVisible(sectionId));
    }, [isSectionVisible]);

    // Função para obter lista de seções ocultas
    const getHiddenSections = useCallback(() => {
        return ALL_SECTION_IDS.filter(sectionId => !isSectionVisible(sectionId));
    }, [isSectionVisible]);

    // Função para resetar todas as seções como visíveis
    const resetAllSectionsToVisible = useCallback(() => {
        const allVisibleState = createAllSectionsVisibleState();
        setHiddenSections(allVisibleState);
        updateBackendState(allVisibleState);
    }, [updateBackendState]);

    const value = {
        hiddenSections,
        toggleSectionVisibility,
        isSectionVisible,
        isLoading,
        getVisibleSections,
        getHiddenSections,
        resetAllSectionsToVisible,
        summaryMode,
        setSummaryMode
    };

    return (
        <SectionVisibilityContext.Provider value={value}>
            {children}
        </SectionVisibilityContext.Provider>
    );
};

export const useSectionVisibility = () => {
    const context = useContext(SectionVisibilityContext);
    if (context === undefined) {
        throw new Error('useSectionVisibility must be used within a SectionVisibilityProvider');
    }
    return context;
};

export default useSectionVisibility; 