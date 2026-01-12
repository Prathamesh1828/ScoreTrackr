
export type BallType = 'legal' | 'wide' | 'noball' | 'bye' | 'legbye';

export type DismissalType = 'bowled' | 'caught' | 'lbw' | 'run-out' | 'stumped' | 'hit-wicket' | 'others';

export interface BallEvent {
  id: string;
  inning: 1 | 2;
  over: number;
  ballInOver: number; // 1-6
  runs: number;
  type: BallType;
  isWicket: boolean;
  isFreeHit?: boolean;
  dismissalType?: DismissalType;
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
  timestamp: number;
}

export interface Player {
  id: string;
  name: string;
}

export interface Team {
  name: string;
  players: Player[];
}

export interface Inning {
  teamName: string;
  events: BallEvent[];
  isCompleted: boolean;
}

export interface MatchState {
  team1: string;
  team2: string;
  oversPerInnings: number;
  playersPerTeam: number;
  tossWinner: string | null;
  tossDecision: 'bat' | 'bowl' | null;
  battingFirst: string | null;
  innings: [Inning, Inning];
  currentInningIndex: 0 | 1;
  status: 'setup' | 'toss' | 'live' | 'finished';
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;
}

export interface BatsmanStats {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  sr: number;
  isOut: boolean;
  dismissal?: string;
}

export interface BowlerStats {
  name: string;
  overs: string;
  maidens: number;
  runs: number;
  wickets: number;
  economy: number;
  wides: number;
  noBalls: number;
}
