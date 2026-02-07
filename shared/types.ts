export type PlayerId = string;
export type RoomId = string;

export interface Player {
    id: PlayerId;
    name: string;
    score: number;
    isConnected: boolean;
    isHost: boolean;
}

export interface RoomSettings {
    gridSize: number; // e.g., 5 for 5x5 dots
    diceSides: number;
    maxPlayers: number;
}

export type GameStatus = 'LOBBY' | 'PLAYING' | 'ENDED';

export interface BaseGameState {
    status: GameStatus;
    winner: PlayerId | 'TIE' | null;
}

export interface DotsAndBoxesState extends BaseGameState {
    gameType: 'DOTS_AND_BOXES';
    playerIds: PlayerId[];
    board: {
        horizontalLines: boolean[][]; // (gridSize) x (gridSize-1)
        verticalLines: boolean[][];   // (gridSize-1) x (gridSize)
        boxes: (PlayerId | null)[][];  // (gridSize-1) x (gridSize-1)
    };
    currentPlayerIndex: number;
    diceRoll: number | null;
    movesRemaining: number;
    lastMove: {
        type: 'LINE' | 'DICE';
        playerId: PlayerId;
        details?: any;
    } | null;
}

export type GameState = DotsAndBoxesState; // Expand as more games are added

export interface Room {
    id: RoomId;
    code: string;
    hostId: PlayerId;
    settings: RoomSettings;
    players: Player[];
    status: GameStatus;
    gameData: GameState | null;
}

// Socket Events
export enum SocketEvent {
    // Client -> Server
    CREATE_ROOM = 'CREATE_ROOM',
    JOIN_ROOM = 'JOIN_ROOM',
    START_GAME = 'START_GAME',
    ROLL_DICE = 'ROLL_DICE',
    PLACE_LINE = 'PLACE_LINE',
    LEAVE_ROOM = 'LEAVE_ROOM',

    // Server -> Client
    ROOM_UPDATED = 'ROOM_UPDATED',
    GAME_STARTED = 'GAME_STARTED',
    DICE_ROLLED = 'DICE_ROLLED',
    LINE_PLACED = 'LINE_PLACED',
    BOX_COMPLETED = 'BOX_COMPLETED',
    TURN_CHANGED = 'TURN_CHANGED',
    GAME_ENDED = 'GAME_ENDED',
    PLAYER_DISCONNECTED = 'PLAYER_DISCONNECTED',
    ERROR = 'ERROR'
}
