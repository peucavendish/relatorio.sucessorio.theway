import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { ShieldCheck, CheckCircle, AlertTriangle, TrendingUp, Target, Info } from 'lucide-react';
import { CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import HideableCard from '@/components/ui/HideableCard';
import { useCardVisibility } from '@/context/CardVisibilityContext';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';

interface PilarNota {
	name?: string;
	nome?: string;
	nota?: number;
}

interface ScoreFinanceiroItem {
	Pilar?: string;
	'Nota'?: number;
	'Nota Ponderada'?: number;
	'Elementos Avaliados'?: Array<string | PilarNota>;
}

interface FinancialSecurityIndicatorProps {
	scoreFinanceiro?: ScoreFinanceiroItem[];
	hideControls?: boolean;
}

const FinancialSecurityIndicator: React.FC<FinancialSecurityIndicatorProps> = ({ scoreFinanceiro = [], hideControls }) => {
	const headerRef = useScrollAnimation();
	const cardRef = useScrollAnimation();
	const { isCardVisible, toggleCardVisibility } = useCardVisibility();

	// Processar dados
	const scoreGeral = scoreFinanceiro.find((s: any) => s.Pilar === 'Total Geral');
	const pilares = scoreFinanceiro
		.filter((s: any) => s.Pilar && s.Pilar !== 'Total Geral')
		.sort((a: any, b: any) => {
			const order = [
				'Gestão de Ativos',
				'Aposentadoria',
				'Gestão de Riscos',
				'Planejamento Sucessório',
				'Gestão Tributária',
				'Organização Patrimonial'
			];
			const ia = order.indexOf(a.Pilar);
			const ib = order.indexOf(b.Pilar);
			return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
		});

	const notaGeral = scoreGeral?.['Nota Ponderada'] ?? 0;
	const notaGeralArredondada = Math.round(notaGeral);

	// Função para obter a cor baseada na nota
	const getScoreColor = (nota: number) => {
		if (nota >= 80) return { bg: '#21887C', text: 'text-[#21887C]', border: 'border-[#21887C]', bgLight: 'bg-[#21887C]/10' };
		if (nota >= 60) return { bg: '#36557C', text: 'text-[#36557C]', border: 'border-[#36557C]', bgLight: 'bg-[#36557C]/10' };
		if (nota >= 40) return { bg: '#E9A852', text: 'text-[#E9A852]', border: 'border-[#E9A852]', bgLight: 'bg-[#E9A852]/10' };
		return { bg: '#E52B50', text: 'text-[#E52B50]', border: 'border-[#E52B50]', bgLight: 'bg-[#E52B50]/10' };
	};

	// Função para obter a classificação textual
	const getScoreClassification = (nota: number) => {
		if (nota >= 80) return { text: 'Excelente', icon: ShieldCheck, color: 'text-[#21887C]' };
		if (nota >= 60) return { text: 'Bom', icon: CheckCircle, color: 'text-[#36557C]' };
		if (nota >= 40) return { text: 'Regular', icon: AlertTriangle, color: 'text-[#E9A852]' };
		return { text: 'Atenção Necessária', icon: AlertTriangle, color: 'text-[#E52B50]' };
	};

	// Função para obter recomendações baseadas no score
	const getRecommendations = (pilar: string, nota: number) => {
		const recommendations: Record<string, string[]> = {
			'Gestão de Ativos': [
				nota < 60 ? 'Diversificar investimentos entre diferentes classes de ativos' : 'Manter estratégia de diversificação',
				nota < 60 ? 'Revisar alocação de ativos periodicamente' : 'Monitorar performance dos investimentos',
				nota < 40 ? 'Aumentar reserva de emergência' : 'Manter reserva de emergência adequada'
			],
			'Aposentadoria': [
				nota < 60 ? 'Aumentar aportes mensais para aposentadoria' : 'Manter ritmo de aportes adequado',
				nota < 60 ? 'Revisar metas de aposentadoria' : 'Manter metas realistas',
				nota < 40 ? 'Considerar previdência privada complementar' : 'Manter estratégia de acumulação'
			],
			'Gestão de Riscos': [
				nota < 60 ? 'Revisar cobertura de seguros' : 'Manter proteções adequadas',
				nota < 60 ? 'Avaliar necessidade de seguro de vida' : 'Manter seguros atualizados',
				nota < 40 ? 'Implementar estratégias de proteção patrimonial' : 'Manter proteções ativas'
			],
			'Planejamento Sucessório': [
				nota < 60 ? 'Elaborar testamento e planejamento sucessório' : 'Manter documentos atualizados',
				nota < 60 ? 'Revisar beneficiários de investimentos' : 'Manter beneficiários definidos',
				nota < 40 ? 'Considerar holding patrimonial' : 'Manter estrutura adequada'
			],
			'Gestão Tributária': [
				nota < 60 ? 'Otimizar estrutura tributária' : 'Manter eficiência tributária',
				nota < 60 ? 'Revisar deduções disponíveis' : 'Aproveitar deduções legais',
				nota < 40 ? 'Considerar investimentos isentos' : 'Manter estratégia otimizada'
			],
			'Organização Patrimonial': [
				nota < 60 ? 'Revisar organização documental' : 'Manter documentos organizados',
				nota < 60 ? 'Consolidar informações patrimoniais' : 'Manter visão consolidada',
				nota < 40 ? 'Implementar sistema de controle patrimonial' : 'Manter controle adequado'
			]
		};
		return recommendations[pilar] || [];
	};

	// Dados para gráfico de barras dos pilares
	const chartData = pilares.map((pilar: any) => ({
		name: pilar.Pilar || '',
		nota: Math.round(pilar['Nota'] ?? 0),
		notaPonderada: Math.round(pilar['Nota Ponderada'] ?? 0),
		pilar: pilar.Pilar || ''
	}));

	// Dados para gráfico radar
	const radarData = [
		{
			subject: 'Gestão\nde Ativos',
			score: Math.round(pilares.find((p: any) => p.Pilar === 'Gestão de Ativos')?.['Nota'] ?? 0),
			fullMark: 100
		},
		{
			subject: 'Aposentadoria',
			score: Math.round(pilares.find((p: any) => p.Pilar === 'Aposentadoria')?.['Nota'] ?? 0),
			fullMark: 100
		},
		{
			subject: 'Gestão\nde Riscos',
			score: Math.round(pilares.find((p: any) => p.Pilar === 'Gestão de Riscos')?.['Nota'] ?? 0),
			fullMark: 100
		},
		{
			subject: 'Planejamento\nSucessório',
			score: Math.round(pilares.find((p: any) => p.Pilar === 'Planejamento Sucessório')?.['Nota'] ?? 0),
			fullMark: 100
		},
		{
			subject: 'Gestão\nTributária',
			score: Math.round(pilares.find((p: any) => p.Pilar === 'Gestão Tributária')?.['Nota'] ?? 0),
			fullMark: 100
		},
		{
			subject: 'Organização\nPatrimonial',
			score: Math.round(pilares.find((p: any) => p.Pilar === 'Organização Patrimonial')?.['Nota'] ?? 0),
			fullMark: 100
		}
	];

	const scoreColor = getScoreColor(notaGeral);
	const classification = getScoreClassification(notaGeral);
	const ClassificationIcon = classification.icon;

	return (
		<section className="py-16 px-4" id="financial-security-indicator">
			<div className="section-container">
				{/* Header */}
				<div
					ref={headerRef as React.RefObject<HTMLDivElement>}
					className="mb-12 text-center animate-on-scroll"
				>
					<div className="inline-block">
						<div className="flex items-center justify-center mb-4">
							<div className="bg-accent/10 p-3 rounded-full">
								<ShieldCheck size={28} className="text-accent" />
							</div>
						</div>
						<h2 className="heading-2 mb-3">Indicador de Segurança Financeira</h2>
						<p className="text-muted-foreground max-w-2xl mx-auto">
							Análise completa da sua situação financeira e patrimonial através de uma avaliação sistemática em seis pilares fundamentais
						</p>
					</div>
				</div>

				{/* Card Único */}
				<div
					ref={cardRef as React.RefObject<HTMLDivElement>}
					className="animate-on-scroll"
				>
					<HideableCard
						id="indicador-seguranca-financeira"
						isVisible={isCardVisible('indicador-seguranca-financeira')}
						onToggleVisibility={() => toggleCardVisibility('indicador-seguranca-financeira')}
						hideControls={hideControls}
					>
						<CardHeader className="pb-4">
							<div className="flex items-center justify-between flex-wrap gap-3">
								<div>
									<CardTitle className="card-title-standard text-lg">Score Geral de Segurança Financeira</CardTitle>
									<CardDescription className="mt-1">
										Avaliação consolidada de todos os pilares de segurança financeira
									</CardDescription>
								</div>
								<Badge className={cn("px-3 py-1", scoreColor.bgLight, scoreColor.text)}>
									{classification.text}
								</Badge>
							</div>
						</CardHeader>
						
						<CardContent className="space-y-6">
							{/* Score Geral e Resumo */}
							<div className="grid md:grid-cols-2 gap-4 items-center">
								{/* Indicador Circular */}
								<div className="flex flex-col items-center justify-center">
									<div className="relative w-40 h-40 md:w-44 md:h-44 flex items-center justify-center mb-3">
										<div className="absolute inset-0 rounded-full border-8" style={{ borderColor: `${scoreColor.bg}20` }} />
										<div
											className="absolute inset-0 rounded-full border-8 transition-all duration-500"
											style={{
												borderColor: scoreColor.bg,
												clipPath: `inset(0 ${100 - notaGeralArredondada}% 0 0)`
											}}
										/>
										<div className="text-center z-10">
											<div className="text-4xl md:text-5xl font-bold" style={{ color: scoreColor.bg }}>
												{notaGeralArredondada}
											</div>
											<div className="text-xs text-muted-foreground mt-1">de 100</div>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<ClassificationIcon className={cn("h-4 w-4", classification.color)} />
										<span className={cn("text-sm font-semibold", classification.color)}>{classification.text}</span>
									</div>
								</div>

								{/* Resumo dos Pilares */}
								<div>
									<h4 className="text-base font-semibold mb-3">Resumo por Pilar</h4>
									<div className="space-y-2">
										{pilares.slice(0, 6).map((pilar: any, index: number) => {
											const nota = Math.round(pilar['Nota'] ?? 0);
											const pilarColor = getScoreColor(nota);
											return (
												<div key={index} className="space-y-1">
													<div className="flex items-center justify-between mb-1">
														<span className="text-sm font-medium">{pilar.Pilar}</span>
														<span className={cn("text-sm font-semibold", pilarColor.text)}>{nota}</span>
													</div>
													<Progress value={nota} className="h-2" />
												</div>
											);
										})}
									</div>
								</div>
							</div>

							{/* Divisor */}
							<div className="border-t pt-6">
								{/* Gráfico Comparativo */}
								<div>
									<h4 className="text-base font-semibold mb-4">Análise Comparativa</h4>
									<div className="flex justify-center">
										<div className="w-full max-w-2xl">
											<h5 className="text-sm font-medium mb-3 text-center">Perfil de Segurança Financeira</h5>
											<ResponsiveContainer width="100%" height={400}>
												<RadarChart data={radarData}>
													<PolarGrid />
													<PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
													<PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10 }} />
													<Radar
														name="Score"
														dataKey="score"
														stroke={scoreColor.bg}
														fill={scoreColor.bg}
														fillOpacity={0.3}
														strokeWidth={2}
													/>
													<Tooltip
														contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
														formatter={(value: number) => [`${value} pontos`, 'Score']}
													/>
												</RadarChart>
											</ResponsiveContainer>
										</div>
									</div>
								</div>

								{/* Divisor */}
								<div className="border-t pt-6">
									{/* Detalhamento por Pilar */}
									<h4 className="text-base font-semibold mb-4">Análise Detalhada por Pilar</h4>
									<div className="grid md:grid-cols-2 gap-4">
										{pilares.map((pilar: any, index: number) => {
											const nota = Math.round(pilar['Nota'] ?? 0);
											const pilarColor = getScoreColor(nota);
											const pilarClassification = getScoreClassification(nota);
											const PilarIcon = pilarClassification.icon;
											const recomendacoes = getRecommendations(pilar.Pilar || '', nota);
											const elementosAvaliados = Array.isArray(pilar['Elementos Avaliados'])
												? pilar['Elementos Avaliados'].map((item: any) => {
														if (typeof item === 'string') return { nome: item };
														return item;
													})
												: [];

											return (
												<div key={index} className="p-4 border rounded-lg bg-muted/30">
													<div className="flex items-start justify-between gap-3 mb-3">
														<div className="flex-1">
															<div className="flex items-center gap-2 mb-1">
																<PilarIcon className={cn("h-4 w-4", pilarClassification.color)} />
																<h5 className="text-sm font-semibold">{pilar.Pilar}</h5>
															</div>
															<p className="text-xs text-muted-foreground">
																Nota: {nota} pontos
															</p>
														</div>
														<Badge className={cn("px-2 py-0.5 text-xs", pilarColor.bgLight, pilarColor.text)}>
															{pilarClassification.text}
														</Badge>
													</div>
													<Progress value={nota} className="h-1.5 mb-3" />
													
													{elementosAvaliados.length > 0 && (
														<div className="mb-3">
															<ul className="space-y-1">
																{elementosAvaliados.map((elemento: any, i: number) => {
																	const displayName = elemento.nome || elemento.name || '';
																	return (
																		<li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
																			<CheckCircle className="h-3 w-3 flex-shrink-0" style={{ color: pilarColor.bg }} />
																			<span>{displayName}</span>
																		</li>
																	);
																})}
															</ul>
														</div>
													)}

													{recomendacoes.length > 0 && (
														<div className="pt-3 border-t">
															<ul className="space-y-1.5">
																{recomendacoes.map((rec, i) => (
																	<li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
																		<TrendingUp className="h-3 w-3 mt-0.5 flex-shrink-0" style={{ color: pilarColor.bg }} />
																		<span>{rec}</span>
																	</li>
																))}
															</ul>
														</div>
													)}
												</div>
											);
										})}
									</div>
								</div>

								{/* Divisor */}
								<div className="border-t pt-6">
									{/* Interpretação Geral */}
									<div className={cn("p-4 rounded-lg border", scoreColor.border, scoreColor.bgLight)}>
										<div className="flex items-start gap-3 mb-3">
											<Info className="h-5 w-5 flex-shrink-0" style={{ color: scoreColor.bg }} />
											<div className="flex-1">
												<h4 className="text-sm font-semibold mb-2" style={{ color: scoreColor.bg }}>
													Interpretação do Score: {notaGeralArredondada} pontos — {classification.text}
												</h4>
												<p className="text-xs text-muted-foreground mb-3">
													O Indicador de Segurança Financeira é calculado através da avaliação sistemática de seis pilares fundamentais: Gestão de Ativos, Aposentadoria, Gestão de Riscos, Planejamento Sucessório, Gestão Tributária e Organização Patrimonial.
												</p>
												<p className="text-xs text-muted-foreground">
													{notaGeral >= 80
														? 'Parabéns! Sua situação financeira está muito bem estruturada. Continue monitorando e mantendo os padrões atuais.'
														: notaGeral >= 60
														? 'Sua situação financeira está em boa condição, mas há oportunidades de melhoria que podem fortalecer ainda mais sua segurança.'
														: notaGeral >= 40
														? 'Sua situação financeira requer atenção em algumas áreas. As recomendações acima podem ajudar a fortalecer sua segurança patrimonial.'
														: 'Sua situação financeira precisa de atenção prioritária. Recomendamos seguir as recomendações específicas de cada pilar para melhorar sua segurança financeira.'}
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</CardContent>
					</HideableCard>
				</div>
			</div>
		</section>
	);
};

export default FinancialSecurityIndicator;
