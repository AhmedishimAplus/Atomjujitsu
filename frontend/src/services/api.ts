/**
 * API service for making requests to the backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface ApiResponse<T> {
    data?: T;
    error?: string;
}

/**
 * Make a request to the API
 */
export async function apiRequest<T>(
    endpoint: string,
    method: string = 'GET',
    data?: any,
    token?: string
): Promise<ApiResponse<T>> {
    try {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined,
        });

        const responseData = await response.json();

        if (!response.ok) {
            return { error: responseData.error || 'Something went wrong' };
        }

        return { data: responseData };
    } catch (error) {
        return { error: 'Network error occurred' };
    }
}

// Auth API calls
export const authApi = {
    login: (email: string, password: string, twoFactorToken?: string) =>
        apiRequest('/user/login', 'POST', { email, password, twoFactorToken }),

    register: (name: string, email: string, password: string, phone?: string) =>
        apiRequest('/user/register', 'POST', { name, email, password, phone }),

    verifyEmail: (email: string, otp: string) =>
        apiRequest('/user/verify-email', 'POST', { email, otp }),

    // Profile management
    updateProfile: (data: any, token: string) =>
        apiRequest('/user/update-profile', 'PUT', data, token),

    // 2FA
    enable2FA: (token: string) =>
        apiRequest('/user/enable-2fa', 'POST', {}, token),

    verify2FASetup: (verificationCode: string, token: string) =>
        apiRequest('/user/verify-2fa-setup', 'POST', { token: verificationCode }, token),

    disable2FA: (verificationCode: string, token: string) =>
        apiRequest('/user/disable-2fa', 'POST', { token: verificationCode }, token),

    resendVerification: (email: string) =>
        apiRequest('/user/resend-verification', 'POST', { email }),
};
