import { api } from './api';

export interface ActionPlanOrder {
    id?: number;
    session_id: string;
    card_order: number[];
    card_data?: any;
    created_at?: string;
    updated_at?: string;
}

export interface ActionPlanOrderResponse {
    success: boolean;
    message: string;
    data?: ActionPlanOrder;
}

export const actionPlanService = {
    /**
     * Busca a ordem dos cards para uma sessão específica
     */
    async getActionPlanOrder(sessionId: string): Promise<ActionPlanOrderResponse> {
        try {
            const response = await api.get(`/clients/action-plan-orders/${sessionId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return {
                    success: false,
                    message: 'Nenhuma ordem encontrada para esta sessão'
                };
            }
            throw new Error(error.response?.data?.message || 'Erro ao buscar ordem dos cards');
        }
    },

    /**
     * Salva a ordem dos cards para uma sessão específica
     */
    async saveActionPlanOrder(orderData: {
        session_id: string;
        card_order: number[];
        card_data?: any;
    }): Promise<ActionPlanOrderResponse> {
        try {
            const response = await api.post('/clients/action-plan-orders', orderData);
            return response.data;
        } catch (error: any) {
            throw new Error(error.response?.data?.message || 'Erro ao salvar ordem dos cards');
        }
    },

    /**
     * Atualiza a ordem dos cards (wrapper para saveActionPlanOrder)
     */
    async updateActionPlanOrder(orderData: {
        session_id: string;
        card_order: number[];
        card_data?: any;
    }): Promise<ActionPlanOrderResponse> {
        return this.saveActionPlanOrder(orderData);
    }
};
