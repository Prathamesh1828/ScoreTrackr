import { supabase } from './supabase';
import { MatchState } from '../types';

export const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

export const createMatch = async (
    team1: string,
    team2: string,
    overs: number,
    players: number,
    userId?: string
) => {
    console.log('=== Starting createMatch ===');
    console.log('Team1:', team1, 'Team2:', team2, 'Overs:', overs, 'Players:', players);

    const pin = generatePin();
    console.log('Generated PIN:', pin);

    const initialMatchState: MatchState = {
        team1,
        team2,
        oversPerInnings: overs,
        playersPerTeam: players,
        tossWinner: null,
        tossDecision: null,
        battingFirst: null,
        innings: [
            { teamName: team1, events: [], isCompleted: false },
            { teamName: team2, events: [], isCompleted: false }
        ],
        currentInningIndex: 0,
        status: 'setup',
        strikerId: 'Batsman 1',
        nonStrikerId: 'Batsman 2',
        bowlerId: 'Bowler 1'
    };

    console.log('Initial match state created:', JSON.stringify(initialMatchState, null, 2));

    // 1. Create match in 'matches'
    const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert([{
            pin,
            created_by: userId || null, // Anonymous if null
            status: 'live'
        }])
        .select()
        .single();

    if (matchError) {
        console.error('Match creation error - Full details:', JSON.stringify(matchError, null, 2));
        console.error('Match error object:', matchError);
        throw new Error(`Failed to create match: ${matchError.message || JSON.stringify(matchError)}`);
    }

    console.log('Match created:', matchData);
    console.log('Initial match state:', initialMatchState);

    // 2. Create initial state in 'match_state'
    const { error: stateError } = await supabase
        .from('match_state')
        .insert([{
            match_id: matchData.id,
            data: initialMatchState,
            updated_at: new Date().toISOString()
        }]);

    if (stateError) {
        console.error('Match state creation error - Full details:', JSON.stringify(stateError, null, 2));
        console.error('State error object:', stateError);
        throw new Error(`Failed to create match state: ${stateError.message || JSON.stringify(stateError)}`);
    }

    return { matchId: matchData.id, pin, initialMatchState };
};
