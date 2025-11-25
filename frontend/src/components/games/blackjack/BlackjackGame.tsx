/**
 * @file BlackjackGame.tsx
 * @description Singleplayer blackjack game logic (betting, dealing, actions, resolution).
 * @class BlackjackGame
 * @module Components/Blackjack
 * @inputs player model, optional initialBet, onGameEnd callback
 * @outputs Game UI, result callback with winnings & outcome
 * @external_sources React hooks, middleware Deck + card utilities, UserData stats context
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import type { Card as CardModel } from "~middleware/cards";
import { Deck } from "~middleware/cards";
import { UserDataContext } from "@/contexts/UserDataContext";
import type { BJPlayer, GamePhase } from "./types";
import { calculateHandValue, getBestHandValue, isBusted, shouldDealerHit } from "./utils";
import { Card } from "@/components/Card";
import type { Card as CardComponentType } from "@/models";
import { useBlackjackStats } from "@/hooks/useBlackjackStats";
import { useSfx } from "@/hooks";

// Convert middleware card format to Card component format
function convertCard(card: CardModel): CardComponentType {
    return {
        suit: card.suit.toLowerCase() as CardComponentType['suit'],
        rank: card.rank.toLowerCase() as CardComponentType['rank']
    };
}

interface BlackjackGameProps {
  player: BJPlayer;
  initialBet?: number;
  onGameEnd?: (winnings: number, result: "win" | "loss" | "push" | "blackjack") => void;
}

const MIN_BET = 5;
const MAX_BET = 500;

export function BlackjackGame({ player, initialBet = MIN_BET, onGameEnd }: BlackjackGameProps) {
  const userCtx = useContext(UserDataContext);
  const { stats, recordResult } = useBlackjackStats('singleplayer');
  const [phase, setPhase] = useState<GamePhase>("betting");
  const [deck, setDeck] = useState<Deck | null>(null);
  const [playerHand, setPlayerHand] = useState<CardModel[]>([]);
  const [dealerHand, setDealerHand] = useState<CardModel[]>([]);
  const [dealerVisible, setDealerVisible] = useState(false);
  const [bet, setBet] = useState(initialBet);
  const [canDoubleDown, setCanDoubleDown] = useState(false);
  const [playerStood, setPlayerStood] = useState(false);
  const [gameResult, setGameResult] = useState<"win" | "loss" | "push" | "blackjack" | null>(null);
  const { playCardDeal, playCardFlip, playBet, playShuffle, playWin, playLose } = useSfx();

  // Initialize deck
  useEffect(() => {
    const newDeck = new Deck();
    newDeck.shuffle();
    playShuffle();
    setDeck(newDeck);
  }, [playShuffle]);

  const playerValue = useMemo(() => getBestHandValue(playerHand), [playerHand]);
  const dealerValue = useMemo(() => getBestHandValue(dealerHand), [dealerHand]);
  const playerBusted = useMemo(() => isBusted(playerHand), [playerHand]);
  const dealerBusted = useMemo(() => isBusted(dealerHand), [dealerHand]);

  // Check for blackjack
  const playerBlackjack = useMemo(() => {
    if (playerHand.length !== 2) return false;
    const { isBlackjack } = calculateHandValue(playerHand);
    return isBlackjack;
  }, [playerHand]);


  // Deal initial cards
  const dealInitialCards = useCallback(() => {
    if (!deck) return;

    const newDeck = new Deck();
    newDeck.shuffle();
    playShuffle();
    const playerCards = newDeck.dealCards(2);
    playCardDeal();
    playCardDeal();
    const dealerCards = newDeck.dealCards(2);
    playCardDeal();
    playCardDeal();

    setDeck(newDeck);
    setPlayerHand(playerCards);
    setDealerHand(dealerCards);
    setDealerVisible(false); // Hide dealer's second card initially
    setPhase("player_turn");
    setCanDoubleDown(true);
    setPlayerStood(false);

    // Check for natural blackjack
    const playerBJ = calculateHandValue(playerCards).isBlackjack;
    const dealerBJ = calculateHandValue(dealerCards).isBlackjack;

    if (playerBJ || dealerBJ) {
      setDealerVisible(true);
      setPhase("finished");
      if (playerBJ && dealerBJ) {
        setGameResult("push");
        recordResult("push");
        onGameEnd?.(0, "push");
      } else if (playerBJ) {
        setGameResult("blackjack");
        recordResult("blackjack");
        onGameEnd?.(Math.floor(bet * 2.5), "blackjack");
        playWin();
      } else {
        setGameResult("loss");
        recordResult("loss");
        onGameEnd?.(0, "loss");
        playLose();
      }
    }
  }, [deck, bet, onGameEnd, recordResult, playCardDeal, playShuffle, playWin, playLose]);

  // Place bet and deal
  const handlePlaceBet = useCallback(() => {
    if (!userCtx?.user || bet < MIN_BET || bet > MAX_BET) return;
    if (bet > userCtx.user.balance) return; // Insufficient funds
    userCtx.removeFunds(bet);
    playBet();
    dealInitialCards();
  }, [bet, userCtx, dealInitialCards, playBet]);

  // Player hits
  const handleHit = useCallback(() => {
    if (!deck || phase !== "player_turn" || playerStood || playerBusted) return;

    const card = deck.dealCard();
    playCardDeal();
    if (!card) return;

    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setCanDoubleDown(false); // Can't double after first hit

    // Check for bust
    if (isBusted(newHand)) {
      setDealerVisible(true);
      setPhase("finished");
      setGameResult("loss");
      recordResult("loss");
      onGameEnd?.(0, "loss");
      playLose();
    }
  }, [deck, phase, playerHand, playerStood, playerBusted, onGameEnd, recordResult, playLose]);

  // Player stands
  const handleStand = useCallback(() => {
    if (phase !== "player_turn" || playerStood) return;

    setPlayerStood(true);
    setDealerVisible(true);
    setPhase("dealer_turn");
    startDealerTurn();
  }, [phase, playerStood]);

  // Double down
  const handleDoubleDown = useCallback(() => {
    if (!canDoubleDown || !deck || !userCtx?.user || bet > userCtx.user.balance) return;

    userCtx.removeFunds(bet);
    playBet();
    setBet(prev => prev * 2);

    const card = deck.dealCard();
    playCardDeal();
    if (!card) return;

    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setCanDoubleDown(false);
    setPlayerStood(true);
    setDealerVisible(true);
    setPhase("dealer_turn");

    // If busted after double, end immediately
    if (isBusted(newHand)) {
      setPhase("finished");
      setGameResult("loss");
      recordResult("loss");
      onGameEnd?.(0, "loss");
      playLose();
    } else {
      startDealerTurn();
    }
  }, [canDoubleDown, deck, playerHand, userCtx, bet, onGameEnd, recordResult, playLose]);
  // Dealer turn
  const startDealerTurn = useCallback(() => {
    const dealerPlay = () => {
      setDeck(currentDeck => {
        if (!currentDeck) return currentDeck;

        setDealerHand(currentDealerHand => {
          if (shouldDealerHit(currentDealerHand)) {
            const card = currentDeck.dealCard();
            playCardDeal();
            if (!card) {
              // No cards left, dealer stands
              setTimeout(() => {
                setPhase("finished");
                // Evaluate with current hands
                setPlayerHand(currentPlayerHand => {
                  setDealerHand(dealerH => {
                    const playerVal = getBestHandValue(currentPlayerHand);
                    const dealerVal = getBestHandValue(dealerH);
                    
                    if (playerVal > dealerVal) {
                      setGameResult("win");
                      recordResult("win");
                      onGameEnd?.(bet * 2, "win");
                      playWin();
                    } else if (playerVal < dealerVal) {
                      setGameResult("loss");
                      recordResult("loss");
                      onGameEnd?.(0, "loss");
                      playLose();
                    } else {
                      setGameResult("push");
                      recordResult("push");
                      onGameEnd?.(bet, "push");
                    }
                    return dealerH;
                  });
                  return currentPlayerHand;
                });
              }, 500);
              return currentDealerHand;
            }

            const newDealerHand = [...currentDealerHand, card];

            if (isBusted(newDealerHand)) {
              setTimeout(() => {
                setPhase("finished");
                setGameResult("win");
                recordResult("win");
                onGameEnd?.(bet * 2, "win");
                playWin();
              }, 500);
              return newDealerHand;
            } else {
              // Continue dealer turn after a short delay
              setTimeout(dealerPlay, 800);
              return newDealerHand;
            }
          } else {
            // Dealer stands, evaluate winner
            setTimeout(() => {
              setPhase("finished");
              setPlayerHand(currentPlayerHand => {
                const playerVal = getBestHandValue(currentPlayerHand);
                const dealerVal = getBestHandValue(currentDealerHand);
                
                if (playerVal > dealerVal) {
                  setGameResult("win");
                  recordResult("win");
                  onGameEnd?.(bet * 2, "win");
                  playWin();
                } else if (playerVal < dealerVal) {
                  setGameResult("loss");
                  recordResult("loss");
                  onGameEnd?.(0, "loss");
                  playLose();
                } else {
                  setGameResult("push");
                  recordResult("push");
                  onGameEnd?.(bet, "push");
                  playBet();
                }
                return currentPlayerHand;
              });
            }, 500);
            return currentDealerHand;
          }
        });

        return currentDeck;
      });
    };

    setTimeout(dealerPlay, 500);
  }, [bet, onGameEnd, recordResult]);


  // New game
  const handleNewGame = useCallback(() => {
    const newDeck = new Deck();
    newDeck.shuffle();
    playShuffle();
    setDeck(newDeck);
    setPlayerHand([]);
    setDealerHand([]);
    setDealerVisible(false);
    setPhase("betting");
    setPlayerStood(false);
    setCanDoubleDown(false);
    setGameResult(null);
    setBet(initialBet);
  }, [initialBet]);

  // Adjust bet
  const adjustBet = useCallback((delta: number) => {
    setBet(prev => {
      const newBet = Math.max(MIN_BET, Math.min(MAX_BET, prev + delta));
      return newBet;
    });
    playBet();
  }, [playBet]);

  const balance = userCtx?.user?.balance ?? 0;
  const canBet = phase === "betting" && bet <= balance && bet >= MIN_BET;
  const canPlay = phase === "player_turn" && !playerStood && !playerBusted;

  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {/* Dealer Section */}
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-2xl font-bold">Dealer</h2>
        <div className="flex gap-2 items-center justify-center">
          {dealerHand.map((card, idx) => (
            <Card
              key={idx}
              card={idx === 1 && !dealerVisible ? undefined : convertCard(card)}
              faceDown={idx === 1 && !dealerVisible}
              width={80}
              height={112}
            />
          ))}
        </div>
        {dealerVisible && (
          <div className="text-lg">
            {dealerBusted ? (
              <span className="text-red-500">BUSTED ({dealerValue})</span>
            ) : (
              <span>Value: {dealerValue}</span>
            )}
          </div>
        )}
      </div>

      {/* Player Section */}
      <div className="flex flex-col items-center gap-3">
        <h2 className="text-2xl font-bold">{player.name}</h2>
        <div className="flex gap-2 flex-wrap justify-center items-center">
          {playerHand.map((card, idx) => (
            <Card key={idx} card={convertCard(card)} width={80} height={112} />
          ))}
        </div>
        <div className="text-lg">
          {playerBusted ? (
            <span className="text-red-500">BUSTED ({playerValue})</span>
          ) : (
            <span>Value: {playerValue}</span>
          )}
        </div>
        {playerBlackjack && <div className="text-green-500 font-bold">BLACKJACK!</div>}
      </div>

      {/* Betting Phase */}
      {phase === "betting" && (
        <div className="flex flex-col items-center gap-4 p-4 bg-zinc-800 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <div className="text-lg">Balance: ${balance.toFixed(2)}</div>
            {/* Stats Tracker */}
            <div className="flex gap-3 text-sm text-gray-300">
              <span className="text-green-500">Wins: {stats.wins}</span>
              <span className="text-red-500">Losses: {stats.losses}</span>
              <span className="text-yellow-500">Win Rate: {stats.winRate}%</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => adjustBet(-5)}
              className="px-4 py-2 bg-zinc-600 rounded hover:bg-zinc-700"
              disabled={bet <= MIN_BET}
            >
              -$5
            </button>
            <div className="text-2xl font-bold min-w-[100px] text-center">
              ${bet.toFixed(2)}
            </div>
            <button
              onClick={() => adjustBet(5)}
              className="px-4 py-2 bg-zinc-600 rounded hover:bg-zinc-700"
              disabled={bet >= MAX_BET || bet + 5 > balance}
            >
              +$5
            </button>
          </div>
          <button
            onClick={handlePlaceBet}
            disabled={!canBet}
            className="px-6 py-3 bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
          >
            Place Bet
          </button>
        </div>
      )}

      {/* Player Turn Controls */}
      {canPlay && (
        <div className="flex gap-4">
          <button
            onClick={handleHit}
            className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 font-bold"
          >
            Hit
          </button>
          <button
            onClick={handleStand}
            className="px-6 py-3 bg-amber-600 rounded-lg hover:bg-amber-700 font-bold"
          >
            Stand
          </button>
          {canDoubleDown && balance >= bet && (
            <button
              onClick={handleDoubleDown}
              className="px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 font-bold"
            >
              Double Down
            </button>
          )}
        </div>
      )}

      {/* Game Result */}
      {phase === "finished" && gameResult && (
        <div className="flex flex-col items-center gap-4 p-6 bg-zinc-800 rounded-lg">
          <div className={`text-3xl font-bold ${
            gameResult === "win" || gameResult === "blackjack" ? "text-green-500" :
            gameResult === "loss" ? "text-red-500" : "text-yellow-500"
          }`}>
            {gameResult === "win" && "You Win!"}
            {gameResult === "loss" && "You Lose!"}
            {gameResult === "push" && "Push!"}
            {gameResult === "blackjack" && "Blackjack!"}
          </div>
          <button
            onClick={handleNewGame}
            className="px-6 py-3 bg-emerald-600 rounded-lg hover:bg-emerald-700 font-bold"
          >
            New Game
          </button>
        </div>
      )}
    </div>
  );
}
