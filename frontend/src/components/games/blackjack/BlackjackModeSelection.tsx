/**
 * @file BlackjackModeSelection.tsx
 * @description Component for selecting singleplayer or multiplayer mode
 */

import { useCallback } from "react";

interface BlackjackModeSelectionProps {
    onSelectMode: (mode: "singleplayer" | "multiplayer") => void;
}

export function BlackjackModeSelection({ onSelectMode }: BlackjackModeSelectionProps) {
    const handleSingleplayer = useCallback(() => {
        onSelectMode("singleplayer");
    }, [onSelectMode]);

    const handleMultiplayer = useCallback(() => {
        onSelectMode("multiplayer");
    }, [onSelectMode]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            gap: '30px'
        }}>
            <h1 style={{
                fontSize: '3rem',
                color: '#ffd700',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
                marginBottom: '20px'
            }}>
                Select Game Mode
            </h1>
            
            <div style={{
                display: 'flex',
                gap: '40px',
                flexWrap: 'wrap',
                justifyContent: 'center'
            }}>
                <button
                    onClick={handleSingleplayer}
                    style={{
                        padding: '30px 60px',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        backgroundColor: '#22c55e',
                        color: '#fff',
                        border: '4px solid #16a34a',
                        borderRadius: '15px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 25px rgba(34, 197, 94, 0.4)',
                        transition: 'all 0.3s',
                        minWidth: '250px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 12px 35px rgba(34, 197, 94, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(34, 197, 94, 0.4)';
                    }}
                >
                    Singleplayer
                </button>
                
                <button
                    onClick={handleMultiplayer}
                    style={{
                        padding: '30px 60px',
                        fontSize: '1.5rem',
                        fontWeight: 'bold',
                        backgroundColor: '#3b82f6',
                        color: '#fff',
                        border: '4px solid #2563eb',
                        borderRadius: '15px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 25px rgba(59, 130, 246, 0.4)',
                        transition: 'all 0.3s',
                        minWidth: '250px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.05)';
                        e.currentTarget.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.4)';
                    }}
                >
                    Multiplayer
                </button>
            </div>
            
            <p style={{
                color: '#aaa',
                fontSize: '1rem',
                marginTop: '20px',
                textAlign: 'center',
                maxWidth: '600px'
            }}>
                Singleplayer: Play against the dealer alone<br/>
                Multiplayer: Join a table with up to 5 players
            </p>
        </div>
    );
}

