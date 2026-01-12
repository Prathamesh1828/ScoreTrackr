
import { BallEvent, Inning, BatsmanStats, BowlerStats } from './types';

export const calculateInningsScore = (events: BallEvent[]) => {
  let totalRuns = 0;
  let totalWickets = 0;
  let legalBalls = 0;
  let extras = { wide: 0, noball: 0, bye: 0, legbye: 0 };

  events.forEach(event => {
    // Basic Runs
    totalRuns += event.runs;
    
    // Extras
    if (event.type === 'wide') {
      totalRuns += 1;
      extras.wide += 1;
    } else if (event.type === 'noball') {
      totalRuns += 1;
      extras.noball += 1;
    } else if (event.type === 'bye') {
      extras.bye += event.runs;
    } else if (event.type === 'legbye') {
      extras.legbye += event.runs;
    }

    // Wickets
    if (event.isWicket) {
      totalWickets += 1;
    }

    // Ball Counting
    if (event.type === 'legal' || event.type === 'bye' || event.type === 'legbye') {
      legalBalls += 1;
    }
  });

  const overs = `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`;
  const totalExtras = Object.values(extras).reduce((a, b) => a + b, 0);

  return { totalRuns, totalWickets, legalBalls, overs, extras, totalExtras };
};

export const getBatsmanStats = (events: BallEvent[], playerName: string): BatsmanStats => {
  let runs = 0;
  let balls = 0;
  let fours = 0;
  let sixes = 0;
  let isOut = false;
  let dismissal = '';

  events.forEach(e => {
    // Batsman stats only on events where they are striker
    // Runs from wide don't count for batsman. No-ball runs do.
    if (e.strikerId === playerName) {
      if (e.type !== 'wide' && e.type !== 'bye' && e.type !== 'legbye') {
        runs += e.runs;
        if (e.runs === 4) {
          fours++;
        }
        if (e.runs === 6) {
          sixes++;
        }
      }
      if (e.type !== 'wide') {
        balls++;
      }
      if (e.isWicket && e.dismissalType !== 'run-out') {
        isOut = true;
        dismissal = e.dismissalType || 'out';
      }
    }
    // Run-out can happen to anyone
    if (e.isWicket && e.dismissalType === 'run-out') {
      // Simplification: In gully cricket, usually striker is out unless called
      // Realistically we'd need to know WHO got run out. 
      // For this app, assume dismissal log would have player info if complex.
    }
  });

  return {
    name: playerName,
    runs,
    balls,
    fours,
    sixes,
    sr: balls > 0 ? (runs / balls) * 100 : 0,
    isOut,
    dismissal
  };
};

export const getBowlerStats = (events: BallEvent[], playerName: string): BowlerStats => {
  let runsConceded = 0, legalBalls = 0, wickets = 0, wides = 0, noballs = 0;

  events.forEach(e => {
    if (e.bowlerId === playerName) {
      // Runs from wide and no-ball count for bowler. Byes/Legbyes don't.
      if (e.type === 'wide') {
        runsConceded += (e.runs + 1);
        wides++;
      } else if (e.type === 'noball') {
        runsConceded += (e.runs + 1);
        noballs++;
      } else if (e.type === 'legal') {
        runsConceded += e.runs;
        legalBalls++;
      } else {
        // Bye / Legbye
        legalBalls++;
      }

      if (e.isWicket && e.dismissalType !== 'run-out') {
        wickets++;
      }
    }
  });

  const oversCount = Math.floor(legalBalls / 6) + (legalBalls % 6) / 10;
  const econ = legalBalls > 0 ? (runsConceded / (legalBalls / 6)) : 0;

  return {
    name: playerName,
    overs: `${Math.floor(legalBalls / 6)}.${legalBalls % 6}`,
    maidens: 0, // Simplified for gully
    runs: runsConceded,
    wickets,
    economy: econ,
    wides,
    noBalls: noballs
  };
};
