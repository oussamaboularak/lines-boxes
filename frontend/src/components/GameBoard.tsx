import React, { useState, useEffect } from 'react';
import { socket } from '../socket';
import { useGameStore } from '../store';
import { SocketEvent, DotsAndBoxesState } from '../../../shared/types';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, Trophy } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';

const DiceIcon = ({ value }: { value: number }) => {
    const icons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
    const Icon = icons[value - 1] || Dice1;
    return <Icon size={32} />;
};

export const GameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [hoveredLine, setHoveredLine] = useState<{ type: string; row: number; col: number } | null>(null);
    const [diceRolling, setDiceRolling] = useState(false);
    const [cellSize, setCellSize] = useState(60);

    // Responsive cell size for mobile
    useEffect(() => {
        const updateCellSize = () => {
            const width = window.innerWidth;
            if (width <= 480) setCellSize(36);
            else if (width <= 768) setCellSize(48);
            else setCellSize(60);
        };
        updateCellSize();
        window.addEventListener('resize', updateCellSize);
        return () => window.removeEventListener('resize', updateCellSize);
    }, []);

    if (!room || !room.gameData || room.gameData.gameType !== 'DOTS_AND_BOXES') return null;

    const gameState = room.gameData as DotsAndBoxesState;
    const gridSize = room.settings.gridSize;
    // Use gameData.playerIds (authoritative game order) - room.players order may differ
    const currentPlayerId = gameState.playerIds?.[gameState.currentPlayerIndex];
    const currentPlayer = room.players.find(p => p.id === currentPlayerId);
    const isMyTurn = currentPlayerId === playerId;
    const dotRadius = 4;
    const lineThickness = 4;
    const svgWidth = gridSize * cellSize + 40;
    const svgHeight = gridSize * cellSize + 40;
    const offset = 20;

    const handleRollDice = () => {
        console.log('handleRollDice called. isMyTurn:', isMyTurn, 'diceRoll:', gameState.diceRoll);
        if (!isMyTurn || gameState.diceRoll !== null) return;
        setDiceRolling(true);
        socket.emit(SocketEvent.ROLL_DICE);
        setTimeout(() => setDiceRolling(false), 500);
    };

    const handlePlaceLine = (lineType: string, row: number, col: number) => {
        if (!isMyTurn || gameState.movesRemaining <= 0) return;

        const isPlaced = lineType === 'horizontal'
            ? gameState.board.horizontalLines[row]?.[col]
            : gameState.board.verticalLines[row]?.[col];

        if (isPlaced) return;

        socket.emit(SocketEvent.PLACE_LINE, { lineType, row, col });
    };



    // Get player color
    const getPlayerColor = (playerIndex: number) => {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];
        return colors[playerIndex % colors.length];
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)' }}>
            <div className="fade-in">
                {/* Header */}
                <div className="game-board-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <h1 style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700' }}>Dots and Boxes</h1>
                    <div className="game-board-players" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
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
                                <span style={{
                                    background: 'rgba(0,0,0,0.3)',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.5rem',
                                    fontSize: '0.9rem',
                                    fontWeight: '700'
                                }}>
                                    {player.score}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="game-board-layout">
                    {/* Game Board */}
                    <div className="card game-board-card">
                        <svg width={svgWidth} height={svgHeight} className="game-board-svg" style={{ maxWidth: '100%', height: 'auto' }}>
                            {/* Dots */}
                            {Array.from({ length: gridSize }).map((_, row) =>
                                Array.from({ length: gridSize }).map((_, col) => (
                                    <circle
                                        key={`dot-${row}-${col}`}
                                        cx={offset + col * cellSize}
                                        cy={offset + row * cellSize}
                                        r={dotRadius}
                                        fill="var(--text-primary)"
                                    />
                                ))
                            )}

                            {/* Horizontal Lines */}
                            {Array.from({ length: gridSize }).map((_, row) =>
                                Array.from({ length: gridSize - 1 }).map((_, col) => {
                                    const isPlaced = gameState.board.horizontalLines[row]?.[col];
                                    const isHovered = hoveredLine?.type === 'horizontal' && hoveredLine.row === row && hoveredLine.col === col;
                                    return (
                                        <line
                                            key={`h-${row}-${col}`}
                                            x1={offset + col * cellSize}
                                            y1={offset + row * cellSize}
                                            x2={offset + (col + 1) * cellSize}
                                            y2={offset + row * cellSize}
                                            stroke={isPlaced ? 'var(--accent-primary)' : (isHovered && isMyTurn && gameState.movesRemaining > 0 ? 'var(--accent-secondary)' : 'var(--border-color)')}
                                            strokeWidth={lineThickness}
                                            strokeLinecap="round"
                                            style={{ cursor: isMyTurn && !isPlaced && gameState.movesRemaining > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }}
                                            opacity={isPlaced ? 1 : (isHovered ? 0.7 : 0.3)}
                                            onMouseEnter={() => !isPlaced && setHoveredLine({ type: 'horizontal', row, col })}
                                            onMouseLeave={() => setHoveredLine(null)}
                                            onClick={() => handlePlaceLine('horizontal', row, col)}
                                        />
                                    );
                                })
                            )}

                            {/* Vertical Lines */}
                            {Array.from({ length: gridSize - 1 }).map((_, row) =>
                                Array.from({ length: gridSize }).map((_, col) => {
                                    const isPlaced = gameState.board.verticalLines[row]?.[col];
                                    const isHovered = hoveredLine?.type === 'vertical' && hoveredLine.row === row && hoveredLine.col === col;
                                    return (
                                        <line
                                            key={`v-${row}-${col}`}
                                            x1={offset + col * cellSize}
                                            y1={offset + row * cellSize}
                                            x2={offset + col * cellSize}
                                            y2={offset + (row + 1) * cellSize}
                                            stroke={isPlaced ? 'var(--accent-primary)' : (isHovered && isMyTurn && gameState.movesRemaining > 0 ? 'var(--accent-secondary)' : 'var(--border-color)')}
                                            strokeWidth={lineThickness}
                                            strokeLinecap="round"
                                            style={{ cursor: isMyTurn && !isPlaced && gameState.movesRemaining > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }}
                                            opacity={isPlaced ? 1 : (isHovered ? 0.7 : 0.3)}
                                            onMouseEnter={() => !isPlaced && setHoveredLine({ type: 'vertical', row, col })}
                                            onMouseLeave={() => setHoveredLine(null)}
                                            onClick={() => handlePlaceLine('vertical', row, col)}
                                        />
                                    );
                                })
                            )}

                            {/* Boxes */}
                            {Array.from({ length: gridSize - 1 }).map((_, row) =>
                                Array.from({ length: gridSize - 1 }).map((_, col) => {
                                    const ownerId = gameState.board.boxes[row]?.[col];
                                    if (!ownerId) return null;
                                    const owner = room.players.find(p => p.id === ownerId);
                                    if (!owner) return null;
                                    return (
                                        <rect
                                            key={`box-${row}-${col}`}
                                            x={offset + col * cellSize + dotRadius}
                                            y={offset + row * cellSize + dotRadius}
                                            width={cellSize - dotRadius * 2}
                                            height={cellSize - dotRadius * 2}
                                            fill={getPlayerColor(owner.colorIndex)}
                                            opacity={0.7}
                                            className="fade-in"
                                        />
                                    );
                                })
                            )}
                        </svg>
                    </div>

                    {/* Game Controls */}
                    <div className="game-controls">
                        <div className="card" style={{ marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                                {isMyTurn ? '🎯 Your Turn' : `⏳ ${currentPlayer?.name}'s Turn`}
                            </h3>

                            {isMyTurn && gameState.diceRoll === null && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleRollDice}
                                    disabled={diceRolling}
                                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                                >
                                    {diceRolling ? '🎲 Rolling...' : '🎲 Roll Dice'}
                                </button>
                            )}

                            {gameState.diceRoll !== null && (
                                <div style={{ textAlign: 'center' }}>
                                    <div
                                        className={diceRolling ? '' : 'fade-in'}
                                        style={{
                                            background: 'var(--accent-gradient)',
                                            borderRadius: '1rem',
                                            padding: '1.5rem',
                                            marginBottom: '1rem',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '0.5rem'
                                        }}
                                    >
                                        <DiceIcon value={gameState.diceRoll} />
                                        <div style={{ fontSize: '0.9rem', opacity: 0.9 }}>Rolled {gameState.diceRoll}</div>
                                    </div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--accent-primary)' }}>
                                        {gameState.movesRemaining} {gameState.movesRemaining === 1 ? 'move' : 'moves'} left
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="card">
                            <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Trophy size={20} />
                                Scores
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {room.players
                                    .sort((a, b) => b.score - a.score)
                                    .map((player) => (
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
