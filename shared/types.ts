export type PlayerId = string;
export type RoomId = string;

export interface Player {
    id: PlayerId;
    clientId?: string; // Persistent ID from localStorage - survives browser reload
    avatar?: string; // Character icon id (e.g. 'buggs-bunny', 'jerry', 'tom', 'hellokitty')
    name: string;
    score: number;
    isConnected: boolean;
    isHost: boolean;
    colorIndex: number; // Stable color assignment (0-3)
}

export type GameType = 'DOTS_AND_BOXES' | 'MEMORY' | 'FOUR_CHIFFRE';

export interface RoomSettings {
    gameType: GameType;
    gridSize: number; // e.g., 5 for 5x5 dots (DOTS_AND_BOXES)
    diceSides: number;
    maxPlayers: number;
    pairCount?: number; // 4-40 pairs for MEMORY game (20 images reused)
    secretSize?: number; // 4, 5, or 6 digits for FOUR_CHIFFRE
}

export type GameStatus = 'LOBBY' | 'CHOOSING_FIRST' | 'PLAYING' | 'ENDED';

export type RpsChoice = 'ROCK' | 'PAPER' | 'SCISSORS';

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

/** Card index in shuffled deck. cards[i] is the image id (1-20). Face-up cards are in revealed. */
export interface MemoryGameState extends BaseGameState {
    gameType: 'MEMORY';
    playerIds: PlayerId[];
    cards: number[]; // shuffled card ids (each id appears twice for pairs)
    revealed: number[]; // indices of currently face-up cards (0 or 2)
    matched: number[]; // indices of matched pairs
    currentPlayerIndex: number;
    scores: Record<PlayerId, number>;
}

/** Phase: enter 4-digit secret, then take turns guessing opponent's number. */
export type FourChiffrePhase = 'ENTER_SECRET' | 'GUESSING';

export interface FourChiffreGuessEntry {
    guesserId: PlayerId;
    targetId: PlayerId;
    guess: string;
    correctDigits: number;
    correctPlace: number;
}

export interface FourChiffreState extends BaseGameState {
    gameType: 'FOUR_CHIFFRE';
    playerIds: PlayerId[];
    phase: FourChiffrePhase;
    secretSet: Record<PlayerId, boolean>; // whether each player has submitted their secret (secrets never sent to client)
    guessHistory: FourChiffreGuessEntry[];
    currentPlayerIndex: number;
}

export type GameState = DotsAndBoxesState | MemoryGameState | FourChiffreState;

export interface Room {
    id: RoomId;
    code: string;
    hostId: PlayerId;
    settings: RoomSettings;
    players: Player[];
    status: GameStatus;
    gameData: GameState | null;
    rpsPicks?: Partial<Record<PlayerId, RpsChoice>>; // Used during CHOOSING_FIRST
}

// Socket Events
export enum SocketEvent {
    // Client -> Server
    CREATE_ROOM = 'CREATE_ROOM',
    JOIN_ROOM = 'JOIN_ROOM',
    UPDATE_ROOM_SETTINGS = 'UPDATE_ROOM_SETTINGS',
    UPDATE_AVATAR = 'UPDATE_AVATAR',
    RESET_TO_LOBBY = 'RESET_TO_LOBBY',
    START_GAME = 'START_GAME',
    RPS_PICK = 'RPS_PICK',
    ROLL_DICE = 'ROLL_DICE',
    PLACE_LINE = 'PLACE_LINE',
    SELECT_GAME = 'SELECT_GAME',
    FLIP_CARD = 'FLIP_CARD',
    SET_SECRET = 'SET_SECRET',
    GUESS_NUMBER = 'GUESS_NUMBER',
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
