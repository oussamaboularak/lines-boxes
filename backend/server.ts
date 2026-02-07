import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { SocketEvent } from '../shared/types.js';
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

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on(SocketEvent.CREATE_ROOM, (data) => {
        roomManager.createRoom(socket, data);
    });

    socket.on(SocketEvent.JOIN_ROOM, (data) => {
        roomManager.joinRoom(socket, data);
    });

    socket.on(SocketEvent.START_GAME, () => {
        roomManager.startGame(socket);
    });

    socket.on(SocketEvent.ROLL_DICE, () => {
        roomManager.handleGameMove(socket, { type: SocketEvent.ROLL_DICE });
    });

    socket.on(SocketEvent.PLACE_LINE, (moveData) => {
        roomManager.handleGameMove(socket, { type: SocketEvent.PLACE_LINE, ...moveData });
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
