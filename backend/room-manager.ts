import { randomInt } from 'crypto';
import { Server, Socket } from 'socket.io';
import { Room, Player, SocketEvent, RoomSettings, RpsChoice, GameType, FourChiffreState, WordGuesserState, MotusState, ChainesLogiqueState, MrWhiteState } from '../shared/types.js';
import { DotsAndBoxesGame } from './games/dots-and-boxes.js';
import { MemoryGame } from './games/memory-game.js';
import { FourChiffreGame } from './games/four-chiffre.js';
import { WordGuesserGame } from './games/word-guesser.js';
import { MotusGame } from './games/motus.js';
import { ChainesLogiqueGame } from './games/chaines-logique.js';
import { MrWhiteGame } from './games/mr-white-game.js';
import { v4 as uuidv4 } from 'uuid';

export class RoomManager {
    private rooms: Map<string, Room> = new Map();
    private playerToRoom: Map<string, string> = new Map();
    /** Secrets for FOUR_CHIFFRE (roomId -> playerId -> secret), never sent to client */
    private fourChiffreSecrets: Map<string, Record<string, string>> = new Map();
    /** Words for WORD_GUESSER (roomId -> playerId -> word), never sent to client */
    private wordGuesserWords: Map<string, Record<string, string>> = new Map();
    /** Targets for MOTUS (roomId -> target word), never sent to client */
    private motusTargets: Map<string, string> = new Map();
    /** Words for CHAINES_LOGIQUE (roomId -> playerId -> [words]), never sent to client */
    private chainesLogiqueWords: Map<string, Record<string, string[]>> = new Map();

    constructor(private io: Server) { }

    createRoom(socket: Socket, data: { settings: RoomSettings; name?: string; clientId?: string; avatar?: string }) {
        const roomId = uuidv4();
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const player: Player = {
            id: socket.id,
            clientId: data.clientId,
            avatar: data.avatar,
            name: data.name || 'Player 1',
            score: 0,
            isConnected: true,
            isHost: true,
            colorIndex: 0 // Host gets first color
        };

        const defaultSettings: RoomSettings = {
            gameType: (data.settings?.gameType as GameType) || 'DOTS_AND_BOXES',
            gridSize: data.settings?.gridSize ?? 5,
            diceSides: data.settings?.diceSides ?? 6,
            maxPlayers: data.settings?.maxPlayers ?? 4,
            pairCount: data.settings?.pairCount ?? 8,
            chainesCount: data.settings?.chainesCount ?? 5
        };

        const room: Room = {
            id: roomId,
            code: roomCode,
            hostId: socket.id,
            settings: { ...defaultSettings, ...data.settings },
            players: [player],
            status: 'LOBBY',
            gameData: null
        };

        this.rooms.set(roomId, room);
        this.playerToRoom.set(socket.id, roomId);
        socket.join(roomId);

        // Emit to the room (which currently only has this socket)
        this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
    }

    joinRoom(socket: Socket, { code, name, clientId, avatar }: { code: string; name: string; clientId?: string; avatar?: string }) {
        const room = Array.from(this.rooms.values()).find(r => r.code === code);

        if (!room) {
            socket.emit(SocketEvent.ERROR, 'Room not found');
            return;
        }

        // Check if player is reconnecting: match by clientId first (persists across reload), then by name
        const existingPlayer = (clientId && room.players.find(p => p.clientId === clientId))
            || room.players.find(p => p.name === name);

        if (existingPlayer) {
            // Player is reconnecting - update their socket ID everywhere
            const oldSocketId = existingPlayer.id;
            existingPlayer.id = socket.id;
            existingPlayer.isConnected = true;
            if (avatar) existingPlayer.avatar = avatar;

            // Update hostId if host reconnected
            if (room.hostId === oldSocketId) {
                room.hostId = socket.id;
            }

            // Update gameData.playerIds so game logic recognizes the reconnected player
            if (room.gameData && 'playerIds' in room.gameData) {
                const playerIds = room.gameData.playerIds as string[];
                const idx = playerIds.indexOf(oldSocketId);
                if (idx !== -1) {
                    playerIds[idx] = socket.id;
                }
            }
            // Update FOUR_CHIFFRE secrets key if reconnecting
            const secrets = this.fourChiffreSecrets.get(room.id);
            if (secrets && secrets[oldSocketId]) {
                secrets[socket.id] = secrets[oldSocketId];
                delete secrets[oldSocketId];
            }
            // Update WORD_GUESSER words key if reconnecting
            const wgWords = this.wordGuesserWords.get(room.id);
            if (wgWords && wgWords[oldSocketId]) {
                wgWords[socket.id] = wgWords[oldSocketId];
                delete wgWords[oldSocketId];
            }

            // Update Memory game scores key for reconnected player
            if (room.gameData && room.gameData.gameType === 'MEMORY' && 'scores' in room.gameData) {
                const scores = room.gameData.scores as Record<string, number>;
                if (scores[oldSocketId] !== undefined) {
                    scores[socket.id] = scores[oldSocketId];
                    delete scores[oldSocketId];
                }
            }

            // Update boxes owner IDs so box colors display correctly after reconnect
            if (room.gameData && 'board' in room.gameData && room.gameData.board?.boxes) {
                const boxes = room.gameData.board.boxes as (string | null)[][];
                for (const row of boxes) {
                    for (let c = 0; c < row.length; c++) {
                        if (row[c] === oldSocketId) {
                            row[c] = socket.id;
                        }
                    }
                }
            }

            // Update playerToRoom mapping
            this.playerToRoom.delete(oldSocketId);
            this.playerToRoom.set(socket.id, room.id);
            socket.join(room.id);

            // Notify all players in the room
            this.io.to(room.id).emit(SocketEvent.ROOM_UPDATED, room);
            return;
        }

        if (room.players.length >= room.settings.maxPlayers) {
            socket.emit(SocketEvent.ERROR, 'Room is full');
            return;
        }
        // Add new player
        const newPlayer: Player = {
            id: socket.id,
            clientId,
            avatar,
            name,
            score: 0,
            isConnected: true,
            isHost: false,
            colorIndex: room.players.length // Assign next available color
        };
        room.players.push(newPlayer);
        this.playerToRoom.set(socket.id, room.id);
        socket.join(room.id);

        this.io.to(room.id).emit(SocketEvent.ROOM_UPDATED, room);
    }

    updateRoomSettings(socket: Socket, data: { settings: Partial<RoomSettings> }) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.hostId !== socket.id || room.status !== 'LOBBY') return;

        const { gameType, gridSize, maxPlayers, pairCount, secretSize, motusLang, chainesCount } = data.settings || {};
        if (gameType !== undefined && ['DOTS_AND_BOXES', 'MEMORY', 'FOUR_CHIFFRE', 'WORD_GUESSER', 'MOTUS', 'CHAINES_LOGIQUE', 'MR_WHITE'].includes(gameType)) {
            room.settings.gameType = gameType as GameType;
            if ((gameType as GameType) === 'FOUR_CHIFFRE') {
                if (room.settings.maxPlayers > 2) room.settings.maxPlayers = 2;
                if (room.settings.secretSize === undefined) room.settings.secretSize = 4;
            }
            if ((gameType as GameType) === 'WORD_GUESSER') {
                if (room.settings.maxPlayers > 2) room.settings.maxPlayers = 2;
            }
            if ((gameType as GameType) === 'MOTUS') {
                // Motus can be played solo or with multiple players; keep existing maxPlayers.
                if (!room.settings.motusLang) {
                    room.settings.motusLang = 'en';
                }
            }
            if ((gameType as GameType) === 'CHAINES_LOGIQUE') {
                if (room.settings.maxPlayers > 2) room.settings.maxPlayers = 2;
                if (room.settings.chainesCount === undefined) room.settings.chainesCount = 5;
            }
            if ((gameType as GameType) === 'MR_WHITE') {
                if (room.settings.maxPlayers < 4) room.settings.maxPlayers = 4;
            }
        }
        if (gridSize !== undefined) {
            if ([5, 6, 8].includes(gridSize)) {
                room.settings.gridSize = gridSize;
            }
        }
        if (maxPlayers !== undefined) {
            if (maxPlayers >= 2 && maxPlayers <= 10 && maxPlayers >= room.players.length) {
                room.settings.maxPlayers = maxPlayers;
            }
        }
        if (pairCount !== undefined && room.settings.gameType === 'MEMORY') {
            const n = Number(pairCount);
            if (!Number.isNaN(n) && n >= 4 && n <= 40) {
                room.settings.pairCount = n;
            }
        }
        if (secretSize !== undefined && room.settings.gameType === 'FOUR_CHIFFRE') {
            if ([4, 5, 6].includes(secretSize)) {
                room.settings.secretSize = secretSize;
            }
        }
        if (motusLang !== undefined && room.settings.gameType === 'MOTUS') {
            if (motusLang === 'en' || motusLang === 'fr') {
                room.settings.motusLang = motusLang;
            }
        }
        if (chainesCount !== undefined && room.settings.gameType === 'CHAINES_LOGIQUE') {
            const n = Number(chainesCount);
            if (!Number.isNaN(n) && n >= 3 && n <= 10) {
                room.settings.chainesCount = n;
            }
        }

        this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
    }

    private readonly VALID_AVATARS = ['buggs-bunny', 'hellokitty', 'jerry', 'tom', 'woody', 'duffy'];

    updateAvatar(socket: Socket, avatar: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'LOBBY') return;

        if (!this.VALID_AVATARS.includes(avatar)) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player) {
            player.avatar = avatar;
            this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
        }
    }

    resetToLobby(socket: Socket) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || (room.status !== 'ENDED' && room.status !== 'CHOOSING_FIRST')) return;

        room.status = 'LOBBY';
        room.gameData = null;
        room.rpsPicks = undefined;
        this.fourChiffreSecrets.delete(roomId);
        this.wordGuesserWords.delete(roomId);
        this.motusTargets.delete(roomId);
        room.players.forEach(p => { p.score = 0; });

        this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
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
        if (room.settings.gameType === 'FOUR_CHIFFRE' && room.players.length > 2) {
            socket.emit(SocketEvent.ERROR, '4 Chiffres is for 2 players only');
            return;
        }
        if (room.settings.gameType === 'WORD_GUESSER' && room.players.length > 2) {
            socket.emit(SocketEvent.ERROR, 'Word Guesser is for 2 players only');
            return;
        }
        if (room.settings.gameType === 'CHAINES_LOGIQUE' && room.players.length > 2) {
            socket.emit(SocketEvent.ERROR, 'Chaines Logique is for 2 players only');
            return;
        }
        if (room.settings.gameType === 'MR_WHITE' && room.players.length < 4) {
            socket.emit(SocketEvent.ERROR, 'Mr White requires at least 4 players');
            return;
        }

        // Enter Rock Paper Scissors phase to decide who goes first
        room.status = 'CHOOSING_FIRST';
        room.rpsPicks = {};
        room.gameData = null;

        this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
    }

    async handleRpsPick(socket: Socket, choice: RpsChoice) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'CHOOSING_FIRST' || !room.rpsPicks) return;

        const player = room.players.find(p => p.id === socket.id);
        if (!player || !player.isConnected) return;

        if (room.rpsPicks[socket.id]) return; // Already picked

        room.rpsPicks[socket.id] = choice;

        const connectedPlayers = room.players.filter(p => p.isConnected);
        if (Object.keys(room.rpsPicks).length < connectedPlayers.length) {
            this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            return;
        }

        // All have picked - resolve order and start game
        const orderedPlayerIds = this.resolveRpsOrder(room);
        room.status = 'PLAYING';
        room.rpsPicks = undefined;

        const gameType = room.settings.gameType || 'DOTS_AND_BOXES';
        if (gameType === 'MEMORY') {
            const game = new MemoryGame(orderedPlayerIds, room.settings);
            room.gameData = game.getState();
            room.players.forEach((p) => {
                p.score = (room.gameData as any).scores?.[p.id] ?? 0;
            });
        } else if (gameType === 'FOUR_CHIFFRE') {
            const game = new FourChiffreGame(orderedPlayerIds.slice(0, 2), room.settings);
            room.gameData = game.getState();
            this.fourChiffreSecrets.set(roomId, {});
        } else if (gameType === 'WORD_GUESSER') {
            const game = new WordGuesserGame(orderedPlayerIds.slice(0, 2), room.settings);
            room.gameData = game.getState();
            this.wordGuesserWords.set(roomId, {});
        } else if (gameType === 'MOTUS') {
            const game = await MotusGame.create(orderedPlayerIds, room.settings);
            room.gameData = game.getState();
            this.motusTargets.set(roomId, game.getTarget());
        } else if (gameType === 'CHAINES_LOGIQUE') {
            const game = new ChainesLogiqueGame(orderedPlayerIds.slice(0, 2), room.settings);
            room.gameData = game.getState();
            this.chainesLogiqueWords.set(roomId, {});
        } else if (gameType === 'MR_WHITE') {
            const game = new MrWhiteGame(orderedPlayerIds, room.settings);
            room.gameData = game.getState();
        } else {
            const game = new DotsAndBoxesGame(orderedPlayerIds, room.settings);
            room.gameData = game.getState();
        }

        this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
        this.io.to(roomId).emit(SocketEvent.GAME_STARTED, room.gameData);
    }

    private resolveRpsOrder(room: Room): string[] {
        const picks = room.rpsPicks!;
        const players = room.players.filter(p => p.isConnected);

        const beats: Record<RpsChoice, RpsChoice> = {
            ROCK: 'SCISSORS',
            PAPER: 'ROCK',
            SCISSORS: 'PAPER'
        };

        // Score each player: how many opponents they beat
        const scores: Record<string, number> = {};
        for (const p of players) {
            scores[p.id] = 0;
            const myChoice = picks[p.id];
            if (!myChoice) continue;
            for (const other of players) {
                if (other.id === p.id) continue;
                const theirChoice = picks[other.id];
                if (theirChoice && beats[myChoice] === theirChoice) {
                    scores[p.id]++;
                }
            }
        }

        const maxScore = Math.max(...Object.values(scores));
        const winners = players.filter(p => scores[p.id] === maxScore);

        // Winner(s) go first (random among ties), then others in original order
        const first = winners[randomInt(0, winners.length)];
        const rest = players.filter(p => p.id !== first.id);
        return [first.id, ...rest.map(p => p.id)];
    }

    handleGameMove(socket: Socket, move: any) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData) return;

        const gameType = room.gameData.gameType;

        try {
            if (gameType === 'FOUR_CHIFFRE') {
                // Handled by handleSetSecret and handleGuessNumber
                return;
            }
            if (gameType === 'MEMORY') {
                const game = new MemoryGame(room.players.map(p => p.id), room.settings, room.gameData as any);
                const result = game.applyMove(socket.id, move);
                room.gameData = game.getState();
                const finalScores = game.getScores();
                room.players.forEach(p => { p.score = finalScores[p.id] || 0; });

                if (game.isGameOver()) {
                    room.status = 'ENDED';
                    this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                    this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
                } else {
                    this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);

                    if (result.matched === false && room.gameData && room.gameData.gameType === 'MEMORY') {
                        const memState = room.gameData as any;
                        if (memState.revealed && memState.revealed.length === 2) {
                            const playerIds = memState.playerIds as string[];
                            setTimeout(() => {
                                const r = this.rooms.get(roomId);
                                if (!r || r.status !== 'PLAYING' || !r.gameData) return;
                                const state = r.gameData as any;
                                if (state.gameType !== 'MEMORY' || !state.revealed || state.revealed.length !== 2) return;
                                state.revealed = [];
                                state.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerIds.length;
                                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, r);
                            }, 2200);
                        }
                    }
                }
            } else {
                const game = new DotsAndBoxesGame(room.players.map(p => p.id), room.settings, room.gameData as any);
                const result = game.applyMove(socket.id, move);
                room.gameData = game.getState();
                const finalScores = game.getScores();
                room.players.forEach(p => { p.score = finalScores[p.id] || 0; });

                if (game.isGameOver()) {
                    room.status = 'ENDED';
                    this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                    this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
                } else {
                    this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                }
            }
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleSetSecret(socket: Socket, secret: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'FOUR_CHIFFRE') return;

        const state = room.gameData as FourChiffreState;
        const playerIds = state.playerIds;
        if (!playerIds.includes(socket.id)) return;

        try {
            const game = new FourChiffreGame(playerIds, room.settings, state);
            game.applySetSecret(socket.id, secret);
            const secrets = this.fourChiffreSecrets.get(roomId) ?? {};
            secrets[socket.id] = secret;
            this.fourChiffreSecrets.set(roomId, secrets);
            room.gameData = game.getState();
            this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleGuessNumber(socket: Socket, guess: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'FOUR_CHIFFRE') return;

        const state = room.gameData as FourChiffreState;
        const playerIds = state.playerIds;
        if (!playerIds.includes(socket.id)) return;

        try {
            const game = new FourChiffreGame(playerIds, room.settings, state);
            const secrets = this.fourChiffreSecrets.get(roomId) ?? {};
            game.setSecrets(secrets);
            game.applyGuess(socket.id, guess);
            room.gameData = game.getState();

            if (game.isGameOver()) {
                room.status = 'ENDED';
                this.fourChiffreSecrets.delete(roomId);
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
            } else {
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            }
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleSetWord(socket: Socket, word: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'WORD_GUESSER') return;

        const state = room.gameData as WordGuesserState;
        if (!state.playerIds.includes(socket.id)) return;

        try {
            const game = new WordGuesserGame(state.playerIds, room.settings, state);
            const words = this.wordGuesserWords.get(roomId) ?? {};
            game.setWords(words);
            game.applySetWord(socket.id, word);
            words[socket.id] = word.trim().toLowerCase();
            this.wordGuesserWords.set(roomId, words);
            room.gameData = game.getState();
            this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleGuessLetter(socket: Socket, letter: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'WORD_GUESSER') return;

        const state = room.gameData as WordGuesserState;
        if (!state.playerIds.includes(socket.id)) return;

        try {
            const game = new WordGuesserGame(state.playerIds, room.settings, state);
            const words = this.wordGuesserWords.get(roomId) ?? {};
            game.setWords(words);
            game.applyGuessLetter(socket.id, letter);
            room.gameData = game.getState();

            if (game.isGameOver()) {
                room.status = 'ENDED';
                this.wordGuesserWords.delete(roomId);
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
            } else {
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            }
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    async handleMotusGuess(socket: Socket, guess: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'MOTUS') return;

        const state = room.gameData as MotusState;
        if (!state.playerIds.includes(socket.id)) return;

        try {
            const target = this.motusTargets.get(roomId);
            if (!target) {
                throw new Error('Motus target not found');
            }
            const game = MotusGame.fromExisting(state, target, room.settings);
            await game.applyGuess(socket.id, guess);
            room.gameData = game.getState();

            if (room.gameData.status === 'ENDED') {
                room.status = 'ENDED';
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
            } else {
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            }
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleSetChaines(socket: Socket, principalWord: string, secondaryWords: string[]) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'CHAINES_LOGIQUE') return;

        const state = room.gameData as ChainesLogiqueState;
        if (!state.playerIds.includes(socket.id)) return;

        try {
            const game = new ChainesLogiqueGame(state.playerIds, room.settings, state);
            const words = this.chainesLogiqueWords.get(roomId) ?? {};
            game.setFullWords(words);
            game.applySetWords(socket.id, principalWord, secondaryWords);
            words[socket.id] = secondaryWords.map(w => w.toUpperCase());
            this.chainesLogiqueWords.set(roomId, words);
            room.gameData = game.getState();
            this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleGuessChaine(socket: Socket, word: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'CHAINES_LOGIQUE') return;

        const state = room.gameData as ChainesLogiqueState;
        const playerIds = state.playerIds;
        if (!playerIds.includes(socket.id)) return;

        try {
            const game = new ChainesLogiqueGame(playerIds, room.settings, state);
            const words = this.chainesLogiqueWords.get(roomId) ?? {};
            game.setFullWords(words);
            game.applyGuess(socket.id, word);
            room.gameData = game.getState();

            if (game.isGameOver()) {
                room.status = 'ENDED';
                this.chainesLogiqueWords.delete(roomId);
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
            } else {
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            }
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleMrWhiteClue(socket: Socket, text: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'MR_WHITE') return;

        const state = room.gameData as MrWhiteState;
        if (!state.playerIds.includes(socket.id)) return;

        try {
            const game = new MrWhiteGame(state.playerIds, room.settings, state);
            game.applyClue(socket.id, text);
            room.gameData = game.getState();
            this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleMrWhiteVote(socket: Socket, votedId: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'MR_WHITE') return;

        const state = room.gameData as MrWhiteState;

        // HACK: Handle "START_VOTING" trigger from Host during Discussion
        if (votedId === 'START_VOTING') {
            if (room.hostId !== socket.id) return;
            if (state.phase !== 'DISCUSSION_PHASE') return;

            try {
                const game = new MrWhiteGame(state.playerIds, room.settings, state);
                game.endDiscussion();
                room.gameData = game.getState();
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            } catch (error: any) {
                socket.emit(SocketEvent.ERROR, error.message);
            }
            return;
        }

        if (!state.playerIds.includes(socket.id)) return;

        try {
            const game = new MrWhiteGame(state.playerIds, room.settings, state);
            game.applyVote(socket.id, votedId);
            room.gameData = game.getState();

            if (game.isGameOver()) {
                room.status = 'ENDED';
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
                this.io.to(roomId).emit(SocketEvent.GAME_ENDED, room.gameData);
            } else {
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
            }
        } catch (error: any) {
            socket.emit(SocketEvent.ERROR, error.message);
        }
    }

    handleMrWhiteGuess(socket: Socket, guess: string) {
        const roomId = this.playerToRoom.get(socket.id);
        if (!roomId) return;

        const room = this.rooms.get(roomId);
        if (!room || room.status !== 'PLAYING' || !room.gameData || room.gameData.gameType !== 'MR_WHITE') return;

        const state = room.gameData as MrWhiteState;
        if (socket.id !== state.mrWhiteId) return;

        try {
            const game = new MrWhiteGame(state.playerIds, room.settings, state);
            game.applyMrWhiteGuess(guess);
            room.gameData = game.getState();

            if (game.isGameOver()) {
                room.status = 'ENDED';
                this.io.to(roomId).emit(SocketEvent.ROOM_UPDATED, room);
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
