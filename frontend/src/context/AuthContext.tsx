import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import {
    AuthState,
    User,
    LoginCredentials,
    RegisterData,
    VerifyEmailData,
    UpdateProfileData
} from '../types/auth';

type AuthAction =
    | { type: 'LOGIN_REQUEST' }
    | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
    | { type: 'LOGIN_FAILURE'; payload: string }
    | { type: 'REQUIRES_2FA' }
    | { type: 'LOGOUT' }
    | { type: 'REGISTER_REQUEST' }
    | { type: 'REGISTER_SUCCESS' }
    | { type: 'REGISTER_FAILURE'; payload: string }
    | { type: 'CLEAR_ERROR' }
    | { type: 'UPDATE_USER'; payload: User }
    | { type: 'LOADING' };

const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    loading: false,
    error: null,
    requires2FA: false
};

const AuthContext = createContext<{
    state: AuthState;
    login: (credentials: LoginCredentials) => Promise<void>;
    logout: () => void;
    register: (data: RegisterData) => Promise<void>;
    verifyEmail: (data: VerifyEmailData) => Promise<void>;
    updateProfile: (data: UpdateProfileData) => Promise<void>;
    enable2FA: () => Promise<{ qrCode: string; secret: string }>;
    verify2FASetup: (token: string) => Promise<void>;
    disable2FA: (token: string) => Promise<void>;
    clearError: () => void;
    resendVerification: (email: string) => Promise<void>;
}>({
    state: initialState,
    login: async () => { },
    logout: () => { },
    register: async () => { },
    verifyEmail: async () => { },
    updateProfile: async () => { },
    enable2FA: async () => ({ qrCode: '', secret: '' }),
    verify2FASetup: async () => { },
    disable2FA: async () => { },
    clearError: () => { },
    resendVerification: async () => { }
});

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN_REQUEST':
        case 'REGISTER_REQUEST':
        case 'LOADING':
            return {
                ...state,
                loading: true,
                error: null
            };
        case 'LOGIN_SUCCESS':
            return {
                ...state,
                isAuthenticated: true,
                user: action.payload.user,
                token: action.payload.token,
                loading: false,
                error: null,
                requires2FA: false
            };
        case 'LOGIN_FAILURE':
        case 'REGISTER_FAILURE':
            return {
                ...state,
                isAuthenticated: false,
                user: null,
                token: null,
                loading: false,
                error: action.payload
            };
        case 'REQUIRES_2FA':
            return {
                ...state,
                loading: false,
                requires2FA: true
            };
        case 'REGISTER_SUCCESS':
            return {
                ...state,
                loading: false,
                error: null
            };
        case 'LOGOUT':
            return {
                ...initialState
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null
            };
        case 'UPDATE_USER':
            return {
                ...state,
                user: action.payload,
                loading: false
            };
        default:
            return state;
    }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        // Check for saved token and try to restore session
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (token && userData) {
            try {
                const user = JSON.parse(userData);
                dispatch({
                    type: 'LOGIN_SUCCESS',
                    payload: { user, token }
                });
            } catch (error) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
            }
        }
    }, []);
    // API base URL
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    // Helper function for API calls
    const apiCall = async (endpoint: string, method: string, data?: any, withAuth: boolean = false) => {
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        };

        if (withAuth && state.token) {
            headers['Authorization'] = `Bearer ${state.token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: data ? JSON.stringify(data) : undefined
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || 'Something went wrong');
        }

        return responseData;
    };
    // Login function
    const login = async (credentials: LoginCredentials) => {
        dispatch({ type: 'LOGIN_REQUEST' });

        try {
            const data = await apiCall('/user/login', 'POST', credentials);

            if (data.requires2FA) {
                dispatch({ type: 'REQUIRES_2FA' });
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            dispatch({
                type: 'LOGIN_SUCCESS',
                payload: {
                    user: data.user,
                    token: data.token
                }
            });
        } catch (error: any) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error.message
            });
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGOUT' });
    };
    // Register function
    const register = async (data: RegisterData) => {
        dispatch({ type: 'REGISTER_REQUEST' });

        try {
            await apiCall('/user/register', 'POST', data);
            dispatch({ type: 'REGISTER_SUCCESS' });
        } catch (error: any) {
            dispatch({
                type: 'REGISTER_FAILURE',
                payload: error.message
            });
        }
    };

    // Verify email function
    const verifyEmail = async (data: VerifyEmailData) => {
        dispatch({ type: 'LOADING' });

        try {
            await apiCall('/user/verify-email', 'POST', data);
        } catch (error: any) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error.message
            });
            throw error;
        }
    };
    // Update profile function
    const updateProfile = async (data: UpdateProfileData) => {
        dispatch({ type: 'LOADING' });

        try {
            const response = await apiCall('/user/update-profile', 'PUT', data, true);

            if (state.user) {
                const updatedUser = {
                    ...state.user,
                    name: data.name || state.user.name,
                    email: data.email || state.user.email
                };

                localStorage.setItem('user', JSON.stringify(updatedUser));

                dispatch({
                    type: 'UPDATE_USER',
                    payload: updatedUser
                });
            }

            return response;
        } catch (error: any) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error.message
            });
            throw error;
        }
    };

    // Enable 2FA
    const enable2FA = async () => {
        dispatch({ type: 'LOADING' });

        try {
            const response = await apiCall('/user/enable-2fa', 'POST', {}, true);
            return {
                qrCode: response.qrCode,
                secret: response.secret
            };
        } catch (error: any) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error.message
            });
            throw error;
        }
    };
    // Verify 2FA setup
    const verify2FASetup = async (token: string) => {
        dispatch({ type: 'LOADING' });

        try {
            await apiCall('/user/verify-2fa-setup', 'POST', { token }, true);

            if (state.user) {
                const updatedUser = {
                    ...state.user,
                    isTwoFactorEnabled: true
                };

                localStorage.setItem('user', JSON.stringify(updatedUser));

                dispatch({
                    type: 'UPDATE_USER',
                    payload: updatedUser
                });
            }
        } catch (error: any) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error.message
            });
            throw error;
        }
    };

    // Disable 2FA
    const disable2FA = async (token: string) => {
        dispatch({ type: 'LOADING' });

        try {
            await apiCall('/user/disable-2fa', 'POST', { token }, true);

            if (state.user) {
                const updatedUser = {
                    ...state.user,
                    isTwoFactorEnabled: false
                };

                localStorage.setItem('user', JSON.stringify(updatedUser));

                dispatch({
                    type: 'UPDATE_USER',
                    payload: updatedUser
                });
            }
        } catch (error: any) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error.message
            });
            throw error;
        }
    };
    // Clear error
    const clearError = useCallback(() => {
        dispatch({ type: 'CLEAR_ERROR' });
    }, [dispatch]);

    // Resend verification email
    const resendVerification = async (email: string) => {
        dispatch({ type: 'LOADING' });

        try {
            await apiCall('/user/resend-verification', 'POST', { email });
        } catch (error: any) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error.message
            });
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                state,
                login,
                logout,
                register,
                verifyEmail,
                updateProfile,
                enable2FA,
                verify2FASetup,
                disable2FA,
                resendVerification,
                clearError
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
