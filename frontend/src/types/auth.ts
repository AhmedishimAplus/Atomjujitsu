export type User = {
    id: string;
    name: string;
    email: string;
    isTwoFactorEnabled: boolean;
};

export type AuthState = {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;
    requires2FA: boolean;
};

export type LoginCredentials = {
    email: string;
    password: string;
    twoFactorToken?: string;
};

export type RegisterData = {
    name: string;
    email: string;
    password: string;
    phone?: string;
};

export type VerifyEmailData = {
    email: string;
    otp: string;
};

export type UpdateProfileData = {
    name?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    twoFactorToken?: string;
};

export type TwoFactorSetup = {
    qrCode: string;
    secret: string;
};
