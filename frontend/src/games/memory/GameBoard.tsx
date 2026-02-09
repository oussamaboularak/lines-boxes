import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent, MemoryGameState } from '../../../../shared/types';
import { Trophy } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { getMemoryCardSrc, getMemoryCardLabel } from '../../constants/memory-cards';

const CARD_BACK = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%236366f1" width="100" height="100" rx="8"/><text x="50" y="55" font-size="40" text-anchor="middle" fill="white">?</text></svg>'
);

export const MemoryGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [pendingHide, setPendingHide] = useState<number[]>([]);
    const lastFlippedRef = useRef<number | null>(null);
    const prevRevealedRef = useRef<number[]>([]);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    if (!room || !room.gameData || room.gameData.gameType !== 'MEMORY') return null;

    const gameState = room.gameData as MemoryGameState;
    const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
    const currentPlayer = room.players.find(p => p.id === currentPlayerId);
    const isMyTurn = currentPlayerId === playerId;

    const effectiveRevealed = pendingHide.length > 0 ? pendingHide : gameState.revealed;

    useEffect(() => {
        const prevRevealed = prevRevealedRef.current;
        prevRevealedRef.current = gameState.revealed;

        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        if (gameState.revealed.length === 0 && lastFlippedRef.current !== null && prevRevealed.length === 1) {
            const justFlipped = lastFlippedRef.current;
            const otherCard = prevRevealed[0];
            lastFlippedRef.current = null;

            if (!gameState.matched.includes(justFlipped) && !gameState.matched.includes(otherCard)) {
                setPendingHide([otherCard, justFlipped]);
                hideTimerRef.current = setTimeout(() => {
                    setPendingHide([]);
                    hideTimerRef.current = null;
                }, 1500);
            }
        } else {
            lastFlippedRef.current = null;
            if (gameState.revealed.length === 0) setPendingHide([]);
        }
    }, [gameState.revealed, gameState.matched]);

    const handleCardClick = (index: number) => {
        if (!isMyTurn) return;
        if (gameState.revealed.includes(index) || gameState.matched.includes(index)) return;
        if (gameState.revealed.length >= 2) return;

        lastFlippedRef.current = index;
        socket.emit(SocketEvent.FLIP_CARD, index);
    };

    const isCardVisible = (index: number) =>
        effectiveRevealed.includes(index) || gameState.matched.includes(index);

    const cardCount = gameState.cards.length;
    const cols = cardCount <= 20 ? 4 : cardCount <= 40 ? 5 : 8;
    const rows = Math.ceil(cardCount / cols);

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)' }}>
            <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700' }}>Memory Game</h1>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {room.players.map((player) => (
                            <div
                                key={player.id}
                                style={{
                                    padding: '0.75rem 1rem',
                                    background: player.id === currentPlayer?.id ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                                    borderRadius: '0.75rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    border: player.id === playerId ? '2px solid var(--accent-primary)' : 'none',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <PlayerAvatar avatarId={player.avatar} name={player.name} size={32} />
                                <span style={{ fontWeight: '600' }}>{player.name}</span>
                                <span style={{ background: 'rgba(0,0,0,0.3)', padding: '0.25rem 0.5rem', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: '700' }}>
                                    {player.score}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="game-board-layout memory-game-layout">
                    <div className="card game-board-card memory-game-card" style={{ flex: 1 }}>
                        <div
                            className="memory-game-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${cols}, minmax(72px, 1fr))`,
                                gridTemplateRows: `repeat(${rows}, minmax(72px, 1fr))`,
                                gap: 'clamp(0.5rem, 2vw, 1rem)',
                                width: '100%',
                                maxWidth: 'min(650px, 95vw)',
                                margin: '0 auto'
                            }}
                        >
                            {gameState.cards.map((cardId, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    aria-label={isCardVisible(index)
                                        ? `Card showing ${getMemoryCardLabel(cardId)}`
                                        : `Reveal card ${index + 1}`}
                                    onClick={() => handleCardClick(index)}
                                    disabled={!isMyTurn || isCardVisible(index) || gameState.revealed.length >= 2}
                                    style={{
                                        aspectRatio: '1',
                                        padding: 0,
                                        border: 'none',
                                        borderRadius: '0.75rem',
                                        overflow: 'hidden',
                                        cursor: isMyTurn && !isCardVisible(index) && gameState.revealed.length < 2 ? 'pointer' : 'default',
                                        background: 'transparent',
                                        transition: 'transform 0.2s'
                                    }}
                                >
                                    <div
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundImage: isCardVisible(index)
                                                ? `url(${getMemoryCardSrc(cardId)})`
                                                : `url(${CARD_BACK})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            borderRadius: '0.75rem',
                                            border: '2px solid var(--border-color)'
                                        }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="game-controls">
                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                                {isMyTurn ? '🎯 Your Turn' : `⏳ ${currentPlayer?.name}'s Turn`}
                            </h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                Flip two cards to find a match!
                            </p>
                        </div>
                        <div className="card">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trophy size={20} /> Scores
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {room.players.sort((a, b) => b.score - a.score).map((player) => (
                                    <div
                                        key={player.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.75rem',
                                            background: player.id === playerId ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                                            borderRadius: '0.5rem'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <PlayerAvatar avatarId={player.avatar} name={player.name} size={24} />
                                            <span style={{ fontWeight: '600' }}>{player.name}</span>
                                        </div>
                                        <span style={{ fontSize: '1.25rem', fontWeight: '700' }}>{player.score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
