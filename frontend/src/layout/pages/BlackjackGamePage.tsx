/**
 * @file BlackjackGamePage.tsx
 * @description Page for the blackjack game with seat management and gameplay integration.
 * @author Riley Meyerkorth
 * @date 2025-10-26
 */

import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import { useNavigate } from "react-router";
import { RoutePath } from "../enums";
import { BlackjackTable } from "@/components/games/blackjack/BlackjackTable";
import { BlackjackGameControls } from "@/components/games/blackjack/BlackjackGameControls";
import { UserDataContext } from "@/contexts/UserDataContext";
import type { BJSeat, BJPlayer, TableGameState } from "@/components/games/blackjack/types";

// 5 seat anchors along the lower arc (tuned for blackjack table art)
const SEAT_ANCHORS: BJSeat[] = [
  { id: 0, xPct: 22, yPct: 74 },
  { id: 1, xPct: 37, yPct: 81 },
  { id: 2, xPct: 50, yPct: 85 },
  { id: 3, xPct: 63, yPct: 81 },
  { id: 4, xPct: 78, yPct: 74 },
];

export function BlackjackGamePage() {
  const navigate = useNavigate();
  const userCtx = useContext(UserDataContext);
  
  // Get current player from context
  const me: BJPlayer | undefined = useMemo(() => {
    if (!userCtx?.user) return undefined;
    return { 
      id: userCtx.user.name, 
      name: userCtx.user.name 
    };
  }, [userCtx?.user]);

  const [seats, setSeats] = useState<BJSeat[]>(SEAT_ANCHORS);
  const [mySeatId, setMySeatId] = useState<number | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [tableGameState, setTableGameState] = useState<TableGameState>({});
  const joined = mySeatId !== null;

  // Join: claim first free seat
  const handleJoin = useCallback(() => {
    if (!me) return;
    setSeats(prev => {
      const copy = prev.map(s => ({ ...s }));
      const open = copy.find(s => !s.occupant);
      if (!open) return copy;
      open.occupant = me;
      return copy;
    });
  }, [me]);

  // Sit out: free seat but stay on page (spectating)
  const handleSitOut = useCallback(() => {
    if (!me) return;
    setSeats(prev => 
      prev.map(s => 
        s.occupant?.id === me.id 
          ? { ...s, occupant: undefined } 
          : s
      )
    );
  }, [me]);

  // Track my seat id for UI state
  useEffect(() => {
    if (!me) {
      setMySeatId(null);
      return;
    }
    const mine = seats.find(s => s.occupant?.id === me.id);
    setMySeatId(mine ? mine.id : null);
  }, [seats, me]);

  // Handle leaving table (goes back to map)
  const handleLeaveTable = useCallback(() => {
    handleSitOut();
    navigate(RoutePath.MAP);
  }, [navigate, handleSitOut]);

  // Start the game
  const handleStartGame = useCallback(() => {
    setGameStarted(true);
  }, []);

  // Handle game state updates from game controls
  const handleGameStateUpdate = useCallback((state: TableGameState) => {
    setTableGameState(state);
  }, []);

  // Handle game end - add winnings to balance
  const handleGameEnd = useCallback((winnings: number, _result: "win" | "loss" | "push" | "blackjack") => {
    if (winnings > 0 && userCtx) {
      userCtx.addFunds(winnings);
    }
    // Reset game state after a delay
    setTimeout(() => {
      setGameStarted(false);
      setTableGameState({});
    }, 3000);
  }, [userCtx]);

  // Cleanup: free seat when component unmounts
  useEffect(() => {
    return () => {
      if (!me) return;
      setSeats(prev => 
        prev.map(s => 
          s.occupant?.id === me.id 
            ? { ...s, occupant: undefined } 
            : s
        )
      );
    };
  }, [me]);

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      width: '100%',
      background: '#0c0c15',
      color: 'white'
    }}>
      {/* Title */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '800',
          letterSpacing: '-0.025em',
          color: 'white'
        }}>Blackjack</h1>
      </div>

      {/* Table - always visible */}
      <BlackjackTable 
        seats={seats} 
        me={me}
        gameState={tableGameState}
        onStartGame={handleStartGame}
        onSitOut={handleSitOut}
        onLeaveTable={handleLeaveTable}
        onJoin={handleJoin}
      />

      {/* Game controls overlay - shown when game is started */}
      {gameStarted && me && joined && (
        <BlackjackGameControls 
          player={me}
          onGameStateUpdate={handleGameStateUpdate}
          onGameEnd={handleGameEnd}
        />
      )}
    </div>
  );
}
