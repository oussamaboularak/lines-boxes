import { randomInt } from 'crypto';
import { MemoryGameState, PlayerId, RoomSettings, SocketEvent } from '../../shared/types.js';

const MEMORY_CARD_IDS = Array.from({ length: 20 }, (_, i) => i + 1); // 1-20

function shuffle<T>(arr: T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

export class MemoryGame {
    private state: MemoryGameState;

    constructor(playerIds: PlayerId[], settings: RoomSettings, existingState?: MemoryGameState) {
        if (existingState) {
            this.state = existingState;
        } else {
            const pairCount = Math.min(40, Math.max(4, settings.pairCount ?? 8));
            // Use 20 images, repeating as needed for pairCount (e.g. 40 pairs = each image used twice)
            const selectedIds: number[] = [];
            for (let i = 0; i < pairCount; i++) {
                selectedIds.push(MEMORY_CARD_IDS[i % MEMORY_CARD_IDS.length]);
            }
            const shuffledIds = shuffle(selectedIds);
            const pairs = [...shuffledIds, ...shuffledIds];
            const cards = shuffle(pairs);

            const scores: Record<PlayerId, number> = {};
            playerIds.forEach((id) => { scores[id] = 0; });

            this.state = {
                gameType: 'MEMORY',
                playerIds,
                status: 'PLAYING',
                winner: null,
                cards,
                revealed: [],
                matched: [],
                currentPlayerIndex: 0,
                scores
            };
        }
    }

    getState(): MemoryGameState {
        return this.state;
    }

    applyMove(playerId: PlayerId, move: { type: string; cardIndex?: number }): { matched?: boolean; gameOver?: boolean } {
        const players = this.state.playerIds;
        const currentPlayerId = players[this.state.currentPlayerIndex];

        if (playerId !== currentPlayerId) {
            throw new Error('Not your turn');
        }

        if (move.type === SocketEvent.FLIP_CARD) {
            const cardIndex = move.cardIndex;
            if (cardIndex === undefined || cardIndex < 0 || cardIndex >= this.state.cards.length) {
                throw new Error('Invalid card index');
            }

            if (this.state.revealed.includes(cardIndex) || this.state.matched.includes(cardIndex)) {
                throw new Error('Card already revealed or matched');
            }

            if (this.state.revealed.length >= 2) {
                throw new Error('Must wait for reveal to complete');
            }

            this.state.revealed.push(cardIndex);

            if (this.state.revealed.length === 2) {
                const [a, b] = this.state.revealed;
                const cardA = this.state.cards[a];
                const cardB = this.state.cards[b];

                if (cardA === cardB) {
                    this.state.matched.push(a, b);
                    this.state.scores[playerId] = (this.state.scores[playerId] || 0) + 1;
                    this.state.revealed = [];
                    const gameOver = this.checkGameOver();
                    if (gameOver) {
                        this.state.status = 'ENDED';
                        this.state.winner = this.calculateWinner();
                    }
                    return { matched: true, gameOver };
                } else {
                    // Keep both cards visible; room-manager will clear revealed and advance turn after delay
                    return { matched: false };
                }
            }

            return {};
        }

        throw new Error('Invalid move type');
    }

    private checkGameOver(): boolean {
        return this.state.matched.length === this.state.cards.length;
    }

    private calculateWinner(): PlayerId | 'TIE' {
        const scores = this.state.scores;
        let maxScore = -1;
        let winner: PlayerId | null = null;
        let tie = false;

        for (const [pid, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                winner = pid;
                tie = false;
            } else if (score === maxScore) {
                tie = true;
            }
        }

        return tie ? 'TIE' : (winner as PlayerId);
    }

    getScores(): Record<string, number> {
        return { ...this.state.scores };
    }

    isGameOver(): boolean {
        return this.state.status === 'ENDED';
    }
}
