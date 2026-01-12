
import React, { useState, useEffect } from 'react';
import { MatchState } from './types';
import Setup from './components/Setup';
import Toss from './components/Toss';
import LiveScoring from './components/LiveScoring';
import Result from './components/Result';

import Lenis from 'lenis';

const App: React.FC = () => {
  const [match, setMatch] = useState<MatchState>({
    team1: '',
    team2: '',
    oversPerInnings: 5,
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

  useEffect(() => {
    // Initialize Lenis for smooth scrolling
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Default smooth easing
      // direction: 'vertical', // default
      // gestureDirection: 'vertical', // default
      // smooth: true, // default
      // mouseMultiplier: 1, // default
      // smoothTouch: false, // default
      // touchMultiplier: 2, // default
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



  const handleStartSetup = (t1: string, t2: string, overs: number, players: number) => {
    setMatch({
      ...match,
      team1: t1,
      team2: t2,
      oversPerInnings: overs,
      playersPerTeam: players,
      status: 'toss'
    });
  };

  const handleTossComplete = (winner: string, decision: 'bat' | 'bowl') => {
    const team1Batting = (winner === match.team1 && decision === 'bat') || (winner === match.team2 && decision === 'bowl');
    const batFirst = team1Batting ? match.team1 : match.team2;
    const batSecond = team1Batting ? match.team2 : match.team1;

    setMatch({
      ...match,
      tossWinner: winner,
      tossDecision: decision,
      battingFirst: batFirst,
      innings: [
        { teamName: batFirst, events: [], isCompleted: false },
        { teamName: batSecond, events: [], isCompleted: false }
      ],
      status: 'live'
    });
  };

  const handleExitMatch = () => {
    if (window.confirm("Are you sure you want to exit the match? Progress will be lost.")) {
      setMatch({
        ...match,
        status: 'setup'
      });
    }
  };

  const handleTossBack = () => {
    setMatch({
      ...match,
      status: 'setup'
    });
  };

  const handleUpdate = (newMatch: MatchState) => {
    setMatch(newMatch);
  };

  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen">
      {match.status === 'setup' && <Setup onStart={handleStartSetup} />}
      {match.status === 'toss' && <Toss team1={match.team1} team2={match.team2} onComplete={handleTossComplete} onBack={handleTossBack} />}
      {match.status === 'live' && <LiveScoring match={match} onUpdate={handleUpdate} onExit={handleExitMatch} />}
      {match.status === 'finished' && <Result match={match} onReset={handleReset} />}
    </div>
  );
};

export default App;
