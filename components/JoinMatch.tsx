import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface JoinMatchProps {
    onJoin: (matchId: string, isScorer: boolean) => void;
    onBack: () => void;
}

const JoinMatch: React.FC<JoinMatchProps> = ({ onJoin, onBack }) => {
    const [matchIdInput, setMatchIdInput] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // Parse match ID from URL if possible (simple regex or direct ID)
    // For now just assume user types ID or pastes URL? 
    // We'll trust direct ID input for MVP.

    const handleJoin = async () => {
        setError('');
        setLoading(true);
        try {
            if (!matchIdInput) throw new Error('Match ID is required');

            // Trim whitespace from inputs
            const cleanMatchId = matchIdInput.trim();
            const cleanPin = pin.trim();

            console.log('Attempting to join match:', cleanMatchId);

            // Check if match exists
            const { data: match, error: matchError } = await supabase
                .from('matches')
                .select('*')
                .eq('id', cleanMatchId)
                .single();

            if (matchError) {
                console.error('Match lookup error:', matchError);
                throw new Error('Match not found. Please check the Match ID.');
            }

            if (!match) {
                throw new Error('Match not found. Please check the Match ID.');
            }

            console.log('Match found:', match.id, 'Status:', match.status);

            // If PIN is provided, validate it
            let isScorer = false;
            if (cleanPin) {
                console.log('Validating PIN for scorer access...');
                if (match.pin === cleanPin) {
                    isScorer = true;
                    console.log('✅ PIN validated - joining as scorer');
                    // Store scorer privilege in sessionStorage as requested
                    sessionStorage.setItem(`scorer_${match.id}`, 'true');
                } else {
                    console.error('❌ PIN mismatch - Expected:', match.pin, 'Got:', cleanPin);
                    throw new Error('Invalid PIN. Please check your PIN and try again.');
                }
            } else {
                console.log('No PIN provided - joining as spectator');
            }

            console.log('About to call onJoin with:', { matchId: match.id, isScorer });

            try {
                onJoin(match.id, isScorer);
                console.log('✅ onJoin callback completed');
            } catch (callbackError) {
                console.error('❌ Error in onJoin callback:', callbackError);
                throw new Error('Failed to join match. Please try again.');
            }
        } catch (err: any) {
            console.error('Join error:', err);
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6">
            <div className="w-full max-w-md glass p-8 rounded-[2.5rem] shadow-2xl border border-white/10 relative overflow-hidden">
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#1DB954]/10 rounded-full blur-[80px]"></div>

                <h1 className="text-4xl font-bold text-center mb-10 text-[#1DB954]">Join Match</h1>

                <div className="space-y-6">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Match ID</label>
                        <input
                            type="text"
                            value={matchIdInput}
                            onChange={(e) => setMatchIdInput(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-lg font-bold focus:outline-none focus:border-[#1DB954] transition-all placeholder-gray-700"
                            placeholder="e.g. 123e4567-e89b..."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Scorer PIN (Optional)</label>
                        <input
                            type="password"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-lg font-bold focus:outline-none focus:border-[#1DB954] transition-all placeholder-gray-700"
                            placeholder="Enter PIN to score"
                        />
                        <p className="text-xs text-gray-500 px-1">Leave empty to join as spectator</p>
                    </div>

                    {error && <p className="text-red-500 text-sm text-center font-bold animate-pulse">{error}</p>}

                    <button
                        onClick={handleJoin}
                        disabled={loading}
                        className="w-full bg-[#1DB954] text-black font-black text-xl py-5 rounded-2xl shadow-[0_10px_30px_rgba(29,185,84,0.3)] hover:scale-[1.02] active:scale-95 transition-all uppercase italic tracking-tighter mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Joining...' : 'Join Live Match'}
                    </button>

                    <button
                        onClick={onBack}
                        className="w-full text-white/50 hover:text-white font-bold text-sm py-2 transition-colors uppercase tracking-widest"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default JoinMatch;
