import React from 'react';
import { getAvatarSrc } from '../constants/avatars';

interface PlayerAvatarProps {
    avatarId?: string;
    name: string;
    size?: number;
    style?: React.CSSProperties;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ avatarId, name, size = 40, style }) => {
    const src = getAvatarSrc(avatarId);

    if (src) {
        return (
            <img
                src={src}
                alt={name}
                style={{
                    width: size,
                    height: size,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    ...style
                }}
            />
        );
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700',
                fontSize: size * 0.5,
                ...style
            }}
        >
            {name.charAt(0).toUpperCase()}
        </div>
    );
};
