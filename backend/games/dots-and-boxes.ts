import { DotsAndBoxesState, PlayerId, RoomSettings, SocketEvent } from '../../shared/types.js';

export class DotsAndBoxesGame {
    private state: DotsAndBoxesState;

    constructor(playerIds: PlayerId[], settings: RoomSettings, existingState?: DotsAndBoxesState) {
        if (existingState) {
            this.state = existingState;
        } else {
            const { gridSize } = settings;
            this.state = {
                gameType: 'DOTS_AND_BOXES',
                playerIds: playerIds,
                status: 'PLAYING',
                winner: null,
                board: {
                    horizontalLines: Array(gridSize).fill(null).map(() => Array(gridSize - 1).fill(false)),
                    verticalLines: Array(gridSize - 1).fill(null).map(() => Array(gridSize).fill(false)),
                    boxes: Array(gridSize - 1).fill(null).map(() => Array(gridSize - 1).fill(null))
                },
                currentPlayerIndex: 0,
                diceRoll: null,
                movesRemaining: 0,
                lastMove: null
            };

            // Select a random first player or keep it at 0
            this.state.currentPlayerIndex = 0;
        }
    }

    getState(): DotsAndBoxesState {
        return this.state;
    }

    applyMove(playerId: PlayerId, move: any): any {
        const players = this.state.playerIds;
        const currentPlayerId = players[this.state.currentPlayerIndex];

        if (playerId !== currentPlayerId) {
            throw new Error("Not your turn");
        }

        if (move.type === SocketEvent.ROLL_DICE) {
            if (this.state.diceRoll !== null && this.state.movesRemaining > 0) {
                throw new Error("You already rolled the dice");
            }

            const sides = 6; // Default to 6 sides
            const roll = Math.floor(Math.random() * sides) + 1;
            this.state.diceRoll = roll;
            this.state.movesRemaining = roll;
            this.state.lastMove = { type: 'DICE', playerId, details: { roll } };
            return { roll };
        }

        if (move.type === SocketEvent.PLACE_LINE) {
            if (this.state.diceRoll === null || this.state.movesRemaining <= 0) {
                throw new Error("You must roll the dice first");
            }

            const { lineType, row, col } = move;
            let linePlaced = false;

            if (lineType === 'horizontal') {
                if (!this.state.board.horizontalLines[row][col]) {
                    this.state.board.horizontalLines[row][col] = true;
                    linePlaced = true;
                }
            } else if (lineType === 'vertical') {
                if (!this.state.board.verticalLines[row][col]) {
                    this.state.board.verticalLines[row][col] = true;
                    linePlaced = true;
                }
            }

            if (!linePlaced) {
                throw new Error("Line already exists or invalid move");
            }

            this.state.movesRemaining--;
            console.log('=== AFTER LINE PLACED ===');
            console.log('movesRemaining:', this.state.movesRemaining);
            console.log('currentPlayerIndex:', this.state.currentPlayerIndex);
            this.state.lastMove = { type: 'LINE', playerId, details: { lineType, row, col } };

            const completedBoxesCount = this.checkCompletedBoxes(playerId);
            console.log('=== BOX CHECK ===');
            console.log('Completed boxes:', completedBoxesCount);

            // Only switch turns if no moves remaining AFTER bonus moves
            if (this.state.movesRemaining <= 0) {
                console.log('=== SWITCHING TURNS ===');
                console.log('Old player index:', this.state.currentPlayerIndex);
                this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % players.length;
                console.log('New player index:', this.state.currentPlayerIndex);
                this.state.diceRoll = null;
            } else {
                console.log('=== PLAYER RETAINS TURN ===');
                console.log('movesRemaining:', this.state.movesRemaining);
                console.log('currentPlayerIndex:', this.state.currentPlayerIndex);
            }

            if (this.checkGameOver()) {
                this.state.status = 'ENDED';
                this.state.winner = this.calculateWinner();
            }

            return { linePlaced, completedBoxesCount };
        }

        throw new Error("Invalid move type");
    }

    private checkCompletedBoxes(playerId: PlayerId): number {
        let count = 0;
        const { horizontalLines, verticalLines, boxes } = this.state.board;
        const size = boxes.length;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (boxes[r][c] === null) {
                    // Check 4 sides
                    if (horizontalLines[r][c] && horizontalLines[r + 1][c] &&
                        verticalLines[r][c] && verticalLines[r][c + 1]) {
                        boxes[r][c] = playerId;
                        count++;
                    }
                }
            }
        }
        return count;
    }

    private checkGameOver(): boolean {
        return this.state.board.boxes.every(row => row.every(box => box !== null));
    }

    private calculateWinner(): PlayerId | 'TIE' {
        const scores: Record<string, number> = {};
        this.state.board.boxes.forEach(row => {
            row.forEach(playerId => {
                if (playerId) {
                    scores[playerId] = (scores[playerId] || 0) + 1;
                }
            });
        });

        let maxScore = -1;
        let winner: PlayerId | 'TIE' | null = null;
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
        const scores: Record<string, number> = {};
        this.state.board.boxes.forEach(row => {
            row.forEach(playerId => {
                if (playerId) {
                    scores[playerId] = (scores[playerId] || 0) + 1;
                }
            });
        });
        return scores;
    }

    isGameOver(): boolean {
        return this.state.status === 'ENDED';
    }

    private getPlayerIds(): PlayerId[] {
        return this.state.playerIds;
    }
}
