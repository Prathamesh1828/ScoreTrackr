
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
  status: 'setup' | 'toss' | 'live' | 'timeout' | 'innings_break' | 'finished' | 'waiting' | 'ended';
  strikerId: string;
  nonStrikerId: string;
  bowlerId: string;

  // Innings break tracking
  inningsBreakStartedAt?: number; // Timestamp when break started
  nextInningsStartsAt?: number;   // Optional: scheduled start time

  // Timeout tracking
  timeoutStartedAt?: number;       // Timestamp when timeout started
  timeoutReason?: string;          // Optional reason for timeout
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

export interface InningsSummary {
  teamName: string;
  totalRuns: number;
  totalWickets: number;
  overs: string;
  topBatsman: {
    name: string;
    runs: number;
    balls: number;
  } | null;
  topBowler: {
    name: string;
    wickets: number;
    runs: number;
    overs: string;
  } | null;
  extras: number;
}

// ============================================================================
// SPECTATOR INTERACTION TYPES
// ============================================================================

export type ReactionType = 'clap' | 'fire' | 'support' | 'wow';
export type MessageTemplateKey = 'team_support' | 'player_support' | 'big_moment' | 'need_wicket' | 'well_played';

export interface MatchReaction {
  id: string;
  match_id: string;
  reaction: ReactionType;
  team?: 'A' | 'B';
  created_at: string;
}

export interface SpectatorMessage {
  id: string;
  match_id: string;
  template_key: MessageTemplateKey;
  team?: string;
  player?: string;
  created_at: string;
}

export interface InteractionFeedItem {
  id: string;
  type: 'reaction' | 'message';
  content: string; // Rendered message or emoji
  count?: number; // For aggregated reactions
  timestamp: number;
  isOptimistic?: boolean; // For optimistic UI updates
  x?: number; // For floating animations (0-100 percentage)
}

