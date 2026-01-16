import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MatchState, BallEvent, BallType, DismissalType } from '../types';
import { calculateInningsScore, getBatsmanStats, getBowlerStats } from '../engine';
import SpectatorReactionBar from './SpectatorReactionBar';
import MatchAnalyticsCard from './MatchAnalyticsCard';
import FloatingCommentary from './FloatingCommentary';
import LiveInteractionFeed from './LiveInteractionFeed';
import { useAutoCommentary } from '../hooks/useAutoCommentary';

interface LiveScoringProps {
  match: MatchState;
  onUpdate: (match: MatchState) => void;
  onExit: () => void;
  isSpectator?: boolean;
  matchId?: string;
}

const LiveScoring: React.FC<LiveScoringProps> = ({ match, onUpdate, onExit, isSpectator = false, matchId }) => {
  const currentInning = match.innings[match.currentInningIndex];
  const { totalRuns, totalWickets, legalBalls, overs, totalExtras } = calculateInningsScore(currentInning.events);

  // Derived Match Context
  const isTargetChasing = match.currentInningIndex === 1;
  const target = isTargetChasing ? calculateInningsScore(match.innings[0].events).totalRuns + 1 : null;
  const runsNeeded = target ? target - totalRuns : null;
  const maxWickets = match.playersPerTeam - 1;

  // Local State
  const [activeTab, setActiveTab] = useState<'score' | 'card' | 'timeline'>('score');
  const [selectedExtra, setSelectedExtra] = useState<BallType | null>(null);

  // Auto Commentary (Spectator Only)
  const { commentaries, removeCommentary } = useAutoCommentary(match, isSpectator);

  // Animation Overlay State
  const [overlay, setOverlay] = useState<{ type: '4' | '6' | 'W' | 'FH' | 'HAT'; visible: boolean } | null>(null);

  // Track last event count for spectators to detect new balls
  const lastEventCountRef = useRef(currentInning.events.length);

  // Spectator count state with animation
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [prevSpectatorCount, setPrevSpectatorCount] = useState(0);
  const [countAnimation, setCountAnimation] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (overlay?.visible) {
      const timer = setTimeout(() => setOverlay(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [overlay]);

  // Track spectator count using database heartbeat
  const viewerTrackingSetup = useRef(false);

  useEffect(() => {
    if (!matchId) {
      console.log('No matchId, skipping viewer tracking');
      return;
    }

    // Prevent duplicate setup in React StrictMode
    if (viewerTrackingSetup.current) {
      console.log('Viewer tracking already set up, skipping');
      return;
    }
    viewerTrackingSetup.current = true;

    // Use sessionStorage to create a persistent viewer ID that survives React StrictMode
    const storageKey = `viewer-id-${matchId}`;
    let viewerId = sessionStorage.getItem(storageKey);

    if (!viewerId) {
      viewerId = `viewer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem(storageKey, viewerId);
      console.log('Created new viewer ID:', viewerId);
    } else {
      console.log('Using existing viewer ID:', viewerId);
    }

    console.log('Setting up viewer tracking for match:', matchId, 'Viewer ID:', viewerId);

    const setupViewerTracking = async () => {
      const { supabase } = await import('../lib/supabase');

      // Insert/update viewer record
      const upsertViewer = async () => {
        const { error } = await supabase
          .from('match_viewers')
          .upsert({
            match_id: matchId,
            viewer_id: viewerId,
            role: isSpectator ? 'spectator' : 'scorer',
            last_seen: new Date().toISOString()
          }, {
            onConflict: 'match_id,viewer_id'
          });

        if (error) {
          console.error('Error upserting viewer:', error);
        } else {
          console.log('Viewer heartbeat sent');
        }
      };

      // Get viewer count
      const updateViewerCount = async () => {
        // Clean up old viewers first
        await supabase.rpc('cleanup_old_viewers');

        const { data, error } = await supabase
          .from('match_viewers')
          .select('id', { count: 'exact' })
          .eq('match_id', matchId);

        if (error) {
          console.error('Error fetching viewer count:', error);
        } else {
          const count = data?.length || 0;
          console.log('Viewer count:', count);

          // Trigger animation based on count change
          if (count > spectatorCount) {
            setCountAnimation('up');
          } else if (count < spectatorCount) {
            setCountAnimation('down');
          }

          setPrevSpectatorCount(spectatorCount);
          setSpectatorCount(count);

          // Reset animation after it completes
          setTimeout(() => setCountAnimation(null), 500);
        }
      };

      // Initial upsert and count
      await upsertViewer();
      await updateViewerCount();

      // Send heartbeat every 10 seconds
      const heartbeatInterval = setInterval(upsertViewer, 10000);

      // Subscribe to realtime changes on match_viewers table for instant updates
      const viewerChannel = supabase
        .channel(`viewers:${matchId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'match_viewers',
            filter: `match_id=eq.${matchId}`
          },
          (payload) => {
            console.log('Viewer change detected:', payload);
            // Update count immediately when any change occurs
            setTimeout(() => {
              supabase.rpc('cleanup_old_viewers').then(() => {
                updateViewerCount();
              });
            }, 500);
          }
        )
        .subscribe((status) => {
          console.log('Viewer channel status:', status);
        });

      return { heartbeatInterval, viewerId, supabase, viewerChannel };
    };

    let intervals: any;
    setupViewerTracking().then(result => { intervals = result; });

    return () => {
      viewerTrackingSetup.current = false;

      if (intervals) {
        console.log('Cleaning up viewer tracking for:', intervals.viewerId);
        clearInterval(intervals.heartbeatInterval);

        // Unsubscribe from realtime channel
        if (intervals.viewerChannel) {
          intervals.viewerChannel.unsubscribe();
        }

        // Remove viewer record and sessionStorage on unmount
        const storageKey = `viewer-id-${matchId}`;
        sessionStorage.removeItem(storageKey);

        intervals.supabase
          .from('match_viewers')
          .delete()
          .eq('match_id', matchId)
          .eq('viewer_id', intervals.viewerId)
          .then(() => console.log('Viewer removed from database'));
      }
    };
  }, [matchId, isSpectator]);

  // Spectator: Trigger animations when new events arrive
  useEffect(() => {
    if (isSpectator && currentInning.events.length > lastEventCountRef.current) {
      const lastEvent = currentInning.events[currentInning.events.length - 1];
      console.log('Spectator: New ball event detected', lastEvent);

      if (lastEvent.isWicket) {
        // Check for Hattrick
        const bowlerEvents = currentInning.events.filter(e => e.bowlerId === lastEvent.bowlerId);
        const last1 = bowlerEvents[bowlerEvents.length - 2];
        const last2 = bowlerEvents[bowlerEvents.length - 3];

        if (last1?.isWicket && last2?.isWicket) {
          setOverlay({ type: 'HAT', visible: true });
        } else {
          setOverlay({ type: 'W', visible: true });
        }
      } else if (lastEvent.type === 'noball') {
        setOverlay({ type: 'FH', visible: true });
      } else if (lastEvent.runs === 4 && lastEvent.type === 'legal') {
        setOverlay({ type: '4', visible: true });
      } else if (lastEvent.runs === 6 && lastEvent.type === 'legal') {
        setOverlay({ type: '6', visible: true });
      }
    }

    lastEventCountRef.current = currentInning.events.length;
  }, [currentInning.events, isSpectator]);

  // Determine if the current ball to be bowled is a Free Hit
  // Fixed comparison logic: TypeScript was complaining about type overlap in previous implementation
  const isFreeHit = useMemo(() => {
    const lastEvent = currentInning.events[currentInning.events.length - 1];
    if (!lastEvent) {
      return false;
    }

    const isNoBall = lastEvent.type === 'noball';
    const isWide = lastEvent.type === 'wide';

    if (isNoBall) {
      return true;
    }
    if (lastEvent.isFreeHit && (isWide || isNoBall)) {
      return true;
    }

    return false;
  }, [currentInning.events]);

  const isNewOver = useMemo(() => {
    if (legalBalls === 0) {
      return true;
    }
    if (legalBalls % 6 !== 0) {
      return false;
    }
    const lastEvent = currentInning.events[currentInning.events.length - 1];
    if (!lastEvent) {
      return true;
    }
    const currentOverCalculating = Math.floor(legalBalls / 6);
    return lastEvent.over < currentOverCalculating;
  }, [legalBalls, currentInning.events]);

  const lastBallWasWicket = useMemo(() => {
    const lastEvent = currentInning.events[currentInning.events.length - 1];
    return lastEvent?.isWicket || false;
  }, [currentInning.events]);

  const isEditable = !isSpectator && (isNewOver || lastBallWasWicket);

  const currentOverEvents = useMemo(() => {
    const displayOverNum = Math.floor(legalBalls / 6);
    return currentInning.events.filter(e => e.over === displayOverNum);
  }, [currentInning.events, isNewOver, legalBalls]);

  const oversHistory = useMemo(() => {
    const groups: { [key: number]: BallEvent[] } = {};
    currentInning.events.forEach(e => {
      if (!groups[e.over]) groups[e.over] = [];
      groups[e.over].push(e);
    });
    return Object.entries(groups).sort((a, b) => Number(b[0]) - Number(a[0]));
  }, [currentInning.events]);

  const allBatsmen = useMemo(() => {
    const namesInLog = Array.from(new Set(currentInning.events.map(e => e.strikerId)));
    const activeNames = [match.strikerId, match.nonStrikerId];
    return Array.from(new Set([...namesInLog, ...activeNames])).filter(Boolean);
  }, [currentInning.events, match.strikerId, match.nonStrikerId]);

  // Extract current players for spectator message templates
  const currentPlayers = useMemo(() => {
    return allBatsmen.filter(name => name && name.trim() !== '');
  }, [allBatsmen]);

  // Check if match is live for spectator interactions
  const isMatchLive = match.status === 'live';

  const updatePlayerName = (role: 'striker' | 'nonStriker' | 'bowler', name: string) => {
    if (isSpectator) return;
    const newMatch = { ...match };
    if (role === 'striker') {
      newMatch.strikerId = name;
    }
    if (role === 'nonStriker') {
      newMatch.nonStrikerId = name;
    }
    if (role === 'bowler') {
      newMatch.bowlerId = name;
    }
    onUpdate(newMatch);
  };

  const handleTimeout = () => {
    if (isSpectator || match.status !== 'live') return;

    const newMatch = { ...match };
    newMatch.status = 'timeout';
    newMatch.timeoutStartedAt = Date.now();
    newMatch.timeoutReason = 'Drinks Break'; // Default reason
    onUpdate(newMatch);
  };


  const handleExtraToggle = (type: BallType) => {
    if (isSpectator) return;
    setSelectedExtra(prev => prev === type ? null : type);
  };

  const recordBall = (runs: number, type: BallType = 'legal', wicket: boolean = false) => {
    if (match.status === 'innings_break' || match.status === 'timeout') return; // Block scoring during innings break or timeout
    if (isSpectator) return;
    const penalty = (type === 'wide' || type === 'noball' ? 1 : 0);
    const newTotalRuns = totalRuns + runs + penalty;
    const newWickets = totalWickets + (wicket ? 1 : 0);
    const newLegalBalls = legalBalls + (type === 'legal' || type === 'bye' || type === 'legbye' ? 1 : 0);

    const currentStriker = match.strikerId || `Batsman ${allBatsmen.length + 1}`;
    const currentNonStriker = match.nonStrikerId || `Batsman ${allBatsmen.length + 2}`;
    const currentBowler = match.bowlerId || 'Bowler 1';

    // Animation Triggers
    if (wicket) {
      // Check for Hattrick
      const bowlerEvents = currentInning.events.filter(e => e.bowlerId === currentBowler);
      const last1 = bowlerEvents[bowlerEvents.length - 1];
      const last2 = bowlerEvents[bowlerEvents.length - 2];

      if (last1?.isWicket && last2?.isWicket) {
        setOverlay({ type: 'HAT', visible: true });
      } else {
        setOverlay({ type: 'W', visible: true });
      }
    } else if (type === 'noball') {
      setOverlay({ type: 'FH', visible: true });
    } else if (runs === 4 && type === 'legal') {
      setOverlay({ type: '4', visible: true });
    } else if (runs === 6 && type === 'legal') {
      setOverlay({ type: '6', visible: true });
    }

    const newBall: BallEvent = {
      id: Math.random().toString(36).substr(2, 9),
      inning: (match.currentInningIndex + 1) as 1 | 2,
      over: Math.floor(legalBalls / 6),
      ballInOver: (legalBalls % 6) + 1,
      runs,
      type,
      isWicket: wicket,
      isFreeHit: isFreeHit,
      dismissalType: wicket && isFreeHit ? 'run-out' : (wicket ? 'bowled' : undefined),
      strikerId: currentStriker,
      nonStrikerId: currentNonStriker,
      bowlerId: currentBowler,
      timestamp: Date.now()
    };

    const newMatch = { ...match };
    const currentInningRef = newMatch.innings[newMatch.currentInningIndex];
    currentInningRef.events = [...currentInningRef.events, newBall];

    // Strike Rotation Logic
    let finalStriker = newMatch.strikerId;
    let finalNonStriker = newMatch.nonStrikerId;

    if (runs % 2 !== 0) {
      [finalStriker, finalNonStriker] = [finalNonStriker, finalStriker];
    }

    const isOverEndingNow = newLegalBalls > 0 && newLegalBalls % 6 === 0 && (type === 'legal' || type === 'bye' || type === 'legbye');
    if (isOverEndingNow) {
      [finalStriker, finalNonStriker] = [finalNonStriker, finalStriker];
    }

    newMatch.strikerId = finalStriker;
    newMatch.nonStrikerId = finalNonStriker;

    if (wicket) {
      newMatch.strikerId = "";
    }

    const totalPossibleBalls = match.oversPerInnings * 6;
    if (newMatch.currentInningIndex === 0) {
      if (newLegalBalls === totalPossibleBalls || newWickets === maxWickets) {
        // Trigger innings break instead of immediately switching
        newMatch.status = 'innings_break';
        newMatch.inningsBreakStartedAt = Date.now();
        newMatch.innings[0].isCompleted = true;
      }
    } else {
      const isTargetReached = target && newTotalRuns >= target;
      const areOversCompleted = newLegalBalls === totalPossibleBalls;
      const isAllOut = newWickets === maxWickets;
      if (isTargetReached || areOversCompleted || isAllOut) {
        newMatch.status = 'finished';
      }
    }

    setSelectedExtra(null);
    onUpdate(newMatch);
  };

  const undoLast = () => {
    if (isSpectator) return;
    const newMatch = { ...match };
    const currentEvents = newMatch.innings[newMatch.currentInningIndex].events;
    if (currentEvents.length === 0) {
      return;
    }
    newMatch.innings[newMatch.currentInningIndex].events = currentEvents.slice(0, -1);
    onUpdate(newMatch);
  };

  const strikerStats = getBatsmanStats(currentInning.events, match.strikerId || 'Batsman');
  const nonStrikerStats = getBatsmanStats(currentInning.events, match.nonStrikerId || 'Batsman');
  const currentBowlerStats = getBowlerStats(currentInning.events, match.bowlerId || 'Bowler');

  const getBallDisplay = (e: BallEvent) => {
    if (e.isWicket) {
      return 'W';
    }
    if (e.type === 'wide') {
      return `${e.runs > 0 ? e.runs + 1 : ''}wd`;
    }
    if (e.type === 'noball') {
      return `${e.runs > 0 ? e.runs + 1 : ''}nb`;
    }
    if (e.type === 'bye') {
      return `${e.runs}b`;
    }
    if (e.type === 'legbye') {
      return `${e.runs}lb`;
    }
    return e.runs.toString();
  };

  const getBallColor = (e: BallEvent) => {
    if (e.isWicket) {
      return 'bg-red-600 border-red-400 text-white';
    }
    if (e.runs === 6 && e.type === 'legal') {
      return 'bg-purple-600 border-purple-400 text-white';
    }
    if (e.runs === 4 && e.type === 'legal') {
      return 'bg-[#1DB954] border-[#A3FF12] text-black';
    }
    if (e.type !== 'legal') {
      return 'bg-gray-800 border-gray-600 text-[#A3FF12]';
    }
    return 'bg-white/10 border-white/5 text-white';
  };

  return (
    <div className="flex flex-col min-h-screen pb-80 animate-in fade-in duration-500">
      {/* Broadcast Graphics Overlays */}
      {overlay && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none overflow-hidden px-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300"></div>
          {overlay.type === '4' && (
            <div className="relative animate-in zoom-in-50 duration-500 ease-out flex flex-col items-center">
              <div className="text-7xl md:text-[10rem] lg:text-[12rem] font-black text-[#1DB954] italic tracking-tighter drop-shadow-[0_0_50px_rgba(29,185,84,0.8)] animate-bounce text-center leading-none uppercase break-words">FOUR!</div>
            </div>
          )}
          {overlay.type === '6' && (
            <div className="relative animate-in slide-in-from-bottom-20 duration-500 ease-out flex flex-col items-center">
              <div className="text-8xl md:text-[12rem] lg:text-[14rem] font-black text-[#A3FF12] italic tracking-tight drop-shadow-[0_0_60px_rgba(163,255,18,0.9)] animate-pulse text-center leading-none uppercase break-words">SIX!</div>
            </div>
          )}
          {overlay.type === 'W' && (
            <div className="relative animate-in zoom-in-150 duration-300 ease-in flex flex-col items-center">
              <div className="text-7xl md:text-[10rem] lg:text-[12rem] font-black text-red-600 italic tracking-tighter drop-shadow-[0_0_50px_rgba(220,38,38,0.8)] animate-shake text-center leading-none uppercase break-words">OUT!</div>
            </div>
          )}
          {overlay.type === 'HAT' && (
            <div className="relative animate-in zoom-in-50 duration-500 ease-out flex flex-col items-center">
              <div className="text-5xl md:text-[8rem] lg:text-[10rem] font-black text-[#FFD700] italic tracking-tighter drop-shadow-[0_0_60px_rgba(255,215,0,0.8)] animate-bounce text-center leading-none uppercase break-words">HATTRICK!</div>
              <div className="text-white text-xl md:text-3xl font-bold uppercase tracking-[0.5em] mt-2 md:mt-8 animate-pulse">Sensational Bowling</div>
            </div>
          )}
          {overlay.type === 'FH' && (
            <div className="relative animate-in slide-in-from-top-20 duration-500 ease-out flex flex-col items-center">
              <div className="text-6xl md:text-[8rem] lg:text-[10rem] font-black text-[#A3FF12] italic tracking-tight drop-shadow-[0_0_60px_rgba(163,255,18,0.9)] animate-pulse text-center leading-none uppercase break-words">FREE HIT!</div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Header */}
      <div className="sticky top-0 z-50 glass border-b border-white/10 px-3 py-2 shadow-2xl">
        <div className="flex justify-between items-start max-w-4xl mx-auto">
          {/* Left: Score Info */}
          <div className="animate-in slide-in-from-left-4 duration-500">
            <div className="flex items-center gap-2 mb-0.5">
              <h1 className="text-[#1DB954] font-bold text-[10px] uppercase tracking-widest">{currentInning.teamName} BATTING</h1>
              {isSpectator && (
                <span className="bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded animate-pulse">LIVE</span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold tabular-nums drop-shadow-[0_2px_10px_rgba(29,185,84,0.2)]">
                {totalRuns}<span className="text-[#A3FF12]/50 mx-1">-</span>{totalWickets}
              </span>
              <span className="text-xl font-bold text-gray-500">({overs})</span>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!matchId) {
                  alert('This is a local match and cannot be shared.');
                  return;
                }
                const joinUrl = `${window.location.origin}/?matchId=${matchId}`;
                navigator.clipboard.writeText(joinUrl).then(() => {
                  alert(`Match link copied to clipboard!\n\nShare this link with spectators:\n${joinUrl}`);
                }).catch(() => {
                  alert(`Failed to copy link. Please copy manually:\n\n${joinUrl}`);
                });
              }}
              className="px-3 py-2 rounded-lg bg-[#1DB954]/10 hover:bg-[#1DB954]/20 text-[#1DB954] transition-colors border border-[#1DB954]/20 flex items-center gap-2"
              title="Share Match"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">SHARE</span>
            </button>
            {!isSpectator && match.status === 'live' && (
              <button
                onClick={handleTimeout}
                className="px-3 py-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest transition-colors border border-yellow-500/20"
                title="Pause Match"
              >
                ⏸ TIMEOUT
              </button>
            )}
            <button
              onClick={onExit}
              className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest transition-colors border border-red-500/20"
              title={isSpectator ? "Exit Spectate Mode" : "End Match"}
            >
              {isSpectator ? 'END SPECTATE' : 'END MATCH'}
            </button>
          </div>
        </div>

        {/* Spectator Count and Match Info Row */}
        <div className="flex justify-between items-center max-w-4xl mx-auto mt-1">
          {/* Left: Match Info */}
          <div className="text-xs text-gray-500 uppercase tracking-widest font-bold">
            {match.currentInningIndex === 0 ? '1st' : '2nd'} Innings • {match.playersPerTeam} Players
          </div>

          {/* Right: Spectator Count - Only show if online match */}
          {matchId && (
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-lg border border-white/10">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              <div className="relative overflow-hidden h-5 flex items-center">
                <span
                  className={`text-xs font-bold text-gray-300 transition-all duration-500 ${countAnimation === 'up' ? 'animate-roll-up' :
                    countAnimation === 'down' ? 'animate-roll-down' : ''
                    }`}
                  key={spectatorCount}
                >
                  {spectatorCount} {spectatorCount === 1 ? 'viewer' : 'viewers'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Free Hit / Target Info */}
        <div className="flex justify-end items-center max-w-4xl mx-auto mt-1">
          <div className="text-right flex flex-col items-end gap-1">
            {isFreeHit && (
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-1 rounded-md text-[9px] font-black italic tracking-widest animate-pulse border border-white/20">
                FREE HIT
              </div>
            )}
            {target && (
              <div className="space-y-1">
                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black animate-pulse ${runsNeeded! <= 0 ? 'bg-green-500 text-white' : 'bg-[#A3FF12] text-black'}`}>
                  {runsNeeded! <= 0 ? (
                    'TARGET REACHED!'
                  ) : (
                    `NEED ${runsNeeded} IN ${(match.oversPerInnings * 6) - legalBalls} BALLS`
                  )}
                </div>
                <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest text-right">Target: {target}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation - Tabs for Score/Card/Timeline */}
      <div className="flex-grow max-w-4xl mx-auto w-full p-4 space-y-6">
        <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/5 shadow-inner">
          {['score', 'card', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${activeTab === tab ? 'bg-white text-black shadow-[0_4px_20px_rgba(255,255,255,0.2)] scale-[1.03]' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Match Analytics Card - RRR & Win Probability */}
        <MatchAnalyticsCard match={match} className="animate-in fade-in slide-in-from-bottom-4 duration-500" />

        {activeTab === 'score' && (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Over Progress Card */}
            <div className="glass rounded-3xl p-5 border border-white/10 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-[#A3FF12]"></div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Live Over {Math.floor(legalBalls / 6) + 1}</span>
                  {isFreeHit && <span className="text-[8px] bg-purple-600 text-white px-2 py-0.5 rounded font-black animate-pulse uppercase">Free Hit</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-600 uppercase">Bowling:</span>
                  {isEditable ? (
                    <input
                      type="text"
                      value={match.bowlerId}
                      onChange={(e) => updatePlayerName('bowler', e.target.value)}
                      placeholder="Set Bowler"
                      className="bg-white/10 border border-[#A3FF12]/20 rounded-lg px-3 py-1 text-[11px] font-black text-[#A3FF12] focus:outline-none focus:border-[#A3FF12] w-28 uppercase"
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-[#A3FF12] uppercase tracking-tight">{match.bowlerId}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-3 items-center overflow-x-auto pb-2 scrollbar-hide snap-x">
                {currentOverEvents.map((e) => (
                  <div key={e.id} className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm border-2 transition-all transform snap-center shadow-lg relative ${getBallColor(e)}`}>
                    {getBallDisplay(e)}
                    {e.isFreeHit && <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 border border-white/50 rounded-full"></div>}
                  </div>
                ))}
                {Array.from({ length: Math.max(0, 6 - currentOverEvents.filter(e => e.type === 'legal' || e.type === 'bye' || e.type === 'legbye').length) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex-shrink-0 w-12 h-12 rounded-2xl border-2 border-white/5 bg-white/5 animate-pulse opacity-20"></div>
                ))}
              </div>
            </div>

            {/* BATSMAN CARDS - HIGHLIGHTED STRIKER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Striker Card */}
              <div className={`glass rounded-3xl p-6 border-l-8 transition-all duration-500 relative overflow-hidden ${match.strikerId ? 'border-[#1DB954] shadow-[0_10px_40px_rgba(29,185,84,0.15)] ring-1 ring-white/10' : 'border-red-500 bg-red-500/5 animate-pulse'}`}>
                <div className="absolute top-0 right-0 p-2">
                  <div className="flex items-center gap-1 bg-[#1DB954] text-black px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest italic animate-in slide-in-from-right-2">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
                    Striker
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  {isEditable ? (
                    <div className="w-2/3">
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1 block">New Striker</label>
                      <input
                        type="text"
                        value={match.strikerId}
                        onChange={(e) => updatePlayerName('striker', e.target.value)}
                        placeholder="NAME HERE"
                        className={`w-full bg-white/5 border rounded-xl px-3 py-2 text-sm font-black focus:outline-none uppercase ${!match.strikerId ? 'border-red-500/50 text-white' : 'border-white/10 text-[#A3FF12]'}`}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="font-bold text-sm tracking-tight text-[#A3FF12] flex items-center gap-2 uppercase">
                        {strikerStats.name}*
                      </span>
                    </div>
                  )}
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-500 block uppercase tracking-tighter">S.R.</span>
                    <span className="text-sm font-black text-white">{strikerStats.sr.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-6xl font-bold tabular-nums text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">{strikerStats.runs}</span>
                  <span className="text-2xl font-bold text-gray-600 mb-1.5">({strikerStats.balls})</span>
                </div>
              </div>

              {/* Non-Striker Card */}
              <div className="glass rounded-3xl p-6 border-l-4 border-white/5 opacity-60 transition-all duration-500 grayscale hover:grayscale-0 hover:opacity-100 group relative">
                <div className="absolute top-0 right-0 p-2">
                  <div className="bg-white/10 text-gray-400 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">
                    Non-Striker
                  </div>
                </div>

                <div className="flex justify-between items-center mb-4">
                  {isEditable ? (
                    <div className="w-2/3">
                      <label className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-1 block">Non-Striker</label>
                      <input
                        type="text"
                        value={match.nonStrikerId}
                        onChange={(e) => updatePlayerName('nonStriker', e.target.value)}
                        placeholder="NAME HERE"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-black text-gray-400 focus:outline-none w-full uppercase"
                      />
                    </div>
                  ) : (
                    <span className="font-black text-sm tracking-tight text-gray-400 uppercase">
                      {nonStrikerStats.name}
                    </span>
                  )}
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-gray-600 block uppercase tracking-tighter">S.R.</span>
                    <span className="text-sm font-black text-gray-500">{nonStrikerStats.sr.toFixed(1)}</span>
                  </div>
                </div>
                <div className="flex items-end gap-3">
                  <span className="text-4xl font-black tabular-nums text-gray-500">{nonStrikerStats.runs}</span>
                  <span className="text-lg font-bold text-gray-700 mb-0.5">({nonStrikerStats.balls})</span>
                </div>
              </div>
            </div>

            {/* Bowler Card */}
            <div className="glass rounded-3xl p-6 border-r-4 border-red-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-l from-red-500/5 to-transparent">
              <div className="flex justify-between items-center mb-6">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Active Bowler</span>
                  <span className="font-black text-sm text-red-500 uppercase tracking-[0.2em] italic">{match.bowlerId}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-gray-600 uppercase block tracking-widest">Economy</span>
                  <span className="text-xl font-black text-white">{currentBowlerStats.economy.toFixed(2)}</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Overs', val: currentBowlerStats.overs, accent: false },
                  { label: 'Runs', val: currentBowlerStats.runs, accent: false },
                  { label: 'Wkts', val: currentBowlerStats.wickets, accent: true },
                  { label: 'Extras', val: currentBowlerStats.wides + currentBowlerStats.noBalls, accent: false }
                ].map((stat, idx) => (
                  <div key={idx} className={`rounded-2xl p-3 text-center border ${stat.accent ? 'bg-red-600/10 border-red-500/40' : 'bg-white/5 border-white/5'}`}>
                    <div className="text-[8px] text-gray-500 font-black uppercase mb-1">{stat.label}</div>
                    <div className={`text-xl font-black ${stat.accent ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.4)]' : ''}`}>{stat.val}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Card Tab */}
        {activeTab === 'card' && (
          <div className="glass rounded-3xl p-8 space-y-10 border border-white/10 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
            <div>
              <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-1.5 bg-[#A3FF12] rounded-full shadow-[0_0_10px_rgba(163,255,18,0.5)]"></div>
                <h3 className="text-[#A3FF12] font-black text-2xl italic tracking-tighter uppercase">Innings Scorecard</h3>
              </div>
              <div className="space-y-6">
                {allBatsmen.map(name => {
                  const s = getBatsmanStats(currentInning.events, name);
                  const isCurrent = name === match.strikerId || name === match.nonStrikerId;
                  return (
                    <div key={name} className={`flex justify-between items-center border-b border-white/5 pb-6 transition-all duration-300 ${isCurrent ? 'opacity-100 bg-white/5 px-4 rounded-xl -mx-4' : 'opacity-40 grayscale'}`}>
                      <div className="flex-1">
                        <div className="font-black text-xl flex items-center gap-3 uppercase italic tracking-tighter">
                          {s.name}
                          {name === match.strikerId && <span className="text-[9px] bg-[#1DB954] text-black px-2 py-0.5 rounded-full italic font-black shadow-[0_0_10px_rgba(29,185,84,0.4)]">ON STRIKE</span>}
                        </div>
                        <div className="text-[10px] text-gray-500 font-black uppercase mt-1 tracking-widest">{s.isOut ? (s.dismissal || 'OUT') : 'IN MIDDLE'}</div>
                      </div>
                      <div className="flex gap-8 items-center">
                        <div className="text-right min-w-[60px]">
                          <div className="text-3xl font-black tracking-tighter text-white">{s.runs}</div>
                          <div className="text-[9px] text-gray-500 font-black uppercase tracking-widest">{s.balls} BALLS</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="glass rounded-3xl p-6 border border-white/10 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-8 w-1.5 bg-[#A3FF12] rounded-full"></div>
                <h3 className="text-[#A3FF12] font-black text-2xl italic tracking-tighter uppercase">Ball History</h3>
              </div>
              <div className="space-y-4">
                {oversHistory.map(([overNum, events]) => (
                  <div key={overNum} className="flex flex-col gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-[#1DB954]/20 transition-all group">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black text-white italic group-hover:text-[#A3FF12] transition-colors">OVER {Number(overNum) + 1}</span>
                      <span className="text-[10px] font-black text-[#1DB954] uppercase tracking-widest italic">{events[0].bowlerId} SPELL</span>
                    </div>
                    <div className="flex gap-2 items-center overflow-x-auto pb-1 scrollbar-hide">
                      {events.map(e => (
                        <div key={e.id} className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border relative transition-transform hover:scale-110 ${getBallColor(e)}`}>
                          {getBallDisplay(e)}
                          {e.isFreeHit && <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-600 rounded-full border border-white/20"></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controller Pad */}
      {
        !isSpectator && (
          <div className="fixed bottom-0 left-0 right-0 glass border-t border-white/20 p-5 z-[60] safe-area-bottom shadow-[0_-15px_40px_rgba(0,0,0,0.6)]">
            <div className="max-w-4xl mx-auto space-y-5">
              <div className="flex justify-between items-center px-1">
                <button onClick={undoLast} className="text-[10px] font-black text-red-500/80 hover:text-red-500 uppercase flex items-center gap-2 bg-red-500/5 px-4 py-2 rounded-full border border-red-500/10 active:scale-90 transition-transform">
                  Undo Ball
                </button>
                <div className="flex gap-4 items-center">
                  {isFreeHit && <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest italic animate-pulse">Free Hit active!</span>}
                  <button
                    onClick={() => recordBall(0, selectedExtra || 'legal', true)}
                    className={`px-10 py-3 rounded-full text-[11px] font-black uppercase border-2 flex items-center gap-2 transition-all duration-300 active:scale-95 ${isFreeHit ? 'bg-red-600/20 border-red-600 text-red-500' : 'bg-red-600 border-red-600 text-white shadow-lg'}`}
                  >
                    {isFreeHit ? 'RUN OUT!' : 'WICKET!'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-6 gap-3">
                {[0, 1, 2, 3, 4, 6].map(run => (
                  <button
                    key={run}
                    onClick={() => recordBall(run, selectedExtra || 'legal', false)}
                    className={`h-16 rounded-2xl text-2xl font-black transition-all active:scale-90 flex flex-col items-center justify-center relative overflow-hidden group
                  ${selectedExtra ? 'bg-[#A3FF12]/20 border-2 border-[#A3FF12]/40 text-[#A3FF12]' : (run === 4 || run === 6 ? 'bg-[#1DB954] text-black shadow-[#1DB954]/20' : 'bg-white/10 text-white border border-white/5')}
                `}
                  >
                    <div className="relative z-10">{run}</div>
                    <span className={`relative z-10 text-[8px] uppercase tracking-widest mt-1 ${selectedExtra ? 'text-[#A3FF12]' : (run >= 4 ? 'text-black/60' : 'opacity-40')}`}>
                      {selectedExtra ? `+ ${selectedExtra.slice(0, 2).toUpperCase()}` : (run === 1 ? 'Run' : 'Runs')}
                    </span>
                    {isFreeHit && <div className="absolute top-0 left-0 w-2 h-2 bg-purple-600"></div>}
                    <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-4 gap-3 pb-2">
                {[
                  { id: 'wide', label: 'Wide', sub: '+1 WD' },
                  { id: 'noball', label: 'No Ball', sub: '+1 NB' },
                  { id: 'legbye', label: 'Leg Bye', sub: 'LB' },
                  { id: 'bye', label: 'Bye', sub: 'BYE' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleExtraToggle(type.id as BallType)}
                    className={`flex flex-col items-center justify-center py-3 rounded-2xl font-black border-2 transition-all active:scale-95 ${selectedExtra === type.id ? 'bg-[#A3FF12] text-black border-[#A3FF12] scale-105 shadow-[0_0_15px_rgba(163,255,18,0.5)]' : 'bg-white/5 border-white/5 text-gray-500'}`}
                  >
                    <span className="text-xs uppercase tracking-tighter">{type.label}</span>
                    <span className={`text-[8px] font-bold uppercase mt-0.5 ${selectedExtra === type.id ? 'text-black/60' : 'text-gray-700'}`}>{type.sub}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Spectator Reaction Bar - Only for spectators */}
      {isSpectator && matchId && (
        <SpectatorReactionBar matchId={matchId} isMatchLive={isMatchLive} />
      )}

      {/* Live Interaction Feed (including floating emojis) - Only for spectators */}
      {isSpectator && matchId && (
        <LiveInteractionFeed matchId={matchId} />
      )}

      <style>{`
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .safe-area-bottom { padding-bottom: calc(1.25rem + env(safe-area-inset-bottom)); }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes roll-up {
          0% { transform: translateY(100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes roll-down {
          0% { transform: translateY(-100%); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        .animate-roll-up {
          animation: roll-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-roll-down {
          animation: roll-down 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .tabular-nums { font-variant-numeric: tabular-nums; }
      `}</style>

      {/* Floating Auto Commentary (Spectator Only) */}
      {isSpectator && commentaries.map((commentary) => (
        <FloatingCommentary
          key={commentary.id}
          commentary={commentary}
          onComplete={removeCommentary}
        />
      ))}
    </div>
  );
};

export default LiveScoring;