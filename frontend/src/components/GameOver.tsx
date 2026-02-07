import React from 'react';
import { useGameStore } from '../store';
import { Trophy, Home } from 'lucide-react';

export const GameOver: React.FC = () => {
    const { room, playerId } = useGameStore();

    if (!room || !room.gameData || room.gameData.status !== 'ENDED') return null;

    const winner = room.gameData.winner;
    const isTie = winner === 'TIE';
    const isWinner = winner === playerId;

    const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);

    const handleNewGame = () => {
        window.location.reload();
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
                        {isTie ? '🤝' : isWinner ? '🎉' : '🎮'}
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        {isTie ? "It's a Tie!" : isWinner ? 'You Won!' : 'Game Over'}
                    </h1>
                    {!isTie && (
                        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
                            {isWinner ? 'Congratulations!' : `${sortedPlayers[0].name} wins!`}
                        </p>
                    )}
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <Trophy size={24} />
                        Final Scores
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {sortedPlayers.map((player, index) => (
                            <div
                                key={player.id}
                                className="slide-in"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1.25rem',
                                    background: index === 0 ? 'var(--accent-gradient)' : 'var(--bg-tertiary)',
                                    borderRadius: '0.75rem',
                                    animationDelay: `${index * 0.1}s`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '700', width: '30px' }}>
                                        {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>
                                            {player.name} {player.id === playerId && '(You)'}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                                    {player.score}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-secondary" onClick={handleNewGame} style={{ flex: 1 }}>
                        <Home size={20} />
                        New Game
                    </button>
                </div>
            </div>
        </div>
    );
};
