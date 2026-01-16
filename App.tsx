
import React, { useState, useEffect } from 'react';
import { MatchState } from './types';
import Setup from './components/Setup';
import Toss from './components/Toss';
import LiveScoring from './components/LiveScoring';
import Result from './components/Result';
import JoinMatch from './components/JoinMatch';
import MatchEnded from './components/MatchEnded';
import InningsBreak from './components/InningsBreak';
import MatchTimeout from './components/MatchTimeout';
import WaitingForMatch from './components/WaitingForMatch';
import { generateInningsSummary } from './engine';
import { useMatchScore } from './hooks/useMatchScore';
import { resetMatchForNewGame, transitionToWaiting, supabase } from './lib/supabase';

import Lenis from 'lenis';

// Extended status to include 'join' and 'ended'
type AppStatus = 'setup' | 'join' | 'toss' | 'live' | 'timeout' | 'innings_break' | 'waiting' | 'finished' | 'ended';

const App: React.FC = () => {
  const [match, setMatch] = useState<MatchState>({
    team1: '',
    team2: '',
    oversPerInnings: 4,
    playersPerTeam: 11,
    tossWinner: null,
    tossDecision: null,
    battingFirst: null,
    innings: [
      { teamName: '', events: [], isCompleted: false },
      { teamName: '', events: [], isCompleted: false }
    ],
    currentInningIndex: 0,
    status: 'setup',
    strikerId: 'Batsman 1',
    nonStrikerId: 'Batsman 2',
    bowlerId: 'Bowler 1'
  });

  const [appStatus, setAppStatus] = useState<AppStatus>('setup');
  const [onlineMatchId, setOnlineMatchId] = useState<string | null>(null);
  const [isScorer, setIsScorer] = useState(false);
  const [isMatchEnded, setIsMatchEnded] = useState(false);
  const [isResetting, setIsResetting] = useState(false); // Persistent match reset flag

  // Hook for real-time updates if we are in an online match
  const { matchState: onlineState, updateScore: updateOnlineScore } = useMatchScore(onlineMatchId || undefined);

  // Check if match is completed or deleted (for spectators)
  useEffect(() => {
    if (onlineMatchId && !isScorer) {
      const checkMatchStatus = async () => {
        const { supabase } = await import('./lib/supabase');
        const { data, error } = await supabase
          .from('matches')
          .select('status')
          .eq('id', onlineMatchId)
          .single();

        // If match doesn't exist (deleted) or is completed, show ended screen
        if (error || !data || data?.status === 'completed') {
          console.log('Match ended or deleted');
          setIsMatchEnded(true);
        }
      };
      checkMatchStatus();

      // Also subscribe to changes
      const setupSubscription = async () => {
        const { supabase } = await import('./lib/supabase');
        const subscription = supabase
          .channel(`match-${onlineMatchId}`)
          .on('postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'matches', filter: `id=eq.${onlineMatchId}` },
            () => {
              console.log('Match was deleted by scorer');
              setIsMatchEnded(true);
            }
          )
          .subscribe();

        return subscription;
      };

      let subscription: any;
      setupSubscription().then(sub => { subscription = sub; });

      return () => {
        if (subscription) {
          subscription.unsubscribe();
        }
      };
    }
  }, [onlineMatchId, isScorer]);

  // Sync online state to local state
  useEffect(() => {
    if (onlineMatchId && onlineState) {
      console.log('Online state received:', onlineState);
      console.log('Current state:', { isScorer, appStatus, matchStatus: onlineState.status });

      setMatch(onlineState);

      // Sync app status with match status
      // Note: match.status in DB is 'setup', 'toss', 'live', 'finished', 'waiting'
      // We map these to our App's components

      if (!isScorer && onlineState.status) {
        // Spectators always follow DB state
        console.log('Spectator: syncing appStatus from DB:', onlineState.status, '(current:', appStatus, ')');
        setAppStatus(onlineState.status as AppStatus);
      } else if (isScorer && onlineState.status) {
        // Scorers also need to sync when rejoining (but not during active scoring)
        // If scorer is on 'join' screen and match is live, transition them to live scoring
        if (appStatus === 'join') {
          console.log('Scorer rejoining: syncing appStatus from DB:', onlineState.status);
          setAppStatus(onlineState.status as AppStatus);
        }
      }
    }
  }, [onlineState, onlineMatchId, isScorer, appStatus]);

  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Default smooth easing
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  // Auto-join match from URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const matchIdFromUrl = urlParams.get('matchId');

    if (matchIdFromUrl && appStatus === 'setup') {
      console.log('Auto-joining match from URL:', matchIdFromUrl);
      // Automatically join as spectator (no PIN)
      handleJoinComplete(matchIdFromUrl, null);
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [appStatus]);

  const handleStartSetup = (t1: string, t2: string, overs: number, players: number, matchId?: string, pin?: string) => {
    console.log('handleStartSetup called with:', { t1, t2, overs, players, matchId, pin });
    // All matches are now online
    // If we are resetting a persistent match, we must preserve the existing onlineMatchId
    if (isResetting && onlineMatchId && !matchId) {
      console.log('Preserving persistent match ID:', onlineMatchId);
    } else {
      setOnlineMatchId(matchId || null);
    }
    setIsScorer(true);
    setMatch({
      ...match,
      team1: t1,
      team2: t2,
      oversPerInnings: overs,
      playersPerTeam: players,
      status: 'toss'
    });
    setAppStatus('toss');
    console.log('State updated - should navigate to toss screen');
  };

  const handleJoinClick = () => {
    setAppStatus('join');
  };

  const handleJoinComplete = async (matchId: string, scorer: boolean) => {
    console.log('🎯 handleJoinComplete called:', { matchId, scorer });
    setOnlineMatchId(matchId);
    setIsScorer(scorer);

    // For scorers, we need to fetch the current match state and set appStatus accordingly
    if (scorer) {
      try {
        const { data: matchState, error } = await supabase
          .from('match_state')
          .select('data')
          .eq('match_id', matchId)
          .single();

        if (matchState && matchState.data) {
          const currentStatus = (matchState.data as any).status;
          console.log('🎯 Scorer rejoining - setting appStatus to:', currentStatus);
          setAppStatus(currentStatus as AppStatus);
        }
      } catch (err) {
        console.error('Error fetching match state for scorer:', err);
      }
    }

    console.log('State updated - waiting for useEffect to sync match data...');
    // Wait for hook to sync state...
    // status will update in useEffect
  };

  const handleTossComplete = (winner: string, decision: 'bat' | 'bowl') => {
    const team1Batting = (winner === match.team1 && decision === 'bat') || (winner === match.team2 && decision === 'bowl');
    const batFirst = team1Batting ? match.team1 : match.team2;
    const batSecond = team1Batting ? match.team2 : match.team1;

    const newMatchState: MatchState = {
      ...match,
      tossWinner: winner,
      tossDecision: decision,
      battingFirst: batFirst,
      innings: [
        { teamName: batFirst, events: [], isCompleted: false },
        { teamName: batSecond, events: [], isCompleted: false }
      ],
      status: 'live'
    };

    setMatch(newMatchState);
    setAppStatus('live');

    if (onlineMatchId && isScorer) {
      if (isResetting) {
        // Persistent match reset: increment version and update DB status
        resetMatchForNewGame(onlineMatchId, newMatchState).catch(console.error);
        setIsResetting(false);
      } else {
        // Normal first match update
        updateOnlineScore(newMatchState);
      }
    }
  };

  const handleNewMatchSetup = () => {
    // Reset match state for a new game but keep the persistent match ID
    setIsResetting(true);
    setAppStatus('setup');

    // Immediately update DB to 'waiting' status so spectators see the waiting screen
    if (onlineMatchId) {
      transitionToWaiting(onlineMatchId).catch(console.error);
    }

    // Reset local match state defaults
    setMatch({
      ...match,
      status: 'setup',
      innings: [
        { teamName: '', events: [], isCompleted: false },
        { teamName: '', events: [], isCompleted: false }
      ],
      currentInningIndex: 0,
      tossWinner: null,
      tossDecision: null,
      battingFirst: null,
      oversPerInnings: match.oversPerInnings, // Keep previous settings
      playersPerTeam: match.playersPerTeam
    });
  };

  const handleExitMatch = async () => {
    if (!window.confirm("Are you sure you want to end this match? This will permanently delete the match data.")) {
      return;
    }

    // If this is an online match and user is a scorer, notify spectators then delete
    if (onlineMatchId && isScorer) {
      try {
        const { supabase } = await import('./lib/supabase');
        console.log('Ending match and notifying spectators:', onlineMatchId);

        // First, update match status to 'ended' so spectators see the MatchEnded screen
        const { error: updateError } = await supabase
          .from('match_state')
          .update({
            data: {
              ...match,
              status: 'ended'
            },
            updated_at: new Date().toISOString()
          })
          .eq('match_id', onlineMatchId);

        if (updateError) {
          console.error('Failed to update match status:', updateError);
        } else {
          console.log('Match status updated to "ended" - spectators notified');
          // Wait briefly to ensure spectators receive the update
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // Now delete the match (this will cascade delete match_state too)
        const { error } = await supabase
          .from('matches')
          .delete()
          .eq('id', onlineMatchId);

        if (error) {
          console.error('Failed to delete match:', error);
          alert('Failed to delete match: ' + error.message);
          return;
        }

        console.log('Match deleted successfully from database');
      } catch (error) {
        console.error('Failed to delete match:', error);
        alert('An error occurred while deleting the match');
        return;
      }
    }

    // Reset local state
    setAppStatus('setup');
    setOnlineMatchId(null);
    setIsScorer(false);
    setIsMatchEnded(false);
  };

  const handleTossBack = () => {
    // If online, maybe warn?
    setAppStatus('setup');
  };

  const handleUpdate = (newMatch: MatchState) => {
    console.log('handleUpdate called', { onlineMatchId, isScorer });
    setMatch(newMatch);

    // If we are the scorer and the match status just changed to 'timeout',
    // update our app status to show the timeout screen
    if (isScorer && newMatch.status === 'timeout') {
      console.log('Match timeout! Transitioning to timeout screen');
      setAppStatus('timeout');
    } else if (isScorer && newMatch.status === 'innings_break') {
      console.log('Innings break! Transitioning to break screen');
      setAppStatus('innings_break');
    } else if (isScorer && newMatch.status === 'finished') {
      console.log('Match finished! Transitioning to result screen');
      setAppStatus('finished');
    } else if (newMatch.status === 'waiting') {
      console.log('Match waiting! Transitioning to waiting screen');
      // Only transition spectators to waiting screen. 
      // Scorer stays on existing screen (Result) or manually navigates.
      if (!isScorer) {
        setAppStatus('waiting');
      }
    } else if (newMatch.status === 'live' && !isScorer) {
      // Spectator auto-join logic: if match goes live and we are not scorer, switch to live scoring
      if (appStatus !== 'live') {
        console.log('Match is live! Transitioning spectator to live scoring');
        setAppStatus('live');
      }
    }

    if (onlineMatchId && isScorer) {
      console.log('Calling updateOnlineScore with new match state');
      updateOnlineScore(newMatch);
    }
  };

  const handleStartNextInnings = () => {
    const newMatch = { ...match };
    newMatch.status = 'live';
    newMatch.currentInningIndex = 1;
    newMatch.strikerId = "Batsman 1 (Inn 2)";
    newMatch.nonStrikerId = "Batsman 2 (Inn 2)";
    newMatch.bowlerId = "Bowler 1 (Inn 2)";
    delete newMatch.inningsBreakStartedAt;
    delete newMatch.nextInningsStartsAt;

    setMatch(newMatch);
    setAppStatus('live');

    if (onlineMatchId && isScorer) {
      updateOnlineScore(newMatch);
    }
  };

  const handleResumeMatch = () => {
    const newMatch = { ...match };
    newMatch.status = 'live';
    delete newMatch.timeoutStartedAt;
    delete newMatch.timeoutReason;

    setMatch(newMatch);
    setAppStatus('live');

    if (onlineMatchId && isScorer) {
      updateOnlineScore(newMatch);
    }
  };

  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen">
      {isMatchEnded ? (
        <MatchEnded onBack={() => {
          setIsMatchEnded(false);
          setOnlineMatchId(null);
          setAppStatus('setup');
        }} />
      ) : (
        <>
          {appStatus === 'setup' && <Setup onStart={handleStartSetup} onJoin={handleJoinClick} isResetting={isResetting} />}
          {appStatus === 'join' && <JoinMatch onJoin={handleJoinComplete} onBack={() => setAppStatus('setup')} />}
          {appStatus === 'toss' && <Toss team1={match.team1} team2={match.team2} onComplete={handleTossComplete} onBack={handleTossBack} />}
          {appStatus === 'live' && <LiveScoring match={match} onUpdate={handleUpdate} onExit={handleExitMatch} isSpectator={onlineMatchId ? !isScorer : false} matchId={onlineMatchId || undefined} />}
          {appStatus === 'innings_break' && (
            <InningsBreak
              match={match}
              firstInningsSummary={generateInningsSummary(match.innings[0])}
              onStartNextInnings={handleStartNextInnings}
              isScorer={isScorer}
              matchId={onlineMatchId || undefined}
            />
          )}
          {appStatus === 'timeout' && (
            <MatchTimeout
              match={match}
              onResumeMatch={handleResumeMatch}
              isScorer={isScorer}
            />
          )}
          {appStatus === 'waiting' && (
            <WaitingForMatch matchId={onlineMatchId || undefined} />
          )}
          {appStatus === 'ended' && (
            <MatchEnded onBack={() => {
              setAppStatus('setup');
              setOnlineMatchId(null);
              setIsScorer(false);
            }} />
          )}
          {appStatus === 'finished' && (
            <Result
              match={match}
              onReset={handleReset}
              matchId={onlineMatchId || undefined}
              isOnlineMatch={!!onlineMatchId}
              onStartNewMatch={onlineMatchId && isScorer ? handleNewMatchSetup : undefined}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
