import React from 'react';
import { TrendingUp, Activity, PiggyBank, Target, Percent, Camera, Trash2, Download } from 'lucide-react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

import { reviewBoardService, SnapshotEntry, SnapshotMetrics, ReviewBoardData } from '@/services/reviewBoardService';

interface ImplementationMonitoringProps {
  data: any;
  hideControls?: boolean;
  sessionId?: string;
}

function toPercentage(value: number) {
  if (!isFinite(value)) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function pow1p(baseRate: number, periods: number) {
  return Math.pow(1 + baseRate, periods);
}



function getQuarterLabel(dateIso: string) {
  const d = new Date(dateIso);
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `T${q}/${d.getFullYear()}`;
}

const ImplementationMonitoring: React.FC<ImplementationMonitoringProps> = ({ data, hideControls, sessionId }) => {
  const titleRef = useScrollAnimation<HTMLDivElement>();
  const sectionRef = useScrollAnimation<HTMLDivElement>({ threshold: 0.2 });
  const captureRef = React.useRef<HTMLDivElement>(null);


  if (!data) {
    return <section className="py-16 px-4" id="implementation-monitoring"><div className="section-container">Dados de monitoramento não disponíveis</div></section>;
  }

  const currentInvestments: number = Number(
    data?.financas?.composicaoPatrimonial?.Investimentos ??
    (Array.isArray(data?.financas?.ativos)
      ? data.financas.ativos
        .filter((a: any) => (a?.classe || a?.tipo || '').toLowerCase().includes('invest'))
        .reduce((sum: number, a: any) => sum + (Number(a?.valor) || 0), 0)
      : 0)
  ) || 0;

  const monthlySurplus: number = Number(data?.financas?.excedenteMensal) || 0;
  const recommendedMonthlyContribution: number = Number(data?.aposentadoria?.aporteMensalRecomendado) || 0;
  const expectedMonthlyContribution: number = recommendedMonthlyContribution || monthlySurplus || 0;
  const expectedQuarterContribution = expectedMonthlyContribution * 3;

  const realizedQuarterContribution: number = Number(
    data?.planoAcao?.acompanhamentoProgresso?.aportesRealizadosTrimestre
  ) || 0;

  // Parâmetros editáveis (padrões conforme solicitação)
  const [ipcaAnnual, setIpcaAnnual] = React.useState<number>(0.03); // 3%
  const [cdiAnnual, setCdiAnnual] = React.useState<number>(0.1375); // 13,75%

  // Captura/Histórico
  const [capturing, setCapturing] = React.useState<boolean>(false);
  const [captured, setCaptured] = React.useState<boolean>(false);
  const [snapshots, setSnapshots] = React.useState<SnapshotEntry[]>([]);
  const [hoverPreview, setHoverPreview] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadReviewBoardData = async () => {
      if (!sessionId) {
        return;
      }

      try {
        // Carregar dados do banco de dados
        const response = await reviewBoardService.loadReviewBoard(sessionId);
        if (response.reviewBoard?.snapshots) {
          setSnapshots(response.reviewBoard.snapshots);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do review board:', error);
      }
    };

    loadReviewBoardData();
  }, [sessionId]);

  const handleCapture = async () => {
    if (!captureRef.current) return;
    try {
      setCapturing(true);
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(captureRef.current, {
        backgroundColor: '#ffffff',
        scale: Math.min(2, window.devicePixelRatio || 1),
        useCORS: true,
        foreignObjectRendering: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const nowIso = new Date().toISOString();
      const cdiQ = pow1p(cdiAnnual, 3 / 12) - 1;
      const ipcaQ = ipcaAnnual / 4;
      const expectedReturn = currentInvestments * cdiQ;
      const expectedPat = currentInvestments + expectedReturn + expectedQuarterContribution;
      const aporteComp = expectedQuarterContribution > 0 ? Math.min(1, realizedQuarterContribution / expectedQuarterContribution) : 0;
      const patrComp = expectedPat > 0 ? Math.min(1, currentInvestments / expectedPat) : 0;
      const entry: SnapshotEntry = {
        id: Date.now(),
        dateIso: nowIso,
        dataUrl,
        metrics: {
          cdiAnnual,
          ipcaAnnual,
          cdiQuarter: cdiQ,
          ipcaQuarter: ipcaQ,
          expectedQuarterContribution,
          expectedQuarterReturn: expectedReturn,
          realizedQuarterContribution,
          aporteCompliance: aporteComp,
          expectedQuarterPatrimony: expectedPat,
          realPatrimony: currentInvestments,
          patrimonioCompliance: patrComp
        }
      };
      const updatedSnapshots = [entry, ...snapshots];
      setSnapshots(updatedSnapshots);

      // Salvar no banco de dados se sessionId estiver disponível
      if (sessionId) {
        try {
          const reviewBoardData: ReviewBoardData = {
            snapshots: updatedSnapshots
          };
          await reviewBoardService.saveReviewBoard(sessionId, reviewBoardData);
        } catch (error) {
          console.error('Erro ao salvar no banco de dados:', error);
        }
      }
      setCaptured(true);
      setTimeout(() => setCaptured(false), 1800);
    } catch (e) {
      // noop
    } finally {
      setCapturing(false);
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    const updatedSnapshots = snapshots.filter(s => s.id !== id);
    setSnapshots(updatedSnapshots);

    // Salvar no banco de dados se sessionId estiver disponível
    if (sessionId) {
      try {
        const reviewBoardData: ReviewBoardData = {
          snapshots: updatedSnapshots
        };
        await reviewBoardService.saveReviewBoard(sessionId, reviewBoardData);
      } catch (error) {
        console.error('Erro ao salvar no banco de dados:', error);
      }
    }
  };

  // Derivados
  const cdiQuarter = pow1p(cdiAnnual, 3 / 12) - 1;
  const ipcaQuarter = ipcaAnnual / 4;

  const expectedQuarterReturn = currentInvestments * cdiQuarter;
  const expectedQuarterPatrimony = currentInvestments + expectedQuarterReturn + expectedQuarterContribution;

  // Real atual reportado
  const realPatrimony = currentInvestments;

  const aporteCompliance = expectedQuarterContribution > 0
    ? Math.min(1, realizedQuarterContribution / expectedQuarterContribution)
    : 0;

  const patrimonioCompliance = expectedQuarterPatrimony > 0
    ? Math.min(1, realPatrimony / expectedQuarterPatrimony)
    : 0;

  return (
    <section className="py-16 px-4" id="implementation-monitoring">
      <div className="section-container">
        <div ref={titleRef} className="mb-12 text-center animate-on-scroll">
          <div className="inline-block">
            <div className="card-flex-center mb-4">
              <div className="bg-accent/10 p-3 rounded-full">
                <Activity size={28} className="text-accent" />
              </div>
            </div>
            <h2 className="heading-2">Implementação e Monitoramento</h2>
            <p className="card-description-standard max-w-2xl mx-auto">
              Acompanhamento de aportes e evolução do patrimônio de investimentos versus metas, com base em CDI (12m) e IPCA.
            </p>
          </div>
        </div>

        <div ref={sectionRef} className="section-container animate-on-scroll">
          <h3 className="heading-3 mb-3">KPIs do trimestre</h3>
          <div className="relative overflow-visible">
            <div ref={captureRef}>
              <div className="mb-6">
                <h3 className="heading-3 mb-2">Premissas Financeiras</h3>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Patrimônio Financeiro Atual</CardTitle>
                    <CardDescription>Base para projeções e metas do trimestre</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium">Valor atual</div>
                      <div className="text-base font-semibold">{formatCurrency(Math.round(currentInvestments))}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Considera o total reportado em Investimentos.</div>
                  </CardContent>
                </Card>
              </div>
              <div className="mb-6">
                <h3 className="heading-3 mb-2">Premissas (Alta Vista)</h3>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Premissas Alta Vista</CardTitle>
                    <CardDescription>CDI/IPCA e rentabilidade esperada (100% do CDI)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <div className="text-sm font-medium mb-2">CDI e IPCA</div>
                        <div className="grid grid-cols-1 gap-3 mb-3">
                          <div>
                            <Label htmlFor="cdiAnnual" className="mb-1 block">CDI (12 meses) %</Label>
                            <Input
                              id="cdiAnnual"
                              type="number"
                              step="0.01"
                              min="0"
                              value={Number.isFinite(cdiAnnual) ? (cdiAnnual * 100).toFixed(2) : ''}
                              readOnly
                              disabled
                            />
                          </div>
                          <div>
                            <Label htmlFor="ipcaAnnual" className="mb-1 block">IPCA (12 meses) %</Label>
                            <Input
                              id="ipcaAnnual"
                              type="number"
                              step="0.01"
                              min="0"
                              value={Number.isFinite(ipcaAnnual) ? (ipcaAnnual * 100).toFixed(2) : ''}
                              readOnly
                              disabled
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t pt-3 mt-1">
                          <div className="text-sm text-muted-foreground">CDI (trimestre ≈)</div>
                          <Badge variant="outline" className="text-foreground">{toPercentage(cdiQuarter)}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">Usado para estimar a rentabilidade (100% do CDI). IPCA apenas como referência de inflação.</p>
                      </div>

                      <div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium flex items-center gap-2"><Percent className="h-4 w-4" /> Rentabilidade Esperada</div>
                            <div className="text-base font-semibold">{formatCurrency(Math.round(expectedQuarterReturn))}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">Base: 100% do CDI</div>
                          <div className="text-xs text-muted-foreground">Equivale a {toPercentage(cdiQuarter)} no trimestre. IPCA trimestral de referência: {toPercentage(ipcaQuarter)}.</div>
                          <div className="text-xs text-muted-foreground mt-1">Considera 100% do CDI sobre o patrimônio atual; não inclui resgates ou eventos extraordinários.</div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium flex items-center gap-2"><PiggyBank className="h-4 w-4" /> Aportes esperados (Trimestre)</div>
                            <div className="text-base font-semibold">{formatCurrency(Math.round(expectedQuarterContribution))}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">Meta trimestral baseada no aporte mensal esperado × 3.</div>
                        </div>

                        <div className="mt-6">
                          <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium flex items-center gap-2"><Target className="h-4 w-4" /> Patrimônio esperado (Trimestre)</div>
                            <div className="text-base font-semibold">{formatCurrency(Math.round(expectedQuarterPatrimony))}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">Patrimônio atual + rentabilidade esperada + aportes esperados.</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

            </div>
            {/* Bloco "Realizado" removido conforme solicitação */}

            <Card className="mb-2">
              <CardContent className="py-4">
                <div className="flex flex-col items-center justify-center gap-2">
                  <Button size="sm" variant="secondary" onClick={handleCapture} disabled={!!hideControls || capturing}>
                    <Camera className="h-4 w-4 mr-1" /> {capturing ? 'Registrando…' : 'Acionar planejamento'}
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {captured ? 'Foto registrada. Uma nova coluna foi adicionada ao quadro.' : 'Registra a situação atual e adiciona uma coluna ao quadro de revisões.'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {snapshots.length > 0 && (
            <div className="mt-6">
              <h3 className="heading-3 mb-3">Quadro de Revisões (trimestral)</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr>
                      <th className="text-left sticky left-0 bg-background z-10 w-64">Métrica</th>
                      {snapshots.map(s => (
                        <th key={s.id} className="text-left whitespace-nowrap pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{getQuarterLabel(s.dateIso)}</span>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSnapshot(s.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">{new Date(s.dateIso).toLocaleDateString()}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Ordem seguindo os KPIs de cima para baixo */}
                    <tr>
                      <td className="sticky left-0 bg-background z-10 font-medium">Patrimônio atual (Investimentos)</td>
                      {snapshots.map(s => <td key={s.id + '-pat-atual'}>{formatCurrency(Math.round((s.metrics?.realPatrimony) ?? realPatrimony))}</td>)}
                    </tr>
                    <tr>
                      <td className="sticky left-0 bg-background z-10 font-medium">CDI (12m)</td>
                      {snapshots.map(s => <td key={s.id + '-cdi12'}>{toPercentage((s.metrics?.cdiAnnual) ?? cdiAnnual)}</td>)}
                    </tr>
                    <tr>
                      <td className="sticky left-0 bg-background z-10 font-medium">IPCA (12m)</td>
                      {snapshots.map(s => <td key={s.id + '-ipca12'}>{toPercentage((s.metrics?.ipcaAnnual) ?? ipcaAnnual)}</td>)}
                    </tr>
                    <tr>
                      <td className="sticky left-0 bg-background z-10 font-medium">CDI (trimestre)</td>
                      {snapshots.map(s => <td key={s.id + '-cditrim'}>{toPercentage((s.metrics?.cdiQuarter) ?? (pow1p(cdiAnnual, 3 / 12) - 1))}</td>)}
                    </tr>
                    <tr>
                      <td className="sticky left-0 bg-background z-10 font-medium">Rentabilidade esperada (trimestre)</td>
                      {snapshots.map(s => <td key={s.id + '-rent-esp'}>{formatCurrency(Math.round((s.metrics?.expectedQuarterReturn) ?? expectedQuarterReturn))}</td>)}
                    </tr>
                    <tr>
                      <td className="sticky left-0 bg-background z-10 font-medium">Aportes esperados (trimestre)</td>
                      {snapshots.map(s => <td key={s.id + '-aportexp'}>{formatCurrency(Math.round((s.metrics?.expectedQuarterContribution) ?? expectedQuarterContribution))}</td>)}
                    </tr>
                    <tr>
                      <td className="sticky left-0 bg-background z-10 font-medium">Patrimônio esperado (trimestre)</td>
                      {snapshots.map(s => <td key={s.id + '-patesp'}>{formatCurrency(Math.round((s.metrics?.expectedQuarterPatrimony) ?? expectedQuarterPatrimony))}</td>)}
                    </tr>

                  </tbody>
                </table>
              </div>
            </div>
          )}

          {false && snapshots.length > 0 && (
            <div className="mt-6">
              <h3 className="heading-3 mb-3">Histórico de Situações</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshots.map((s) => (
                  <Card key={s.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">{new Date(s.dateIso).toLocaleString()}</CardTitle>
                      <CardDescription>Registro visual do acompanhamento</CardDescription>
                    </CardHeader>
                    <CardContent onMouseEnter={() => setHoverPreview(s.dataUrl!)} onMouseLeave={() => setHoverPreview(null)}>
                      <div className="text-xs text-muted-foreground">Passe o mouse para visualizar</div>
                      <div className="flex justify-end gap-2 mt-3">
                        <a href={s.dataUrl} download={`situacao-${s.id}.png`} className="inline-flex">
                          <Button size="sm" variant="secondary"><Download className="h-4 w-4 mr-1" /> Baixar</Button>
                        </a>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteSnapshot(s.id)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Excluir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {false && hoverPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
              <div className="bg-background/95 border rounded-md shadow-2xl p-2">
                <img src={hoverPreview} alt="Pré-visualização" className="w-[900px] max-w-[95vw] h-auto rounded-md" />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ImplementationMonitoring; 