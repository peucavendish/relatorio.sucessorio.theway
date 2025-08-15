import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from "@/components/ui/card";
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import StatusChip from '@/components/ui/StatusChip';
import {
  Calculator,
  FileText,
  Shield
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';

interface TaxPlanningProps {
  data: any;
  hideControls?: boolean;
}

const TaxPlanning: React.FC<TaxPlanningProps> = ({ data, hideControls }) => {
  // Get access to the tax planning data
  const { tributario } = data;
  const headerRef = useScrollAnimation();
  const diagnosticoRef = useScrollAnimation();
  const recomendacoesRef = useScrollAnimation();
  const { isCardVisible, toggleCardVisibility } = useCardVisibility();

  // Diagnóstico Tributário - cálculos dinâmicos a partir das rendas
  const rendas = Array.isArray(data?.financas?.rendas) ? data.financas.rendas : [];
  const isIsento = (txt?: string) => (txt || '').toLowerCase().includes('isento');
  const isAluguel = (txt?: string) => /alug|loca/i.test(txt || '');
  const isDividendo = (txt?: string) => /dividen/i.test(txt || '');

  const rendaTributavelMensal = rendas
    .filter((r: any) => !isIsento(r?.tributacao))
    .reduce((acc: number, r: any) => acc + (Number(r?.valor) || 0), 0);

  const rendaIsentaMensal = rendas
    .filter((r: any) => isIsento(r?.tributacao))
    .reduce((acc: number, r: any) => acc + (Number(r?.valor) || 0), 0);

  const dividendosIsentosMensais = rendas
    .filter((r: any) => isDividendo(r?.descricao || r?.fonte) && isIsento(r?.tributacao))
    .reduce((acc: number, r: any) => acc + (Number(r?.valor) || 0), 0);

  const doacaoAnual = rendas
    .filter((r: any) => /(doa[cç][aã]o)/i.test(r?.descricao || r?.fonte))
    .reduce((acc: number, r: any) => acc + (Number(r?.valorAnual || 0)), 0);

  const modeloIR = tributario?.resumo?.modeloIR || 'A avaliar (completo x simplificado)';

  const pgblAnnualMax = Math.max(0, rendaTributavelMensal * 12 * 0.12);
  const pgblMonthlySuggest = pgblAnnualMax / 12;

  const possuiRendaDeAluguel = rendas.some((r: any) => isAluguel(r?.descricao || r?.fonte));

  return (
    <section className="min-h-screen py-16 px-4" id="tax">
      <div className="section-container">
        {/* Section Header */}
        <div
          ref={headerRef as React.RefObject<HTMLDivElement>}
          className="mb-12 text-center animate-on-scroll"
        >
          <div className="inline-block">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-financial-info/30 p-3 rounded-full">
                <Calculator size={28} className="text-financial-info" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-3">Planejamento Tributário</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Estratégias para otimização fiscal e redução da carga tributária através de estruturação
              patrimonial e organização financeira.
            </p>
          </div>
        </div>

        {/* Diagnóstico Tributário */}
        <div
          ref={diagnosticoRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-1"
        >
          <HideableCard
            id="diagnostico-tributario"
            isVisible={isCardVisible("diagnostico-tributario")}
            onToggleVisibility={() => toggleCardVisibility("diagnostico-tributario")}
            hideControls={hideControls}
          >
            <CardHeader>
              <CardTitle className="card-title-standard flex items-center gap-2">
                <FileText size={20} className="text-financial-info" />
                Diagnóstico Tributário
              </CardTitle>
              <CardDescription>
                Avaliação dos impactos tributários sobre renda e patrimônio, com identificação de deduções e
                oportunidades de otimização fiscal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Rendimentos e Tributação</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Tributação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rendas.map((r: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{r?.descricao || r?.fonte || 'Renda'}</TableCell>
                        <TableCell>{formatCurrency(Number(r?.valor) || 0)}</TableCell>
                        <TableCell>
                          <StatusChip status={isIsento(r?.tributacao) ? 'success' : 'warning'} label={r?.tributacao || '—'} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1">Renda Tributável (mês)</span>
                    <span className="font-medium">{formatCurrency(rendaTributavelMensal)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1">Renda Isenta (mês)</span>
                    <span className="font-medium">{formatCurrency(rendaIsentaMensal)}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground mb-1">Dividendos Isentos (mês)</span>
                    <span className="font-medium">{formatCurrency(dividendosIsentosMensais)}</span>
                  </div>
                </div>
                {doacaoAnual > 0 && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Doações declaradas (ano): <span className="font-medium text-foreground">{formatCurrency(doacaoAnual)}</span> (isentas conforme legislação vigente, quando aplicável)
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                  <div className="text-sm text-muted-foreground mb-1">Modelo de IR potencialmente mais vantajoso</div>
                  <div className="font-medium">{modeloIR}</div>
                </div>
                <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
                  <div className="text-sm text-muted-foreground mb-1">Aporte recomendado em PGBL (limite legal de 12%)</div>
                  <div className="font-medium">{formatCurrency(pgblAnnualMax)} ao ano ({formatCurrency(pgblMonthlySuggest)}/mês)</div>
                </div>
              </div>

              <div className="bg-accent/5 p-4 rounded-lg border border-accent/30">
                <div className="text-sm">
                  Consideraremos despesas dedutíveis, dependentes, previdência e outras particularidades para
                  confirmar o regime de IR mais eficiente.
                </div>
              </div>
            </CardContent>
          </HideableCard>
        </div>

        {/* Recomendações Estratégicas */}
        <div
          ref={recomendacoesRef as React.RefObject<HTMLDivElement>}
          className="mb-8 animate-on-scroll delay-2"
        >
          <HideableCard
            id="recomendacoes-estrategicas"
            isVisible={isCardVisible("recomendacoes-estrategicas")}
            onToggleVisibility={() => toggleCardVisibility("recomendacoes-estrategicas")}
            hideControls={hideControls}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield size={18} className="text-financial-info" />
                Recomendações Estratégicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-2">Eficiência Fiscal na Pessoa Física</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                    <div className="h-1.5 w-1.5 rounded-full bg-financial-info"></div>
                    <span>
                      {modeloIR === 'Completo'
                        ? 'Optar pelo modelo completo de IR para maximizar deduções.'
                        : modeloIR === 'Simplificado'
                        ? 'Optar pelo modelo simplificado de IR para alíquota efetiva menor.'
                        : 'Considerar modelo completo se houver deduções relevantes; caso contrário, avaliar o simplificado.'}
                    </span>
                  </li>
                  <li className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                    <div className="h-1.5 w-1.5 rounded-full bg-financial-info"></div>
                    <span>Aportar até 12% da renda tributável em PGBL: {formatCurrency(pgblAnnualMax)} ao ano ({formatCurrency(pgblMonthlySuggest)}/mês).</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Investimentos com Vantagens Tributárias</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                    <div className="h-1.5 w-1.5 rounded-full bg-financial-success"></div>
                    <span>Priorizar LCI, LCA e debêntures incentivadas (isentas de IR na PF).</span>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Estruturação da Receita e Proteção Patrimonial</h4>
                <ul className="space-y-2">
                  {possuiRendaDeAluguel && (
                    <li className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                      <div className="h-1.5 w-1.5 rounded-full bg-financial-info"></div>
                      <span>Avaliar migração de aluguéis para PJ, quando aplicável, visando otimização fiscal.</span>
                    </li>
                  )}
                  <li className="flex items-center gap-2 py-2 px-3 bg-muted/50 rounded-md">
                    <div className="h-1.5 w-1.5 rounded-full bg-financial-info"></div>
                    <span>Avaliar constituição de holding patrimonial para eficiência tributária e facilitação sucessória.</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </HideableCard>
        </div>

      </div>
    </section>
  );
};

export default TaxPlanning;
