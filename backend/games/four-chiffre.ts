import {
    FourChiffreState,
    PlayerId,
    RoomSettings,
    FourChiffreGuessEntry
} from '../../shared/types.js';

function getSecretSize(settings: RoomSettings): number {
    const n = settings.secretSize ?? 4;
    return n >= 4 && n <= 6 ? n : 4;
}

function makeSecretRegex(len: number): RegExp {
    return new RegExp(`^\\d{${len}}$`);
}

function computeFeedback(secret: string, guess: string, digits: number): { correctDigits: number; correctPlace: number } {
    const secretArr = secret.split('');
    const guessArr = guess.split('');
    let correctPlace = 0;
    const secretCount: Record<string, number> = {};
    const guessCount: Record<string, number> = {};
    for (let i = 0; i < digits; i++) {
        if (secretArr[i] === guessArr[i]) correctPlace++;
        secretCount[secretArr[i]] = (secretCount[secretArr[i]] ?? 0) + 1;
        guessCount[guessArr[i]] = (guessCount[guessArr[i]] ?? 0) + 1;
    }
    let correctDigits = 0;
    for (const d of Object.keys(secretCount)) {
        correctDigits += Math.min(secretCount[d] ?? 0, guessCount[d] ?? 0);
    }
    return { correctDigits, correctPlace };
}

export class FourChiffreGame {
    private state: FourChiffreState;
    private readonly secretSize: number;
    /** Secrets stored only on server, never sent to client */
    private secrets: Record<PlayerId, string> = {};

    constructor(playerIds: PlayerId[], settings: RoomSettings, existingState?: FourChiffreState) {
        this.secretSize = getSecretSize(settings);
        if (existingState) {
            this.state = existingState;
            // secrets are not in state; must be passed separately by room-manager
        } else {
            const secretSet: Record<PlayerId, boolean> = {};
            playerIds.forEach((id) => { secretSet[id] = false; });
            this.state = {
                gameType: 'FOUR_CHIFFRE',
                playerIds,
                status: 'PLAYING',
                winner: null,
                phase: 'ENTER_SECRET',
                secretSet,
                guessHistory: [],
                currentPlayerIndex: 0
            };
        }
    }

    /** Call after restoring from state to re-inject server-held secrets */
    setSecrets(secrets: Record<PlayerId, string>) {
        this.secrets = { ...secrets };
    }

    getState(): FourChiffreState {
        return { ...this.state };
    }

    getSecrets(): Record<PlayerId, string> {
        return { ...this.secrets };
    }

    applySetSecret(playerId: PlayerId, secret: string): void {
        if (this.state.phase !== 'ENTER_SECRET') {
            throw new Error('Secret already set');
        }
        if (!this.state.playerIds.includes(playerId)) {
            throw new Error('Not a player');
        }
        if (!makeSecretRegex(this.secretSize).test(secret)) {
            throw new Error(`Secret must be exactly ${this.secretSize} digits`);
        }
        this.secrets[playerId] = secret;
        this.state.secretSet[playerId] = true;

        const allSet = this.state.playerIds.every((id) => this.state.secretSet[id]);
        if (allSet) {
            this.state.phase = 'GUESSING';
        }
    }

    applyGuess(playerId: PlayerId, guess: string): { correctDigits: number; correctPlace: number } {
        if (this.state.phase !== 'GUESSING') {
            throw new Error('Not in guessing phase');
        }
        const currentPlayerId = this.state.playerIds[this.state.currentPlayerIndex];
        if (playerId !== currentPlayerId) {
            throw new Error('Not your turn');
        }
        if (!makeSecretRegex(this.secretSize).test(guess)) {
            throw new Error(`Guess must be exactly ${this.secretSize} digits`);
        }

        const otherPlayerId = this.state.playerIds[1 - this.state.currentPlayerIndex];
        const targetSecret = this.secrets[otherPlayerId];
        if (!targetSecret) {
            throw new Error('Opponent secret not set');
        }

        const { correctDigits, correctPlace } = computeFeedback(targetSecret, guess, this.secretSize);
        const entry: FourChiffreGuessEntry = {
            guesserId: playerId,
            targetId: otherPlayerId,
            guess,
            correctDigits,
            correctPlace
        };
        this.state.guessHistory.push(entry);

        if (correctPlace === this.secretSize) {
            this.state.status = 'ENDED';
            this.state.winner = playerId;
        } else {
            this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.playerIds.length;
        }

        return { correctDigits, correctPlace };
    }

    isGameOver(): boolean {
        return this.state.status === 'ENDED';
    }

    getScores(): Record<string, number> {
        // Optional: count guesses until win; for now no score display
        return {};
    }
}
