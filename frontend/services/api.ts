import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL, APP_CONFIG } from '../config';
import { authService } from './auth';
import NetInfo from '@react-native-community/netinfo';
import { mockApi } from './mockApi';

// Determine if we should use mock API
const isDevelopment = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : typeof __DEV__ !== 'undefined' 
    ? __DEV__ 
    : false;

const USE_MOCK_API = false; // Disabled for demo

export enum ApiErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  REQUEST_ERROR = 'REQUEST_ERROR'
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: ApiErrorCode | string,
    message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static fromHttpStatus(status: number, message?: string): ApiError {
    switch (status) {
      case 401:
        return new ApiError(status, ApiErrorCode.UNAUTHORIZED, message || 'Unauthorized');
      case 403:
        return new ApiError(status, ApiErrorCode.FORBIDDEN, message || 'Forbidden');
      case 404:
        return new ApiError(status, ApiErrorCode.NOT_FOUND, message || 'Not found');
      case 422:
        return new ApiError(status, ApiErrorCode.VALIDATION_ERROR, message || 'Validation error');
      case 408:
        return new ApiError(status, ApiErrorCode.TIMEOUT, message || 'Request timeout');
      default:
        return status >= 500
          ? new ApiError(status, ApiErrorCode.SERVER_ERROR, message || 'Server error')
          : new ApiError(status, ApiErrorCode.UNKNOWN_ERROR, message || 'Unknown error');
    }
  }
}

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  retry?: number;
  requiresAuth?: boolean;
  timeout?: number;
  body?: string | FormData;
}

export interface ApiResponse<T> {
  data: T;
  status: string;
  message?: string;
}

interface NetworkError extends Error {
  message: string;
  name: string;
}

// Extend the axios config type to include our custom properties
interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  requiresAuth?: boolean;
}

interface CustomInternalAxiosRequestConfig extends InternalAxiosRequestConfig {
  requiresAuth?: boolean;
}

// Custom error types
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private axiosInstance;

  constructor(baseUrl: string, defaultTimeout = APP_CONFIG.apiTimeout) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = defaultTimeout;

    // Create a single axios instance with consistent configuration
    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: defaultTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      // Ensure proper JSON handling
      transformRequest: [(data) => {
        if (data instanceof FormData) {
          return data;
        }
        return JSON.stringify(data);
      }],
      transformResponse: [(data) => {
        try {
          return JSON.parse(data);
        } catch (e) {
          return data;
        }
      }],
    });

    // Add request interceptor for auth
    this.axiosInstance.interceptors.request.use(
      async (config: CustomInternalAxiosRequestConfig) => {
        if (config.requiresAuth !== false) {
          const token = await authService.getAccessToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for token refresh
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          try {
            const refreshed = await authService.refreshTokens();
            if (refreshed) {
              const token = await authService.getAccessToken();
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.axiosInstance(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async request<T>(endpoint: string, config: CustomAxiosRequestConfig = {}): Promise<T> {
    if (USE_MOCK_API) {
      return this.handleMockRequest<T>(endpoint, config);
    }

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        throw new ApiError(0, ApiErrorCode.NETWORK_ERROR, 'No internet connection');
      }

      const response = await this.axiosInstance.request<ApiResponse<T>>({
        url: endpoint,
        ...config,
      });

      return this.handleResponse<T>(response);
    } catch (error) {
      throw this.handleAxiosError(error as AxiosError);
    }
  }

  private async handleMockRequest<T>(endpoint: string, config: CustomAxiosRequestConfig): Promise<T> {
    const method = config.method?.toLowerCase() || 'get';
    const mockEndpoint = endpoint.replace(/^\/api\//, '');
    
    switch (mockEndpoint) {
      case 'auth/login':
        return mockApi.login(config.data as any) as Promise<T>;
      case 'emergencies':
        return mockApi.getEmergencies() as Promise<T>;
      case 'status':
        return mockApi.getStatus() as Promise<T>;
      case 'location':
        const { latitude, longitude } = config.data as any;
        await mockApi.updateLocation(latitude, longitude);
        return { success: true } as T;
      default:
        if (mockEndpoint.startsWith('emergencies/') && method === 'post') {
          const id = mockEndpoint.split('/')[1];
          await mockApi.respondToEmergency(id);
          return { success: true } as T;
        }
        throw new ApiError(404, ApiErrorCode.NOT_FOUND, 'Mock endpoint not found');
    }
  }

  // Update convenience methods to use CustomAxiosRequestConfig
  async get<T>(endpoint: string, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'POST', data });
  }

  async put<T>(endpoint: string, data?: unknown, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', data });
  }

  async delete<T>(endpoint: string, config?: CustomAxiosRequestConfig): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  handleAxiosError(error: AxiosError): ApiError {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as { message?: string };
      return ApiError.fromHttpStatus(
        status,
        data?.message || error.message
      );
    } else if (error.code === 'ECONNABORTED') {
      return new ApiError(
        408,
        ApiErrorCode.TIMEOUT,
        'Request timeout'
      );
    } else if (error.request) {
      return new ApiError(
        0,
        ApiErrorCode.NETWORK_ERROR,
        'No response from server'
      );
    } else {
      return new ApiError(
        0,
        ApiErrorCode.REQUEST_ERROR,
        error.message || 'Request failed'
      );
    }
  }

  async handleResponse<T>(response: AxiosResponse<ApiResponse<T>>): Promise<T> {
    switch (response.status) {
      case 200:
      case 201:
        return response.data.data;
      case 204:
        return {} as T;
      case 401:
        throw new AuthError('Authentication required');
      case 403:
        throw new AuthError('Access denied');
      case 404:
        throw new NotFoundError('Resource not found');
      case 500:
        throw new ServerError('Internal server error');
      default:
        throw new Error(`Unexpected status code: ${response.status}`);
    }
  }
}

// Export a single API client instance
export const api = new ApiClient(API_URL);

// Remove the separate axios export since we're using a single client
// export const apiAxios = { ... }; 