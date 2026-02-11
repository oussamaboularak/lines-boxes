import React, { useState } from 'react';
import { socket } from '../../socket';
import { useGameStore } from '../../store';
import { SocketEvent } from '../../../../shared/types';
import type { FourChiffreState } from '../../../../shared/types';
import { Lock, Send, Eye, EyeOff } from 'lucide-react';
import { PlayerAvatar } from '../../components/PlayerAvatar';

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

type DigitMark = 'correct' | 'wrong';

export const FourChiffreGameBoard: React.FC = () => {
    const { room, playerId } = useGameStore();
    const [secretInput, setSecretInput] = useState('');
    const [guessInput, setGuessInput] = useState('');
    /** User's manual notes: green = think in secret, red = think not in secret */
    const [digitMarks, setDigitMarks] = useState<Record<number, DigitMark>>({});
    /** Copy of my secret (kept locally after submit so user can reveal it); lost on refresh */
    const [mySecret, setMySecret] = useState<string | null>(null);
    const [showMySecret, setShowMySecret] = useState(false);

    const cycleDigitMark = (d: number) => {
        setDigitMarks((prev) => {
            const current = prev[d];
            if (current === undefined) return { ...prev, [d]: 'correct' };
            if (current === 'correct') return { ...prev, [d]: 'wrong' };
            const next = { ...prev };
            delete next[d];
            return next;
        });
    };

    if (!room || !room.gameData || room.gameData.gameType !== 'FOUR_CHIFFRE') return null;

    const secretSize = room.settings.secretSize ?? 4;
    const state = room.gameData as FourChiffreState;
    const mySecretSet = state.secretSet[playerId ?? ''] ?? false;
    const otherPlayerId = state.playerIds.find((id) => id !== playerId);
    const otherSecretSet = otherPlayerId ? (state.secretSet[otherPlayerId] ?? false) : false;
    const currentPlayerId = state.playerIds[state.currentPlayerIndex];
    const isMyTurn = currentPlayerId === playerId;
    const currentPlayer = room.players.find((p) => p.id === currentPlayerId);
    const otherPlayer = room.players.find((p) => p.id === otherPlayerId);

    const secretRegex = new RegExp(`^\\d{${secretSize}}$`);
    const handleSubmitSecret = (e: React.FormEvent) => {
        e.preventDefault();
        const s = secretInput.trim();
        if (secretRegex.test(s)) {
            setMySecret(s);
            socket.emit(SocketEvent.SET_SECRET, s);
            setSecretInput('');
        }
    };

    const handleSubmitGuess = (e: React.FormEvent) => {
        e.preventDefault();
        const g = guessInput.trim();
        if (secretRegex.test(g)) {
            socket.emit(SocketEvent.GUESS_NUMBER, g);
            setGuessInput('');
        }
    };

    const getPlayerName = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Player';

    return (
        <div className="container" style={{ minHeight: '100vh', paddingTop: 'clamp(1rem, 2vw, 2rem)', paddingBottom: 'clamp(1rem, 2vw, 2rem)', width: '100%' }}>
            <div className="fade-in" style={{ width: '100%', maxWidth: '1200px', margin: '0 auto', padding: '0 1rem' }}>
                <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '700', marginBottom: '0.5rem', textAlign: 'center' }}>
                    4 Chiffres
                </h1>
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '1rem', maxWidth: '600px', margin: '0 auto 1.5rem auto' }}>
                    Guess the other player&apos;s {secretSize}-digit number. You get: correct digits, and how many are in the right place.
                </p>

                {state.phase === 'ENTER_SECRET' && (
                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.15rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock size={20} /> Your secret number
                        </h2>
                        {!mySecretSet ? (
                            <form onSubmit={handleSubmitSecret}>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    maxLength={secretSize}
                                    className="input"
                                    placeholder={`Enter ${secretSize} digits (e.g. ${secretSize === 4 ? '1256' : secretSize === 5 ? '12345' : '123456'})`}
                                    value={secretInput}
                                    onChange={(e) => setSecretInput(e.target.value.replace(/\D/g, '').slice(0, secretSize))}
                                    style={{
                                        width: '100%',
                                        padding: '1rem',
                                        fontSize: '1.5rem',
                                        letterSpacing: '0.25em',
                                        textAlign: 'center'
                                    }}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={secretInput.length !== secretSize}
                                    style={{ width: '100%', marginTop: '1rem', padding: '0.75rem' }}
                                >
                                    <Lock size={18} /> Set secret
                                </button>
                            </form>
                        ) : (
                            <div style={{ padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '0.75rem', color: 'var(--text-secondary)' }}>
                                <p style={{ fontWeight: '600', color: 'var(--accent-primary)' }}>Secret set.</p>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                    {otherSecretSet ? 'Both players ready. Starting guesses…' : 'Waiting for the other player to set their number…'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {state.phase === 'GUESSING' && (
                    <>
                        {/* Three-column layout: History (left) + Main Content (center) + History (right) */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                            {/* Left side - First player history */}
                            <div className="card" style={{ flex: 1, minWidth: '250px' }}>
                                <div style={{ 
                                    fontSize: '0.9rem', 
                                    fontWeight: '600', 
                                    marginBottom: '0.75rem', 
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '0.5rem'
                                }}>
                                    {getPlayerName(state.playerIds[0])}'s guesses
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {state.guessHistory
                                        .filter(entry => entry.guesserId === state.playerIds[0])
                                        .map((entry, i) => (
                                            <div
                                                key={`p1-${i}`}
                                                style={{
                                                    padding: '0.6rem 0.75rem',
                                                    background: entry.guesserId === playerId ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                                                    borderRadius: '0.5rem',
                                                    borderLeft: entry.guesserId === playerId ? '3px solid var(--accent-primary)' : 'none'
                                                }}
                                            >
                                                <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                                                    <strong style={{ letterSpacing: '0.1em' }}>{entry.guess}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {entry.correctDigits} correct, {entry.correctPlace} in place
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>

                            {/* Center - Main content (stacked vertically) */}
                            <div style={{ flex: 1.5, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {/* Player name card */}
                                <div className="card">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <PlayerAvatar avatarId={currentPlayer?.avatar} name={currentPlayer?.name ?? ''} size={36} />
                                        <div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Now guessing</div>
                                            <div style={{ fontWeight: '600' }}>
                                                {currentPlayer?.name} {isMyTurn && '(You)'}
                                            </div>
                                        </div>
                                    </div>
                                    {mySecret !== null && (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
                                            <Lock size={18} style={{ color: 'var(--text-muted)' }} />
                                            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}></span>
                                            <span style={{ fontSize: '1.25rem', fontWeight: '600', letterSpacing: '0.15em', fontVariantNumeric: 'tabular-nums' }}>
                                                {showMySecret ? mySecret : '•'.repeat(mySecret.length)}
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={() => setShowMySecret((v) => !v)}
                                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                                                title={showMySecret ? 'Hide secret' : 'Show secret'}
                                            >
                                                {showMySecret ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Numbers 0-9 list */}
                                <div className="card">
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        Track digits: 1st click = green, 2nd = red, 3rd = clear
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
                                        {DIGITS.map((d) => {
                                            const mark = digitMarks[d];
                                            const isGreen = mark === 'correct';
                                            const isRed = mark === 'wrong';
                                            return (
                                                <button
                                                    key={d}
                                                    type="button"
                                                    onClick={() => cycleDigitMark(d)}
                                                    style={{
                                                        width: '2.5rem',
                                                        height: '2.5rem',
                                                        borderRadius: '0.5rem',
                                                        border: isGreen ? '2px solid var(--success)' : isRed ? '2px solid var(--error)' : '2px solid var(--border-color)',
                                                        background: isGreen ? 'rgba(16, 185, 129, 0.25)' : isRed ? 'rgba(239, 68, 68, 0.25)' : 'var(--bg-tertiary)',
                                                        color: 'var(--text-primary)',
                                                        fontSize: '1.1rem',
                                                        fontWeight: '600',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title={isGreen ? `${d} — mark as not in number` : isRed ? `${d} — clear` : `Mark ${d} as in number`}
                                                >
                                                    {d}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Guess field */}
                                {isMyTurn && (
                                    <div className="card">
                                        <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem' }}>Guess {otherPlayer?.name}&apos;s number</h3>
                                        <form onSubmit={handleSubmitGuess}>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                maxLength={secretSize}
                                                className="input"
                                                placeholder={`${secretSize} digits`}
                                                value={guessInput}
                                                onChange={(e) => setGuessInput(e.target.value.replace(/\D/g, '').slice(0, secretSize))}
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem',
                                                    fontSize: '1.5rem',
                                                    letterSpacing: '0.2em',
                                                    textAlign: 'center'
                                                }}
                                                autoComplete="off"
                                            />
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                disabled={guessInput.length !== secretSize}
                                                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem' }}
                                            >
                                                <Send size={18} /> Submit guess
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>

                            {/* Right side - Second player history */}
                            <div className="card" style={{ flex: 1, minWidth: '250px' }}>
                                <div style={{ 
                                    fontSize: '0.9rem', 
                                    fontWeight: '600', 
                                    marginBottom: '0.75rem', 
                                    color: 'var(--text-secondary)',
                                    textAlign: 'center',
                                    padding: '0.5rem',
                                    background: 'var(--bg-tertiary)',
                                    borderRadius: '0.5rem'
                                }}>
                                    {getPlayerName(state.playerIds[1])}'s guesses
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {state.guessHistory
                                        .filter(entry => entry.guesserId === state.playerIds[1])
                                        .map((entry, i) => (
                                            <div
                                                key={`p2-${i}`}
                                                style={{
                                                    padding: '0.6rem 0.75rem',
                                                    background: entry.guesserId === playerId ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-tertiary)',
                                                    borderRadius: '0.5rem',
                                                    borderLeft: entry.guesserId === playerId ? '3px solid var(--accent-primary)' : 'none'
                                                }}
                                            >
                                                <div style={{ fontWeight: '600', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                                                    <strong style={{ letterSpacing: '0.1em' }}>{entry.guess}</strong>
                                                </div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                    {entry.correctDigits} correct, {entry.correctPlace} in place
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        </div>


                    </>
                )}
            </div>
        </div>
    );
};
