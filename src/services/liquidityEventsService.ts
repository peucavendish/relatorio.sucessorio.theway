import { api } from './api';

// Tipos para os eventos de liquidez
export interface LiquidityEventApi {
    session_id?: string;
    nome: string;
    idade: number;
    tipo: 'entrada' | 'saida';
    valor: number;
}

// Listar eventos de liquidez por session_id
export async function getLiquidityEvents(sessionId: string) {
    const response = await api.get(`/clients/eventos-liquidez/`, {
        params: { session_id: sessionId },
    });
    return response.data.eventsLiquidity as LiquidityEventApi[];
}

// Salvar (criar/atualizar) eventos de liquidez
export async function saveLiquidityEvents(events: LiquidityEventApi[]) {
    const response = await api.post(`/clients/eventos-liquidez`, events);
    return response.data;
} 