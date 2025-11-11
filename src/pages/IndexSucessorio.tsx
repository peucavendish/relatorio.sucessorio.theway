import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@/context/ThemeContext';
import { CardVisibilityProvider } from '@/context/CardVisibilityContext';
import { SectionVisibilityProvider } from '@/context/SectionVisibilityContext';
import Header from '@/components/layout/Header';
import CoverPageSucessorio from '@/components/sections/CoverPageSucessorio';
import DiagnosticoSucessorio from '@/components/sections/DiagnosticoSucessorio';
import PatrimonioSucessorio from '@/components/sections/PatrimonioSucessorio';
import EstruturasExistentes from '@/components/sections/EstruturasExistentes';
import EstrategiasRecomendadas from '@/components/sections/EstrategiasRecomendadas';
import EstimativasRiscos from '@/components/sections/EstimativasRiscos';
import ChecagemDocumental from '@/components/sections/ChecagemDocumental';
import CronogramaSucessorio from '@/components/sections/CronogramaSucessorio';
import FloatingActions from '@/components/layout/FloatingActions';
import { DotNavigation, MobileDotNavigation } from '@/components/layout/DotNavigation';
import { useSectionObserver } from '@/hooks/useSectionObserver';
import { Loader2 } from 'lucide-react';
import PrintExportButton from '@/components/ui/PrintExportButton';
import HideableSection from '@/components/ui/HideableSection';
import axios from 'axios';
import { SuccessionPlanningData } from '@/types/successionPlanning';

interface IndexSucessorioProps {
  accessor?: boolean;
  clientPropect?: boolean;
}

const IndexSucessorio: React.FC<IndexSucessorioProps> = ({ accessor, clientPropect }) => {
  const { activeSection, navigateToSection } = useSectionObserver();
  const [isLoading, setIsLoading] = useState(true);
  const [successionData, setSuccessionData] = useState<SuccessionPlanningData | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('');

  useEffect(() => {
    const fetchSuccessionData = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionIdFromUrl = urlParams.get('sessionId');

        if (sessionIdFromUrl) {
          setSessionId(sessionIdFromUrl);
          const apiUrl = import.meta.env.VITE_API_THE_WAY;
          const response = await axios.get(`${apiUrl}/sucessorio-reports/${sessionIdFromUrl}`);

          const reportData = JSON.parse(response.data[0].report_data);

          // Normalizar o JSON (pode vir em diferentes formatos)
          const normalizeReport = (raw: any): SuccessionPlanningData | null => {
            const base = Array.isArray(raw) ? raw[0] : raw;
            const output = base?.output ?? base;

            // Verificar se tem a estrutura de planejamento sucessório
            if (output?.meta?.etapa === 'Planejamento Sucessório' || output?.cliente?.estado_civil) {
              return output as SuccessionPlanningData;
            }

            return null;
          };

          const normalized = normalizeReport(reportData);

          if (normalized) {
            setSuccessionData(normalized);
            // Tentar obter o nome do cliente se disponível
            const name = normalized.cliente?.nome || reportData?.cliente?.nome || '';
            setClientName(name);
          } else {
            console.error('Formato de dados não reconhecido como planejamento sucessório');
          }
        }
      } catch (error) {
        console.error('Error fetching succession data:', error);
      }
    };

    fetchSuccessionData();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading || !successionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <ThemeProvider>
      <CardVisibilityProvider>
        <SectionVisibilityProvider>
          <div className="relative h-screen overflow-hidden">
            <Header showLogout={!!clientPropect} showSummaryToggle={!clientPropect} />
            <main className="h-[calc(100vh-64px)] overflow-y-auto">
              <div className="min-h-screen">
                <CoverPageSucessorio
                  data={successionData}
                  clientName={clientName}
                />
              </div>

              <HideableSection sectionId="diagnostico" hideControls={clientPropect}>
                <DiagnosticoSucessorio data={successionData} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="patrimonio" hideControls={clientPropect}>
                <PatrimonioSucessorio data={successionData} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="estruturas" hideControls={clientPropect}>
                <EstruturasExistentes data={successionData} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="estrategias" hideControls={clientPropect}>
                <EstrategiasRecomendadas data={successionData} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="estimativas-riscos" hideControls={clientPropect}>
                <EstimativasRiscos data={successionData} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="checagem-documental" hideControls={clientPropect}>
                <ChecagemDocumental data={successionData} hideControls={clientPropect} />
              </HideableSection>

              <HideableSection sectionId="cronograma" hideControls={clientPropect}>
                <CronogramaSucessorio data={successionData} hideControls={clientPropect} />
              </HideableSection>
            </main>
            <DotNavigation clientMode={!!clientPropect} />
            <MobileDotNavigation clientMode={!!clientPropect} />
            {!clientPropect && <FloatingActions userReports={successionData} />}
            {!clientPropect && <PrintExportButton />}
          </div>
        </SectionVisibilityProvider>
      </CardVisibilityProvider>
    </ThemeProvider>
  );
};

export default IndexSucessorio;
