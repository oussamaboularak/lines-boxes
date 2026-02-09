import { useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { useGameStore, getClientId, getSavedAvatar } from './store';
import { socket } from './socket';
import { SocketEvent } from '../../shared/types';
import { Landing } from './components/Landing';
import { Lobby } from './components/Lobby';
import { ChooseFirstPlayer } from './components/ChooseFirstPlayer';
import { DotsAndBoxesGameBoard, DotsAndBoxesGameOver } from './games/dots-and-boxes';
import { MemoryGameBoard, MemoryGameOver } from './games/memory';
import './index.css';

function RoomPage() {
    const { roomCode } = useParams<{ roomCode: string }>();
    const { room, setError } = useGameStore();
    const navigate = useNavigate();

    useEffect(() => {
        // If we have a room code in URL but no room in state, try to rejoin (e.g. after page reload)
        if (roomCode && !room) {
            const savedName = localStorage.getItem('playerName');
            if (savedName) {
                // Socket.io queues emits when disconnected; rejoin will send once connected
                socket.emit(SocketEvent.JOIN_ROOM, { code: roomCode.toUpperCase(), name: savedName, clientId: getClientId(), avatar: getSavedAvatar() });
            } else {
                navigate('/');
            }
        }

        // If we have a room but the code doesn't match URL, update URL
        if (room && room.code !== roomCode?.toUpperCase()) {
            navigate(`/room/${room.code}`);
        }

        // If room is null and we're on a room page, show error after delay (use fresh state from store)
        if (!room && roomCode) {
            const timeout = setTimeout(() => {
                if (!useGameStore.getState().room) {
                    setError('Room not found or session expired');
                    navigate('/');
                }
            }, 5000);
            return () => clearTimeout(timeout);
        }
    }, [roomCode, room, navigate, setError]);

    if (!room) {
        return (
            <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--text-secondary)' }}>
                        Connecting to room...
                    </div>
                </div>
            </div>
        );
    }

    // Show game over if game has ended
    if (room.status === 'ENDED') {
        const gameType = room.gameData?.gameType ?? room.settings?.gameType ?? 'DOTS_AND_BOXES';
        if (gameType === 'MEMORY') return <MemoryGameOver />;
        return <DotsAndBoxesGameOver />;
    }

    // Show game board if game is playing
    if (room.status === 'PLAYING') {
        const gameType = room.gameData?.gameType ?? 'DOTS_AND_BOXES';
        if (gameType === 'MEMORY') return <MemoryGameBoard />;
        return <DotsAndBoxesGameBoard />;
    }

    // Rock Paper Scissors to decide who goes first
    if (room.status === 'CHOOSING_FIRST') {
        return <ChooseFirstPlayer />;
    }

    // Show lobby if in a room but not playing
    if (room.status === 'LOBBY') {
        return <Lobby />;
    }

    return null;
}

function App() {

    // Set up global socket event listeners that persist across routes
    useEffect(() => {
        socket.connect();

        socket.on('connect', () => {
            console.log('Socket connected, ID:', socket.id);
            useGameStore.getState().setPlayerId(socket.id ?? null);
        });

        socket.on(SocketEvent.ROOM_UPDATED, (room) => {
            console.log('ROOM_UPDATED received:', room);
            console.log('Current player index:', room?.gameData?.currentPlayerIndex, 'movesRemaining:', room?.gameData?.movesRemaining, 'diceRoll:', room?.gameData?.diceRoll);
            useGameStore.getState().setRoom(room);
            useGameStore.getState().setError(null);
        });

        socket.on(SocketEvent.GAME_STARTED, (gameData) => {
            console.log('Game started:', gameData);
        });

        socket.on(SocketEvent.ERROR, (message) => {
            console.log('Socket error:', message);
            useGameStore.getState().setError(message);
        });

        // Don't remove listeners - they should persist for the app lifetime
        return () => {
            socket.off('connect');
            socket.off(SocketEvent.ROOM_UPDATED);
            socket.off(SocketEvent.GAME_STARTED);
            socket.off(SocketEvent.ERROR);
        };
    }, []); // Empty dependency array - only run once

    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/room/:roomCode" element={<RoomPage />} />
        </Routes>
    );
}

export default App;
