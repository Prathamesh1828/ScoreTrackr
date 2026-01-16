import { MatchState as GameState } from '../types';

export interface Match {
    id: string;
    pin: string;
    created_by: string;
    status: 'live' | 'completed';
    created_at: string;
}

export interface MatchStateRow {
    match_id: string;
    data: GameState;
    updated_at: string;
}
