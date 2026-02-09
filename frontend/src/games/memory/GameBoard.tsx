import React, { useState, useEffect } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent, MemoryGameState } from '../../../../shared/types';
import { Trophy } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { getMemoryCardSrc, getMemoryCardLabel, getCardBackSrc } from '../../constants/memory-cards';

const CARD_ASPECT_STR = '2/3';
const CARD_GAP = 10;

function getResponsiveCols(cardCount: number, width: number): number {
    const desktop = cardCount <= 8 ? 4 : cardCount <= 16 ? 4 : cardCount <= 24 ? 6 : cardCount <= 40 ? 8 : 10;
    if (width >= 768) return desktop;
    if (width >= 480) return Math.min(3, desktop);
    return Math.min(2, desktop);
}

export const MemoryGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [cols, setCols] = useState(4);
    const cardCount = room?.gameData?.gameType === 'MEMORY'
        ? (room.gameData as MemoryGameState).cards.length
        : 0;

    useEffect(() => {
        const updateCols = () => {
            setCols(getResponsiveCols(cardCount, window.innerWidth));
        };
        updateCols();
        window.addEventListener('resize', updateCols);
        return () => window.removeEventListener('resize', updateCols);
    }, [cardCount]);

    if (!room || !room.gameData || room.gameData.gameType !== 'MEMORY') return null;

    const gameState = room.gameData as MemoryGameState;
    const currentPlayerId = gameState.playerIds[gameState.currentPlayerIndex];
    const currentPlayer = room.players.find(p => p.id === currentPlayerId);
    const isMyTurn = currentPlayerId === playerId;

    const handleCardClick = (index: number) => {
        if (!isMyTurn) return;
        if (gameState.revealed.includes(index) || gameState.matched.includes(index)) return;
        if (gameState.revealed.length >= 2) return;

        socket.emit(SocketEvent.FLIP_CARD, index);
    };

    const isCardVisible = (index: number) =>
        gameState.revealed.includes(index) || gameState.matched.includes(index);

    const rows = Math.ceil(cardCount / cols);

    return (
        <div className="container memory-game-page" style={{ minHeight: '100vh', width: '100%', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)' }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
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
                    <div className="card game-board-card memory-game-card">
                        <div
                            className="memory-game-grid"
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${cols}, minmax(64px, 1fr))`,
                                gridTemplateRows: `repeat(${rows}, auto)`,
                                gap: `${CARD_GAP}px`,
                                width: '100%',
                                minWidth: 0,
                                justifyItems: 'stretch',
                                alignItems: 'stretch',
                                alignContent: 'start'
                            }}
                        >
                            {gameState.cards.map((cardId, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    className={`memory-card ${isCardVisible(index) ? 'memory-card-flipped' : ''}`}
                                    aria-label={isCardVisible(index)
                                        ? `Card showing ${getMemoryCardLabel(cardId)}`
                                        : `Reveal card ${index + 1}`}
                                    onClick={() => handleCardClick(index)}
                                    disabled={!isMyTurn || isCardVisible(index) || gameState.revealed.length >= 2}
                                    style={{
                                        width: '100%',
                                        maxWidth: '100%',
                                        aspectRatio: CARD_ASPECT_STR,
                                        padding: 0,
                                        border: 'none',
                                        borderRadius: '0.5rem',
                                        overflow: 'hidden',
                                        cursor: isMyTurn && !isCardVisible(index) && gameState.revealed.length < 2 ? 'pointer' : 'default',
                                        background: 'transparent',
                                        position: 'relative',
                                        isolation: 'isolate'
                                    }}
                                >
                                    <div className="memory-card-inner">
                                        <div
                                            className="memory-card-face memory-card-back"
                                            style={{
                                                backgroundImage: `url(${getCardBackSrc()})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}
                                        />
                                        <div
                                            className="memory-card-face memory-card-front"
                                            style={{
                                                backgroundImage: `url(${getMemoryCardSrc(cardId)})`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center'
                                            }}
                                        />
                                    </div>
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
