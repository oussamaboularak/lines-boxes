// Avatar options - filenames from assets folder
export const AVATAR_OPTIONS = [
    { id: 'buggs-bunny', label: 'Bugs Bunny', src: new URL('../../assets/buggs bunny.png', import.meta.url).href },
    { id: 'hellokitty', label: 'Hello Kitty', src: new URL('../../assets/hellokitty.png', import.meta.url).href },
    { id: 'jerry', label: 'Jerry', src: new URL('../../assets/jerry.png', import.meta.url).href },
    { id: 'tom', label: 'Tom', src: new URL('../../assets/tom.png', import.meta.url).href }
] as const;

export type AvatarId = typeof AVATAR_OPTIONS[number]['id'];

export function getAvatarSrc(avatarId: string | undefined): string | null {
    if (!avatarId) return null;
    return AVATAR_OPTIONS.find(a => a.id === avatarId)?.src ?? null;
}
