/**
 * @file types.ts
 * @description Types for the slots game
 */

// Slot machine symbols
export const Symbol = {
  CHERRY: "🍒",
  LEMON: "🍋",
  ORANGE: "🍊",
  BELL: "🔔",
  BAR: "▮",
  SEVEN: "7",
  DIAMOND: "💎",
} as const;

export type Symbol = typeof Symbol[keyof typeof Symbol];

// Symbol weights (higher = more common)
export const SYMBOL_WEIGHTS: Record<Symbol, number> = {
  [Symbol.CHERRY]: 30,
  [Symbol.LEMON]: 25,
  [Symbol.ORANGE]: 20,
  [Symbol.BELL]: 10,
  [Symbol.BAR]: 8,
  [Symbol.SEVEN]: 5,
  [Symbol.DIAMOND]: 2,
};

// Payout multipliers for winning combinations
export const PAYOUTS: Record<string, number> = {
  // Three of a kind
  "💎💎💎": 100,  // Diamond - highest payout
  "777": 50,
  "▮▮▮": 30,
  "🔔🔔🔔": 20,
  "🍊🍊🍊": 15,
  "🍋🍋🍋": 10,
  "🍒🍒🍒": 5,
  
  // Two of a kind (on left two reels)
  "💎💎": 20,
  "777": 15,
  "▮▮": 10,
  "🔔🔔": 5,
  "🍊🍊": 3,
  "🍋🍋": 2,
  "🍒🍒": 1.5,
};

export interface SlotReel {
  symbols: Symbol[];
  currentIndex: number;
  isSpinning: boolean;
}

export interface SlotMachineState {
  reels: SlotReel[];
  bet: number;
  isSpinning: boolean;
  winAmount: number;
  lastWin: number;
  balance: number;
}

