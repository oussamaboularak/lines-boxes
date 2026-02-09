import React from 'react';
import { socket } from '../socket';
import { useGameStore } from '../store';
import { SocketEvent } from '../../../shared/types';
import { Play, Copy, Check, Users, Settings, Gamepad2 } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { AVATAR_OPTIONS } from '../constants/avatars';
import { GAME_OPTIONS } from '../constants/games';

const GRID_OPTIONS = [5, 6, 8] as const;
const SECRET_SIZE_OPTIONS = [4, 5, 6] as const;
const MAX_PLAYERS_OPTIONS = [2, 3, 4] as const;
const isFourChiffre = (room: { settings: { gameType?: string } }) => room.settings.gameType === 'FOUR_CHIFFRE';
const PAIR_COUNT_OPTIONS = [4, 6, 8, 10, 12, 16, 20, 24, 30, 40] as const;

export const Lobby: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [copied, setCopied] = React.useState(false);

    if (!room) return null;

    const isHost = room.hostId === playerId;
    const canStart = isHost && (
        isFourChiffre(room)
            ? room.players.length === 2
            : room.players.length >= 2 && room.players.length <= room.settings.maxPlayers
    );

    const handleStartGame = () => {
        socket.emit(SocketEvent.START_GAME);
    };

    const copyRoomCode = () => {
        navigator.clipboard.writeText(room.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSettingsChange = (updates: { gridSize?: number; maxPlayers?: number; gameType?: string; pairCount?: number; secretSize?: number }) => {
        if (!isHost) return;
        socket.emit(SocketEvent.UPDATE_ROOM_SETTINGS, { settings: updates });
    };

    const handleAvatarChange = (avatarId: string) => {
        socket.emit(SocketEvent.UPDATE_AVATAR, avatarId);
    };

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: '4rem' }}>
            <div className="fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                        Game Lobby
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Waiting for players to join...
                    </p>
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                Room Code
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: '700', letterSpacing: '0.1em', color: 'var(--accent-primary)' }}>
                                {room.code}
                            </div>
                        </div>
                        <button className="btn btn-secondary" onClick={copyRoomCode}>
                            {copied ? <Check size={20} /> : <Copy size={20} />}
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                            <Gamepad2 size={16} />
                            Game
                        </div>
                        {isHost ? (
                            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                                {GAME_OPTIONS.map((g) => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        onClick={() => handleSettingsChange({ gameType: g.id, ...(g.id === 'FOUR_CHIFFRE' ? { maxPlayers: 2, secretSize: 4 } : {}) })}
                                        style={{
                                            flex: 1,
                                            minWidth: '140px',
                                            padding: '0.75rem 1rem',
                                            borderRadius: '0.75rem',
                                            border: (room.settings.gameType ?? 'DOTS_AND_BOXES') === g.id ? '3px solid var(--accent-primary)' : '2px solid var(--border-color)',
                                            background: (room.settings.gameType ?? 'DOTS_AND_BOXES') === g.id ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s',
                                            textAlign: 'left'
                                        }}
                                    >
                                        <div style={{ fontWeight: '600', fontSize: '1rem' }}>{g.label}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{g.description}</div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                                {GAME_OPTIONS.find(g => g.id === (room.settings.gameType ?? 'DOTS_AND_BOXES'))?.label ?? 'Dots and Boxes'}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        {(room.settings.gameType ?? 'DOTS_AND_BOXES') === 'MEMORY' ? (
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.75rem' }}>
                                <label htmlFor="lobby-pairs" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    <Settings size={16} />
                                    Pairs
                                </label>
                                {isHost ? (
                                    <select
                                        id="lobby-pairs"
                                        className="input"
                                        value={room.settings.pairCount ?? 8}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            if (!Number.isNaN(v)) handleSettingsChange({ pairCount: v });
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', fontWeight: '600' }}
                                    >
                                        {PAIR_COUNT_OPTIONS.map((n) => (
                                            <option key={n} value={n}>{n} pairs</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                        {room.settings.pairCount ?? 8} pairs
                                    </div>
                                )}
                            </div>
                        ) : isFourChiffre(room) ? (
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.75rem' }}>
                                <label htmlFor="lobby-secret-size" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    <Settings size={16} />
                                    Secret size
                                </label>
                                {isHost ? (
                                    <select
                                        id="lobby-secret-size"
                                        className="input"
                                        value={room.settings.secretSize ?? 4}
                                        onChange={(e) => {
                                            const v = Number(e.target.value);
                                            if ([4, 5, 6].includes(v)) handleSettingsChange({ secretSize: v });
                                        }}
                                        style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', fontWeight: '600' }}
                                    >
                                        {SECRET_SIZE_OPTIONS.map((n) => (
                                            <option key={n} value={n}>{n} digits</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                        {room.settings.secretSize ?? 4} digits
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.75rem' }}>
                                <label htmlFor="lobby-grid-size" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    <Settings size={16} />
                                    Grid Size
                                </label>
                            {isHost ? (
                                <select
                                    id="lobby-grid-size"
                                    className="input"
                                    value={room.settings.gridSize}
                                    onChange={(e) => handleSettingsChange({ gridSize: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', fontWeight: '600' }}
                                >
                                    {GRID_OPTIONS.map((size) => (
                                        <option key={size} value={size}>{size}x{size}</option>
                                    ))}
                                    </select>
                                ) : (
                                    <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                        {room.settings.gridSize}x{room.settings.gridSize}
                                    </div>
                                )}
                            </div>
                        )}
                        {(room.settings.gameType ?? 'DOTS_AND_BOXES') === 'DOTS_AND_BOXES' && (
                            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.75rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                                    <Settings size={16} />
                                    Dice Sides
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                    {room.settings.diceSides}
                                </div>
                            </div>
                        )}
                        <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.75rem' }}>
                            <label htmlFor="lobby-max-players" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                <Users size={16} />
                                Max Players
                            </label>
                            {isFourChiffre(room) ? (
                                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>2</div>
                            ) : isHost ? (
                                <select
                                    id="lobby-max-players"
                                    className="input"
                                    value={room.settings.maxPlayers}
                                    onChange={(e) => handleSettingsChange({ maxPlayers: Number(e.target.value) })}
                                    style={{ width: '100%', padding: '0.5rem', fontSize: '1rem', fontWeight: '600' }}
                                >
                                    {MAX_PLAYERS_OPTIONS.filter((n) => n >= room.players.length).map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            ) : (
                                <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>
                                    {room.settings.maxPlayers}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users size={24} />
                        Players ({room.players.length}/{room.settings.maxPlayers})
                    </h3>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Your character</p>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {AVATAR_OPTIONS.map((a) => (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => handleAvatarChange(a.id)}
                                    style={{
                                        padding: '2px',
                                        borderRadius: '50%',
                                        border: room.players.find(p => p.id === playerId)?.avatar === a.id ? '3px solid var(--accent-primary)' : '2px solid var(--border-color)',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <img src={a.src} alt={a.label} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {room.players.map((player, index) => (
                            <div
                                key={player.id}
                                className="slide-in"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '1rem',
                                    background: player.id === playerId ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-tertiary)',
                                    border: player.id === playerId ? '1px solid var(--accent-primary)' : '1px solid transparent',
                                    borderRadius: '0.75rem',
                                    animationDelay: `${index * 0.1}s`
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <PlayerAvatar avatarId={player.avatar} name={player.name} size={40} />
                                    <div>
                                        <div style={{ fontWeight: '600' }}>
                                            {player.name} {player.id === playerId && '(You)'}
                                        </div>
                                        {player.isHost && (
                                            <div style={{ fontSize: '0.85rem', color: 'var(--accent-primary)' }}>
                                                👑 Host
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: player.isConnected ? 'var(--success)' : 'var(--text-muted)',
                                        animation: player.isConnected ? 'pulse 2s infinite' : 'none'
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {isHost && (
                    <button
                        className="btn btn-primary"
                        onClick={handleStartGame}
                        disabled={!canStart}
                        style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}
                    >
                        <Play size={24} />
                        {canStart
                            ? 'Start Game'
                            : isFourChiffre(room) && room.players.length !== 2
                                ? `4 Chiffres needs exactly 2 players (${room.players.length} now)`
                                : `Waiting for players (${room.players.length}/${room.settings.maxPlayers})`}
                    </button>
                )}

                {!isHost && (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>
                        Waiting for host to start the game...
                    </div>
                )}
            </div>
        </div>
    );
};
