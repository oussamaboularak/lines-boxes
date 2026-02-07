import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';
import { useGameStore } from '../store';
import { SocketEvent, RoomSettings } from '../../../shared/types';
import { Gamepad2, Users, LogIn } from 'lucide-react';

export const Landing: React.FC = () => {
    const [playerName, setPlayerName] = useState('');
    const [roomCode, setRoomCode] = useState('');
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

        // Save player name to localStorage for rejoin
        localStorage.setItem('playerName', playerName.trim());

        const settings: RoomSettings = {
            gridSize: 5,
            diceSides: 6,
            maxPlayers: 2
        };

        socket.emit(SocketEvent.CREATE_ROOM, { settings, name: playerName.trim() });
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

        // Save player name to localStorage for rejoin
        localStorage.setItem('playerName', playerName.trim());

        socket.emit(SocketEvent.JOIN_ROOM, { code: roomCode.toUpperCase(), name: playerName });
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
