import { api } from "./api";

export interface SnapshotMetrics {
    cdiAnnual: number;
    ipcaAnnual: number;
    cdiQuarter: number;
    ipcaQuarter: number;
    expectedQuarterContribution: number;
    expectedQuarterReturn: number;
    realizedQuarterContribution: number;
    aporteCompliance: number;
    expectedQuarterPatrimony: number;
    realPatrimony: number;
    patrimonioCompliance: number;
}

export interface SnapshotEntry {
    id: number;
    dateIso: string;
    dataUrl?: string;
    metrics: SnapshotMetrics;
}

export interface ReviewBoardData {
    snapshots: SnapshotEntry[];
}

export interface ReviewBoardResponse {
    message: string;
}

export interface ReviewBoardListResponse {
    reviewBoard: ReviewBoardData | null;
}

export const reviewBoardService = {
    async saveReviewBoard(sessionId: string, reviewBoard: ReviewBoardData): Promise<ReviewBoardResponse> {
        if (!sessionId) {
            throw new Error('SessionId is required');
        }

        try {
            const response = await api.post('/clients/review-board', {
                session_id: sessionId,
                reviewBoard: reviewBoard
            });
            return response.data;
        } catch (error) {
            console.error('Error saving review board:', error);
            throw error;
        }
    },

    async loadReviewBoard(sessionId: string): Promise<ReviewBoardListResponse> {
        if (!sessionId) {
            throw new Error('SessionId is required');
        }

        try {
            const response = await api.get('/clients/review-board', {
                params: {
                    session_id: sessionId
                }
            });
            return response.data;
        } catch (error) {
            console.error('Error loading review board:', error);
            throw error;
        }
    }
};