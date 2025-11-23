/**
 * @file types.ts
 * @description Type declarations for multiplayer blackjack game seats and state.
 * @class N/A (types)
 * @module Components/Blackjack
 * @inputs N/A
 * @outputs Exported interfaces & type unions (BJSeat, BlackjackGameState, etc.)
 * @external_sources Middleware card types
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */
import type { Card } from "~middleware/cards";

export type BJSeatId = 0 | 1 | 2 | 3 | 4;

export interface BJPlayer {
  id: string;           // user id
  name: string;         // display name
}

export interface BJSeat {
  id: BJSeatId;
  xPct: number;
  yPct: number;
  occupant?: BJPlayer;  // player in the seat
}

// Blackjack game state types
export type GamePhase = "waiting" | "betting" | "dealing" | "player_turn" | "dealer_turn" | "finished";

export interface BlackjackHand {
  cards: Card[];
  bet: number;
  isStanding: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
}

export interface BlackjackGameState {
  phase: GamePhase;
  deck: Card[];
  dealerHand: Card[];
  dealerVisible: boolean; // Show dealer's face-down card
  playerHands: Map<string, BlackjackHand>; // playerId -> hand
  currentPlayerId: string | null;
  winner: string | null; // playerId or "dealer" or "push"
}

export interface BlackjackPlayerState {
  player: BJPlayer;
  hand: BlackjackHand;
  seatId: BJSeatId;
}

export interface TableGameState {
  playerHand?: Card[];
  dealerHand?: Card[];
  dealerVisible?: boolean;
  phase?: GamePhase;
  bet?: number;
}
