import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useGameStore, getClientId, getSavedAvatar, saveAvatar } from '../store';
import { SocketEvent, RoomSettings } from '../../../shared/types';
import { Gamepad2, Users, LogIn } from 'lucide-react';
import { AVATAR_OPTIONS } from '../constants/avatars';

const GRID_OPTIONS = [5, 6, 8] as const;
const MAX_PLAYERS_OPTIONS = [2, 3, 4] as const;

export const Landing: React.FC = () => {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [gridSize, setGridSize] = useState<number>(5);
    const [maxPlayers, setMaxPlayers] = useState<number>(4);
    const [avatar, setAvatar] = useState<string>(getSavedAvatar() || AVATAR_OPTIONS[0].id);
    const { error, setError, room } = useGameStore();
    const navigate = useNavigate();

    // Navigate to room when room is set
    useEffect(() => {
        if (room) {
            navigate(`/room/${room.code}`);
        }
    }, [room, navigate]);

    const handleCreateRoom = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        localStorage.setItem('playerName', playerName.trim());
        saveAvatar(avatar);

        const settings: RoomSettings = {
            gridSize,
            diceSides: 6,
            maxPlayers
        };

        socket.emit(SocketEvent.CREATE_ROOM, { settings, name: playerName.trim(), clientId: getClientId(), avatar });
    };

    const handleJoinRoom = () => {
        if (!playerName.trim()) {
            setError('Please enter your name');
            return;
        }

        if (!roomCode.trim()) {
            setError('Please enter a room code');
            return;
        }

        localStorage.setItem('playerName', playerName.trim());
        saveAvatar(avatar);

        socket.emit(SocketEvent.JOIN_ROOM, { code: roomCode.toUpperCase(), name: playerName, clientId: getClientId(), avatar });
    };

    return (
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="fade-in" style={{ maxWidth: '500px', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <Gamepad2 size={48} style={{ color: 'var(--accent-primary)' }} />
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', background: 'var(--accent-gradient)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Game Hub
                        </h1>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                        Play Dots and Boxes with friends online
                    </p>
                </div>

                {error && (
                    <div className="alert alert-error">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                <div className="card">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                            Choose your character
                        </label>
                        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            {AVATAR_OPTIONS.map((a) => (
                                <button
                                    key={a.id}
                                    type="button"
                                    onClick={() => setAvatar(a.id)}
                                    style={{
                                        padding: '0.5rem',
                                        borderRadius: '0.75rem',
                                        border: avatar === a.id ? '3px solid var(--accent-primary)' : '2px solid var(--border-color)',
                                        background: avatar === a.id ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-tertiary)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <img src={a.src} alt={a.label} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                            Your Name
                        </label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter your name"
                            value={playerName}
                            onChange={(e) => setPlayerName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleCreateRoom()}
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                                Grid Size
                            </label>
                            <select
                                className="input"
                                value={gridSize}
                                onChange={(e) => setGridSize(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.75rem' }}
                            >
                                {GRID_OPTIONS.map((size) => (
                                    <option key={size} value={size}>{size}x{size}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                                Max Players
                            </label>
                            <select
                                className="input"
                                value={maxPlayers}
                                onChange={(e) => setMaxPlayers(Number(e.target.value))}
                                style={{ width: '100%', padding: '0.75rem' }}
                            >
                                {MAX_PLAYERS_OPTIONS.map((n) => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                        <button className="btn btn-primary" onClick={handleCreateRoom} style={{ flex: 1 }}>
                            <Users size={20} />
                            Create Room
                        </button>
                    </div>

                    <div style={{ position: 'relative', textAlign: 'center', margin: '2rem 0' }}>
                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '1px', background: 'var(--border-color)' }}></div>
                        <span style={{ position: 'relative', background: 'var(--bg-secondary)', padding: '0 1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            OR
                        </span>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: '500' }}>
                            Room Code
                        </label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Enter room code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleJoinRoom()}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>

                    <button className="btn btn-secondary" onClick={handleJoinRoom} style={{ width: '100%' }}>
                        <LogIn size={20} />
                        Join Room
                    </button>
                </div>
            </div>
        </div>
    );
};
