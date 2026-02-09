const CARD_NAMES: Record<number, string> = {
    1: '01_astronaut',
    2: '02_rocket',
    3: '03_saturn',
    4: '04_earth',
    5: '05_moon',
    6: '06_alien',
    7: '07_ufo',
    8: '08_star',
    9: '09_comet',
    10: '10_galaxy',
    11: '11_shuttle',
    12: '12_mars',
    13: '13_sun',
    14: '14_satellite',
    15: '15_telescope',
    16: '16_station',
    17: '17_meteor',
    18: '18_blackhole',
    19: '19_constellation',
    20: '20_rover'
};

export function getMemoryCardSrc(cardId: number): string {
    const name = CARD_NAMES[cardId];
    if (!name) return '';
    return new URL(`../../assets/memory_cards/${name}.png`, import.meta.url).href;
}

export function getCardBackSrc(): string {
    return new URL(`../../assets/memory_cards/card_back.png`, import.meta.url).href;
}

/** Human-readable label for accessibility (e.g. "astronaut", "rocket") */
export function getMemoryCardLabel(cardId: number): string {
    const name = CARD_NAMES[cardId];
    if (!name) return 'unknown';
    return name.replace(/^\d+_/, '');
}
