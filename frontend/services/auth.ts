import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { API_URL } from '../config';
import { ApiError, ApiErrorCode, api } from './api';
import { AuthStatus, AuthTokens, AuthUser, LoginCredentials } from '../types/auth';

// Re-export types
export type { AuthTokens, AuthUser, LoginCredentials };
export { AuthStatus };

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes in milliseconds

class AuthService {
  private tokens: AuthTokens | null = null;
  private user: AuthUser | null = null;
  private status: AuthStatus = AuthStatus.INITIALIZING;
  private refreshPromise: Promise<boolean> | null = null;

  // Initialize auth state from storage
  async initialize(): Promise<boolean> {
    try {
      const [tokens, user] = await Promise.all([
        this.getStoredTokens(),
        this.getStoredUser()
      ]);
      
      if (tokens && user) {
        this.tokens = tokens;
        this.user = user;
        this.status = AuthStatus.AUTHENTICATED;

        // Check if token needs refresh
        if (this.shouldRefreshToken()) {
          await this.refreshTokens();
        }
        return true;
      }
      this.status = AuthStatus.UNAUTHENTICATED;
      return false;
    } catch (error) {
      console.error('Failed to initialize auth:', error);
      this.status = AuthStatus.ERROR;
      return false;
    }
  }

  // Login user
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      const response = await api.post<{ tokens: AuthTokens; user: AuthUser }>('/auth/login', credentials, {
        requiresAuth: false // Explicitly disable auth for login
      });

      await this.setTokens(response.tokens);
      await this.setUser(response.user);
      this.status = AuthStatus.AUTHENTICATED;

      return response.user;
    } catch (error) {
      this.status = AuthStatus.ERROR;
      console.error('Login failed:', error);
      throw error;
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      if (this.tokens?.refreshToken) {
        await api.post('/auth/logout', null, {
          headers: {
            'Authorization': `Bearer ${this.tokens.refreshToken}`,
          },
          requiresAuth: false
        }).catch(error => console.warn('Logout request failed:', error));
      }
    } finally {
      await this.clearAuth();
      this.status = AuthStatus.UNAUTHENTICATED;
    }
  }

  // Refresh access token
  async refreshTokens(): Promise<boolean> {
    // Return existing refresh promise if one is in progress
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        if (!this.tokens?.refreshToken) {
          return false;
        }

        const response = await api.post<{ tokens: AuthTokens }>('/auth/refresh', null, {
          headers: {
            'Authorization': `Bearer ${this.tokens.refreshToken}`,
          },
          requiresAuth: false
        });

        await this.setTokens(response.tokens);
        return true;
      } catch (error) {
        console.error('Token refresh failed:', error);
        await this.clearAuth();
        this.status = AuthStatus.UNAUTHENTICATED;
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // Get current access token
  async getAccessToken(): Promise<string | null> {
    if (this.shouldRefreshToken()) {
      await this.refreshTokens();
    }
    return this.tokens?.accessToken || null;
  }

  // Get current user
  getUser(): AuthUser | null {
    return this.user;
  }

  // Get current auth status
  getStatus(): AuthStatus {
    return this.status;
  }

  // Check if token needs refresh
  private shouldRefreshToken(): boolean {
    if (!this.tokens?.expiresAt) {
      return false;
    }
    return Date.now() + TOKEN_REFRESH_THRESHOLD > this.tokens.expiresAt;
  }

  // Store tokens securely
  private async setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
    const tokensStr = JSON.stringify(tokens);
    
    try {
      if (Platform.OS === 'web') {
        await AsyncStorage.setItem(TOKEN_KEY, tokensStr);
      } else {
        await SecureStore.setItemAsync(TOKEN_KEY, tokensStr);
      }
    } catch (error) {
      console.error('Failed to store tokens:', error);
      throw new ApiError(0, ApiErrorCode.UNKNOWN_ERROR, 'Failed to store tokens');
    }
  }

  // Store user data
  private async setUser(user: AuthUser): Promise<void> {
    this.user = user;
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch (error) {
      console.error('Failed to store user:', error);
      throw new ApiError(0, ApiErrorCode.UNKNOWN_ERROR, 'Failed to store user data');
    }
  }

  // Get stored tokens
  private async getStoredTokens(): Promise<AuthTokens | null> {
    try {
      let tokensStr: string | null;
      if (Platform.OS === 'web') {
        tokensStr = await AsyncStorage.getItem(TOKEN_KEY);
      } else {
        tokensStr = await SecureStore.getItemAsync(TOKEN_KEY);
      }
      return tokensStr ? JSON.parse(tokensStr) as AuthTokens : null;
    } catch (error) {
      console.error('Failed to get stored tokens:', error);
      return null;
    }
  }

  // Get stored user
  private async getStoredUser(): Promise<AuthUser | null> {
    try {
      const userStr = await AsyncStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) as AuthUser : null;
    } catch (error) {
      console.error('Failed to get stored user:', error);
      return null;
    }
  }

  // Clear all auth data
  private async clearAuth(): Promise<void> {
    this.tokens = null;
    this.user = null;
    this.status = AuthStatus.UNAUTHENTICATED;
    
    try {
      await Promise.all([
        Platform.OS === 'web'
          ? AsyncStorage.removeItem(TOKEN_KEY)
          : SecureStore.deleteItemAsync(TOKEN_KEY),
        AsyncStorage.removeItem(USER_KEY),
      ]);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }
}

export const authService = new AuthService(); 