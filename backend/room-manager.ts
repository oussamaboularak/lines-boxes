import { Server, Socket } from 'socket.io';
import { Room, Player, RoomId, SocketEvent, GameStatus, RoomSettings } from '../shared/types.js';
import { DotsAndBoxesGame } from './games/dots-and-boxes.js';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private playerToRoom: Map<string, string> = new Map();

    constructor(private io: Server) { }

    createRoom(socket: Socket, settings: RoomSettings) {
        const roomId = uuidv4();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const player: Player = {
            id: socket.id,
            name: `Player 1`,
            score: 0,
            isConnected: true,
            isHost: true
        };

        const room: Room = {
            id: roomId,
            code: roomCode,
            hostId: socket.id,
            settings: settings || { gridSize: 5, diceSides: 6, maxPlayers: 2 },
            players: [player],
            status: 'LOBBY',
            gameData: null
        };

        this.rooms.set(roomId, room);
        this.playerToRoom.set(socket.id, roomId);
        socket.join(roomId);

        socket.emit(SocketEvent.ROOM_UPDATED, room);
    }

    joinRoom(socket: Socket, { code, name }: { code: string; name: string }) {
        const room = Array.from(this.rooms.values()).find(r => r.code === code);

        if (!room) {
            socket.emit(SocketEvent.ERROR, 'Room not found');
            return;
        }

        if (room.players.length >= room.settings.maxPlayers) {
            socket.emit(SocketEvent.ERROR, 'Room is full');
            return;
        }

        const player: Player = {
            id: socket.id,
            name: name || `Player ${room.players.length + 1}`,
            score: 0,
            isConnected: true,
            isHost: false
        };

        room.players.push(player);
        this.playerToRoom.set(socket.id, room.id);
        socket.join(room.id);

        this.io.to(room.id).emit(SocketEvent.ROOM_UPDATED, room);
    }

    startGame(socket: Socket) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== socket.id) return;

        if (room.players.length < 2) {
            socket.emit(SocketEvent.ERROR, 'Need at least 2 players to start');
            return;
        }

        // Initialize Dots and Boxes game
        const game = new DotsAndBoxesGame(room.players.map(p => p.id), room.settings);
        room.gameData = game.getState();
        room.status = 'PLAYING';

        this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
        this.io.to(roomId).emit(SocketEvent.GAME_STARTED, room.gameData);
    }

    handleGameMove(socket: Socket, move: any) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData) return;

        // We'll need a way to apply moves to the game state
        // For now, let's assume we have a game helper
        const game = new DotsAndBoxesGame(room.players.map(p => p.id), room.settings, room.gameData);

        try {
            const result = game.applyMove(socket.id, move);
            room.gameData = game.getState();

            // Update scores in room players
            const finalScores = game.getScores();
            room.players.forEach(p => {
                p.score = finalScores[p.id] || 0;
            });

            if (game.isGameOver()) {
                room.status = 'ENDED';
                this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
            } else {
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            }
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleDisconnect(socket: Socket) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.isConnected = false;
        }

        // Check if everyone is disconnected
        const anyConnected = room.players.some(p => p.isConnected);
        if (!anyConnected) {
            this.rooms.delete(roomId);
        } else {
            this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            this.io.to(roomId).emit(SocketEvent.PLAYER_DISCONNECTED, socket.id);
        }

        this.playerToRoom.delete(socket.id);
    }
}
