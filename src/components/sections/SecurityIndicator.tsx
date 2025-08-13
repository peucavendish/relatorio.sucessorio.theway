import React from 'react';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import StatusChip from '@/components/ui/StatusChip';
import { ShieldCheck, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface SecurityIndicatorData {
	valor?: number;
	nivel?: string;
	elementosAvaliados?: string[];
}

interface SecurityIndicatorProps {
	data?: SecurityIndicatorData;
}

const SecurityIndicator: React.FC<SecurityIndicatorProps> = ({ data }) => {
	const securityIndexRef = useScrollAnimation();

	const valor = data?.valor ?? 72;
	const nivel = data?.nivel ?? 'Adequado';
	const elementosAvaliados = data?.elementosAvaliados ?? [
		'Reserva de emergência',
		'Diversificação de ativos',
		'Proteção patrimonial',
		'Fluxo de caixa mensal',
		'Endividamento'
	];

	return (
		<section className="py-6 px-4" id="security-indicator">
			<div className="max-w-4xl w-full mx-auto">
				<div ref={securityIndexRef as React.RefObject<HTMLDivElement>} className="mb-6 animate-on-scroll">
					<Card className="md:p-8">
						<CardHeader className="pb-2">
							<CardTitle className="flex items-center gap-2 text-xl">
								<ShieldCheck className="text-accent h-5 w-5" />
								Indicador de Segurança Financeira
							</CardTitle>
							<CardDescription>
								Alocação em diferentes classes de ativos para maximizar o retorno e minimizar o risco
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid md:grid-cols-2 gap-6 items-center">
								<div className="flex items-center justify-center">
									<div className="relative w-32 h-32 md:w-36 md:h-36 flex items-center justify-center rounded-full border-8 border-accent/20">
										<div
											className="absolute inset-0 rounded-full border-8 border-accent"
											style={{ clipPath: `inset(0 ${100 - valor}% 0 0)` }}
										/>
										<div className="text-center">
											<div className="text-3xl font-bold md:text-4xl">{valor}</div>
											<div className="text-xs text-muted-foreground md:text-sm">/ 100</div>
										</div>
									</div>
								</div>
								<div>
									<div className="flex justify-between mb-2">
										<span className="font-medium">Nível atual:</span>
										<StatusChip
											status={valor >= 70 ? 'success' : valor >= 50 ? 'info' : 'warning'}
											label={nivel}
										/>
									</div>
									<h4 className="text-base font-medium mb-3 md:text-lg">Elementos avaliados:</h4>
									<ul className="space-y-2">
										{elementosAvaliados.map((elemento, index) => (
											<li key={index} className="flex items-start gap-2">
												<CheckCircle className="text-accent h-5 w-5 mt-0.5 flex-shrink-0" />
												<span className="text-sm md:text-base">{elemento}</span>
											</li>
										))}
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</section>
	);
};

export default SecurityIndicator; 