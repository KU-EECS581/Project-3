import { useContext, useMemo } from "react";
import type { BJSeat, BJPlayer, TableGameState } from "./types";
import { UserDataContext } from "@/contexts/UserDataContext";
import { CardView, CardBack } from "../poker/CardView";
import { getBestHandValue, isBusted } from "./utils";
import { useBlackjackStats } from "@/hooks/useBlackjackStats";

interface BlackjackTableProps {
  seats: BJSeat[];
  me?: BJPlayer;
  gameState?: TableGameState;
  onStartGame?: () => void;
  onSitOut?: () => void;
  onLeaveTable?: () => void;
  onJoin?: () => void;
}

export function BlackjackTable({ 
  seats, 
  me, 
  gameState,
  onStartGame,
  onSitOut,
  onLeaveTable,
  onJoin
}: BlackjackTableProps) {
  const userCtx = useContext(UserDataContext);
  const { stats } = useBlackjackStats('singleplayer');
  const balance = userCtx?.user?.balance ?? 0;
  
  // Find my seat
  const mySeat = me ? seats.find(s => s.occupant?.id === me.id) : null;
  const joined = mySeat !== null;
  const canStartGame = joined && !gameState?.playerHand && gameState?.phase !== "player_turn" && gameState?.phase !== "dealer_turn" && gameState?.phase !== "finished";

  // Calculate hand values
  const playerValue = useMemo(() => {
    if (!gameState?.playerHand || gameState.playerHand.length === 0) return null;
    return getBestHandValue(gameState.playerHand);
  }, [gameState?.playerHand]);

  const dealerValue = useMemo(() => {
    if (!gameState?.dealerHand || gameState.dealerHand.length === 0) return null;
    if (!gameState.dealerVisible) return null;
    return getBestHandValue(gameState.dealerHand);
  }, [gameState?.dealerHand, gameState?.dealerVisible]);

  const playerBusted = useMemo(() => {
    if (!gameState?.playerHand) return false;
    return isBusted(gameState.playerHand);
  }, [gameState?.playerHand]);

  // Styles
  const tableStyle: React.CSSProperties = {
    position: 'relative',
    background: 'linear-gradient(to bottom, #064e3b, #022c22)',
    borderRadius: '24px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
    border: '4px solid #92400e',
    overflow: 'hidden',
    width: '100%',
    height: '750px',
    minHeight: '750px',
  };

  const feltTexture: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(34, 197, 94, 0.3)',
    backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)',
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      paddingTop: '80px', 
      paddingBottom: '112px',
      paddingLeft: '24px',
      paddingRight: '24px',
      width: '100%'
    }}>
      <div style={{ position: 'relative', width: '100%', maxWidth: '1600px', minWidth: '1400px', zIndex: 1 }}>
        {/* Coded Blackjack Table */}
        <div style={tableStyle}>
          {/* Table felt texture overlay */}
          <div style={feltTexture} />
          
          {/* Table dimensions container */}
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Dealer Area - Top Center */}
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              zIndex: 10
            }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                borderRadius: '8px',
                padding: '8px 24px',
                border: '2px solid #d97706'
              }}>
                <div style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>Dealer</div>
              </div>
              
              {/* Dealer Cards */}
              {gameState?.dealerHand && gameState.dealerHand.length > 0 ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {gameState.dealerHand.map((card, idx) => (
                    <div key={idx} style={{ position: 'relative' }}>
                      {idx === 1 && !gameState.dealerVisible ? (
                        <CardBack size={70} />
                      ) : (
                        <CardView card={card} size={70} />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: '98px', display: 'flex', alignItems: 'center' }}>
                  <div style={{ color: '#9ca3af', fontSize: '14px' }}>Waiting...</div>
                </div>
              )}
              
              {/* Dealer Hand Value */}
              {dealerValue !== null && (
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  color: 'white',
                  background: dealerValue > 21 
                    ? '#dc2626' 
                    : dealerValue === 21
                    ? '#ca8a04'
                    : 'rgba(0, 0, 0, 0.6)'
                }}>
                  {dealerValue > 21 ? `BUST (${dealerValue})` : `Value: ${dealerValue}`}
                </div>
              )}
            </div>

            {/* Player Seats - Grid along bottom */}
            <div style={{
              position: 'absolute',
              bottom: '60px',
              left: '40px',
              right: '40px',
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: '24px',
            }}>
              {seats.map((seat) => {
                const occ = seat.occupant;
                const isMe = occ && me && occ.id === me.id;
                const seatBalance = isMe ? balance : 0;
                const seatCards = isMe && gameState?.playerHand ? gameState.playerHand : [];
                
                return (
                  <div
                    key={seat.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                      {/* Seat Card Area */}
                      <div style={{
                        width: '100%',
                        minHeight: '180px',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '10px',
                        border: '2px solid',
                        borderStyle: occ ? 'solid' : 'dashed',
                        background: occ 
                          ? isMe 
                            ? 'rgba(30, 58, 138, 0.5)' 
                            : 'rgba(5, 46, 22, 0.5)'
                          : 'rgba(0, 0, 0, 0.2)',
                        borderColor: occ
                          ? isMe
                            ? '#60a5fa'
                            : '#34d399'
                          : '#4b5563',
                        boxShadow: isMe ? '0 4px 12px rgba(0, 0, 0, 0.3)' : 'none',
                        transition: 'all 0.2s'
                      }}>
                      {/* Empty seat indicator */}
                      {!occ && (
                        <div style={{ color: '#6b7280', fontSize: '12px', textAlign: 'center' }}>
                          Seat {seat.id + 1}
                          <br />
                          <span style={{ color: '#4b5563' }}>Empty</span>
                        </div>
                      )}

                      {/* Player Character */}
                      {occ && (
                        <>
                          {/* Avatar */}
                          <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid',
                            fontWeight: 'bold',
                            fontSize: '18px',
                            color: 'white',
                            background: isMe ? '#2563eb' : '#047857',
                            borderColor: isMe ? '#93c5fd' : '#34d399',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
                          }}>
                            {occ.name.charAt(0).toUpperCase()}
                          </div>
                          
                          {/* Player Name */}
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 'bold',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            color: 'white',
                            background: isMe ? '#2563eb' : 'rgba(0, 0, 0, 0.7)'
                          }}>
                            {occ.name}
                          </div>
                          
                          {/* Balance */}
                          {isMe && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              alignItems: 'center'
                            }}>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                background: '#166534',
                                color: '#bbf7d0',
                                border: '1px solid #16a34a'
                              }}>
                                ${seatBalance.toFixed(2)}
                              </div>
                              {/* Stats Tracker */}
                              <div style={{
                                fontSize: '10px',
                                color: '#d1d5db',
                                display: 'flex',
                                gap: '8px'
                              }}>
                                <span style={{ color: '#22c55e' }}>Wins: {stats.wins}</span>
                                <span style={{ color: '#ef4444' }}>Losses: {stats.losses}</span>
                                <span style={{ color: '#fbbf24' }}>WR: {stats.winRate}%</span>
                              </div>
                            </div>
                          )}
                          
                            {/* Player Cards */}
                            {seatCards.length > 0 && (
                              <div style={{ 
                                display: 'flex', 
                                gap: '6px', 
                                marginTop: '8px',
                                flexWrap: 'wrap',
                                justifyContent: 'center'
                              }}>
                                {seatCards.map((card, idx) => (
                                  <CardView key={idx} card={card} size={50} />
                                ))}
                              </div>
                            )}
                          
                          {/* Player Hand Value */}
                          {isMe && playerValue !== null && seatCards.length > 0 && (
                            <div style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              marginTop: '4px',
                              color: 'white',
                              background: playerBusted
                                ? '#dc2626'
                                : playerValue === 21
                                ? '#ca8a04'
                                : 'rgba(0, 0, 0, 0.7)'
                            }}>
                              {playerBusted ? `BUST (${playerValue})` : `Value: ${playerValue}`}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons - Bottom Center */}
            <div style={{
              position: 'absolute',
              bottom: '12px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '16px',
              zIndex: 20
            }}>
              {!joined && me && onJoin && (
                <button
                  onClick={onJoin}
                  style={{
                    padding: '12px 32px',
                    background: '#16a34a',
                    color: 'white',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#16a34a'}
                >
                  Join Game
                </button>
              )}
              {canStartGame && (
                <button
                  onClick={onStartGame}
                  style={{
                    padding: '12px 32px',
                    background: '#16a34a',
                    color: 'white',
                    borderRadius: '10px',
                    border: 'none',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#15803d'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#16a34a'}
                >
                  Start Game
                </button>
              )}
              {joined && (
                <>
                  <button
                    onClick={onSitOut}
                    style={{
                      padding: '12px 32px',
                      background: '#d97706',
                      color: 'white',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#b45309'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#d97706'}
                  >
                    Sit Out
                  </button>
                  <button
                    onClick={onLeaveTable}
                    style={{
                      padding: '12px 32px',
                      background: '#dc2626',
                      color: 'white',
                      borderRadius: '10px',
                      border: 'none',
                      fontWeight: 'bold',
                      fontSize: '16px',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#b91c1c'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#dc2626'}
                  >
                    Leave Table
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
