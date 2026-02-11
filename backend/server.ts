import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { SocketEvent, RoomSettings, RpsChoice, GameType } from '../shared/types.js';
import { RoomManager } from './room-manager.js';

const app = express();
app.use(cors());

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const roomManager = new RoomManager(io);

io.on('connection', (socket: Socket) => {
    console.log('User connected:', socket.id);

    socket.on(SocketEvent.CREATE_ROOM, (data: { settings: RoomSettings; name?: string; clientId?: string; avatar?: string }) => {
        roomManager.createRoom(socket, data);
    });

    socket.on(SocketEvent.JOIN_ROOM, (data: { code: string; name: string; clientId?: string; avatar?: string }) => {
        roomManager.joinRoom(socket, data);
    });

    socket.on(SocketEvent.UPDATE_ROOM_SETTINGS, (data: { settings: Partial<RoomSettings> }) => {
        roomManager.updateRoomSettings(socket, data);
    });

    socket.on(SocketEvent.UPDATE_AVATAR, (avatar: string) => {
        roomManager.updateAvatar(socket, avatar);
    });

    socket.on(SocketEvent.RESET_TO_LOBBY, () => {
        roomManager.resetToLobby(socket);
    });

    socket.on(SocketEvent.START_GAME, () => {
        roomManager.startGame(socket);
    });

    socket.on(SocketEvent.RPS_PICK, (choice: RpsChoice) => {
        roomManager.handleRpsPick(socket, choice);
    });

    socket.on(SocketEvent.ROLL_DICE, () => {
        roomManager.handleGameMove(socket, { type: SocketEvent.ROLL_DICE });
    });

    socket.on(SocketEvent.PLACE_LINE, (moveData: any) => {
        roomManager.handleGameMove(socket, { type: SocketEvent.PLACE_LINE, ...moveData });
    });

    socket.on(SocketEvent.SELECT_GAME, (gameType: GameType) => {
        roomManager.updateRoomSettings(socket, { settings: { gameType } });
    });

    socket.on(SocketEvent.FLIP_CARD, (cardIndex: number) => {
        roomManager.handleGameMove(socket, { type: SocketEvent.FLIP_CARD, cardIndex });
    });

    socket.on(SocketEvent.SET_SECRET, (secret: string) => {
        roomManager.handleSetSecret(socket, secret);
    });

    socket.on(SocketEvent.GUESS_NUMBER, (guess: string) => {
        roomManager.handleGuessNumber(socket, guess);
    });

    socket.on(SocketEvent.SET_WORD, (word: string) => {
        roomManager.handleSetWord(socket, word);
    });

    socket.on(SocketEvent.GUESS_LETTER, (letter: string) => {
        roomManager.handleGuessLetter(socket, letter);
    });

    socket.on(SocketEvent.MOTUS_GUESS, (guess: string) => {
        roomManager.handleMotusGuess(socket, guess);
    });

    socket.on(SocketEvent.SET_CHAINES, (data: { principalWord: string; secondaryWords: string[] }) => {
        roomManager.handleSetChaines(socket, data.principalWord, data.secondaryWords);
    });

    socket.on(SocketEvent.GUESS_CHAINE, (word: string) => {
        roomManager.handleGuessChaine(socket, word);
    });

    socket.on(SocketEvent.SUBMIT_CLUE, (text: string) => {
        roomManager.handleMrWhiteClue(socket, text);
    });

    socket.on(SocketEvent.SUBMIT_VOTE, (votedId: string) => {
        roomManager.handleMrWhiteVote(socket, votedId);
    });

    socket.on(SocketEvent.MR_WHITE_GUESS, (guess: string) => {
        roomManager.handleMrWhiteGuess(socket, guess);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        roomManager.handleDisconnect(socket);
    });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
