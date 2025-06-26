import { jwtDecode } from "jwt-decode";
import { UserRole } from "../types";

export interface JwtPayload {
    exp: number;
    id: string;
    email: string;
    role: UserRole;
    [key: string]: any;
}

export function getTokenExpiration(token: string): number | null {
    try {
        const decoded = jwtDecode<JwtPayload>(token);
        if (decoded && decoded.exp) {
            return decoded.exp * 1000; // convert to ms
        }
        return null;
    } catch {
        return null;
    }
}

export function getUserFromToken(token: string): { id: string; email: string; role: UserRole; isTwoFactorEnabled?: boolean } | null {
    try {
        const decoded = jwtDecode<JwtPayload>(token);
        if (decoded && decoded.id && decoded.email && decoded.role) {
            return {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role,
                isTwoFactorEnabled: decoded.isTwoFactorEnabled
            };
        }
        return null;
    } catch {
        return null;
    }
}

export function getTokenRemainingTime(token: string): { hours: string; minutes: string; seconds: string } | null {
    const exp = getTokenExpiration(token);
    if (!exp) return null;
    const ms = exp - Date.now();
    if (ms <= 0) return { hours: '00', minutes: '00', seconds: '00' };
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return {
        hours: hours.toString().padStart(2, '0'),
        minutes: minutes.toString().padStart(2, '0'),
        seconds: seconds.toString().padStart(2, '0'),
    };
}
