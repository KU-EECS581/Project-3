/**
 * @file handEval.ts
 * @description Lightweight 7-card Texas Hold'em evaluator (best hand category & kickers).
 * @class N/A (functions)
 * @module Components/Poker
 * @inputs Arrays of up to 7 cards (community + hole)
 * @outputs EvaluatedHand (category, ranks, label)
 * @external_sources Middleware card rank/suit types
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */
import type { Suit, Rank } from '~middleware/cards';

export type UCard = { suit: Suit; rank: Rank };

export type HandCategory =
  | 'High Card'
  | 'Pair'
  | 'Two Pair'
  | 'Three of a Kind'
  | 'Straight'
  | 'Flush'
  | 'Full House'
  | 'Four of a Kind'
  | 'Straight Flush';

export interface EvaluatedHand {
  category: HandCategory;
  /** Higher is better. First element is the primary comparison, then kickers. */
  ranks: number[];
  /** Human-friendly name like "Two Pair (Aces and Tens)" */
  label: string;
}

const RANK_VALUE: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  JACK: 11,
  QUEEN: 12,
  KING: 13,
  ACE: 14,
};

function valueOf(rank: Rank): number {
  return RANK_VALUE[rank];
}

function byDesc(a: number, b: number) {
  return b - a;
}

function rankName(v: number): string {
  switch (v) {
    case 14: return 'Aces';
    case 13: return 'Kings';
    case 12: return 'Queens';
    case 11: return 'Jacks';
    case 10: return 'Tens';
    case 9: return 'Nines';
    case 8: return 'Eights';
    case 7: return 'Sevens';
    case 6: return 'Sixes';
    case 5: return 'Fives';
    case 4: return 'Fours';
    case 3: return 'Threes';
    case 2: return 'Twos';
    default: return String(v);
  }
}

/** Evaluate best 5-card hand from up to 7 cards. */
export function evaluateBestHand(all: UCard[]): EvaluatedHand {
  // Build counts
  const rankCounts = new Map<number, number>();
  const suitBuckets = new Map<Suit, number[]>();
  const ranksAll: number[] = [];

  for (const c of all) {
    const v = valueOf(c.rank);
    ranksAll.push(v);
    rankCounts.set(v, (rankCounts.get(v) ?? 0) + 1);
    const arr = suitBuckets.get(c.suit) ?? [];
    arr.push(v);
    suitBuckets.set(c.suit, arr);
  }

  ranksAll.sort(byDesc);

  // Helpers
  const uniqueDesc = Array.from(new Set(ranksAll)).sort(byDesc);

  // Detect flush (collect top 5 ranks of any suit with >=5 cards)
  let flushRanks: number[] | undefined;
  for (const rv of suitBuckets.values()) {
    if (rv.length >= 5) {
      flushRanks = rv.sort(byDesc).slice(0, 7); // keep many for straight flush check
      break;
    }
  }

  // Detect straight given a sorted unique rank list, supports wheel A-2-3-4-5
  function straightHigh(ranksDescUnique: number[]): number | undefined {
    let streak = 1;
    for (let i = 0; i < ranksDescUnique.length - 1; i++) {
      const cur = ranksDescUnique[i];
      const next = ranksDescUnique[i + 1];
      if (cur - 1 === next) {
        streak++;
        if (streak >= 5) return cur; // high card of the straight
      } else if (cur !== next) {
        streak = 1;
      }
    }
    // Wheel: A-5 straight (A,5,4,3,2 present)
    const set = new Set(ranksDescUnique);
    if (set.has(14) && set.has(5) && set.has(4) && set.has(3) && set.has(2)) {
      return 5; // five-high straight
    }
    return undefined;
  }

  // Straight flush
  if (flushRanks) {
    const uniqueFlush = Array.from(new Set(flushRanks)).sort(byDesc);
    const sfHigh = straightHigh(uniqueFlush);
    if (sfHigh) {
      return {
        category: 'Straight Flush',
        ranks: [sfHigh],
        label: sfHigh === 14 ? 'Royal Flush' : `Straight Flush (high ${sfHigh === 5 ? '5' : rankName(sfHigh)})`,
      };
    }
  }

  // Quads, trips, pairs
  const groupsByCount: Record<number, number[]> = { 4: [], 3: [], 2: [], 1: [] };
  for (const [v, cnt] of rankCounts.entries()) {
    groupsByCount[cnt]?.push(v);
  }
  groupsByCount[4].sort(byDesc);
  groupsByCount[3].sort(byDesc);
  groupsByCount[2].sort(byDesc);
  groupsByCount[1].sort(byDesc);

  // Four of a kind
  if (groupsByCount[4].length) {
    const quad = groupsByCount[4][0];
    const kicker = Math.max(...uniqueDesc.filter(v => v !== quad));
    return {
      category: 'Four of a Kind',
      ranks: [quad, kicker],
      label: `Four of a Kind (${rankName(quad)})`,
    };
  }

  // Full house (3 + 2) among 7 cards
  if (groupsByCount[3].length) {
    const trip = groupsByCount[3][0];
    const pair = groupsByCount[3].length > 1
      ? groupsByCount[3][1]
      : (groupsByCount[2][0]);
    if (pair) {
      return {
        category: 'Full House',
        ranks: [trip, pair],
        label: `Full House (${rankName(trip)} over ${rankName(pair)})`,
      };
    }
  }

  // Flush
  if (flushRanks) {
    const top5 = Array.from(new Set(flushRanks)).sort(byDesc).slice(0, 5);
    return {
      category: 'Flush',
      ranks: top5,
      label: `Flush (${rankName(top5[0])} high)`,
    };
  }

  // Straight
  const sHigh = straightHigh(uniqueDesc);
  if (sHigh) {
    return {
      category: 'Straight',
      ranks: [sHigh],
      label: `Straight (high ${sHigh === 5 ? '5' : rankName(sHigh)})`,
    };
  }

  // Trips
  if (groupsByCount[3].length) {
    const trip = groupsByCount[3][0];
    const kickers = uniqueDesc.filter(v => v !== trip).slice(0, 2);
    return {
      category: 'Three of a Kind',
      ranks: [trip, ...kickers],
      label: `Three of a Kind (${rankName(trip)})`,
    };
  }

  // Two Pair
  if (groupsByCount[2].length >= 2) {
    const [p1, p2] = groupsByCount[2].slice(0, 2);
    const kicker = Math.max(...uniqueDesc.filter(v => v !== p1 && v !== p2));
    const hi = Math.max(p1, p2); const lo = Math.min(p1, p2);
    return {
      category: 'Two Pair',
      ranks: [hi, lo, kicker],
      label: `Two Pair (${rankName(hi)} and ${rankName(lo)})`,
    };
  }

  // One Pair
  if (groupsByCount[2].length === 1) {
    const p = groupsByCount[2][0];
    const kickers = uniqueDesc.filter(v => v !== p).slice(0, 3);
    return {
      category: 'Pair',
      ranks: [p, ...kickers],
      label: `Pair of ${rankName(p)}`,
    };
  }

  // High card
  const top5 = uniqueDesc.slice(0, 5);
  const hi = top5[0];
  return {
    category: 'High Card',
    ranks: top5,
    label: `${rankName(hi)} High`,
  };
}

/** Convenience wrapper for given community + hole arrays */
export function evaluateCommunityAndHole(community: UCard[], hole: UCard[]): EvaluatedHand {
  return evaluateBestHand([...community, ...hole]);
}
