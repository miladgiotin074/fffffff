import {retrieveRawInitData } from '@telegram-apps/sdk-react';
import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// تعریف تایپ‌های پایه
interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

interface ApiError {
  message: string;
  status?: number;
  data?: any;
}

// ایجاد نمونه axios
const api: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 10000, // 10 ثانیه
  headers: {
    'Content-Type': 'application/json',
  },
});

// افزودن interceptor برای درخواست‌ها
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const initData = retrieveRawInitData();
  if (initData) {
    config.headers = config.headers || {};

    if (typeof initData === 'string') {
      config.headers['Authorization'] = initData;
    }

  }
  return config;
});

// تغییر interceptor برای پاسخ‌ها
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    // اگر خطای 400 باشد و داده‌ای وجود داشته باشد، آن را برگردان
    if (error.response?.status === 400 && error.response.data) {
      return Promise.reject(error.response.data);
    }
    return Promise.reject({
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
  }
);

// توابع کاربردی برای درخواست‌های متداول
const apiClient = {
  get: <T>(url: string, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.get<T>(url, config),

  post: <T>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.post<T>(url, data, config),

  put: <T>(url: string, data?: any, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.put<T>(url, data, config),

  delete: <T>(url: string, config?: InternalAxiosRequestConfig): Promise<ApiResponse<T>> =>
    api.delete<T>(url, config),
};

export { apiClient as api };
export type { ApiResponse, ApiError };