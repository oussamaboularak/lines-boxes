import type { GameType } from '../../../shared/types';

export const GAME_OPTIONS: { id: GameType; label: string; description: string }[] = [
    { id: 'DOTS_AND_BOXES', label: 'Dots and Boxes', description: 'Connect dots to claim boxes' },
    { id: 'MEMORY', label: 'Memory Game', description: 'Match pairs of cards' }
];
