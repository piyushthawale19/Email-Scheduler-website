import axios, { AxiosInstance, AxiosError } from "axios";
import Cookies from "js-cookie";
import {
  ApiResponse,
  User,
  Email,
  Sender,
  ScheduleEmailRequest,
  EmailStats,
  PaginationInfo,
} from "@/types";

// API Base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - add auth token
api.interceptors.request.use((config) => {
  const token = Cookies.get("token") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiResponse>) => {
    if (error.response?.status === 401) {
      // Clear auth and redirect to login
      Cookies.remove("token");
      localStorage.removeItem("token");
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.includes("/login")
      ) {
        window.location.href = "/login";
      }
    }

    // Extract error message from response for better error handling
    if (error.response?.data?.error) {
      error.message = error.response.data.error;
    }

    return Promise.reject(error);
  },
);

// ========================
// Auth API
// ========================

export const authApi = {
  // Get current user
  getMe: async (): Promise<User> => {
    const response = await api.get<ApiResponse<User>>("/auth/me");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Failed to get user");
    }
    return response.data.data;
  },

  // Logout
  logout: async (): Promise<void> => {
    await api.post("/auth/logout");
    Cookies.remove("token");
    localStorage.removeItem("token");
  },

  // Set token (called after OAuth redirect)
  setToken: (token: string): void => {
    Cookies.set("token", token, { expires: 7 });
    localStorage.setItem("token", token);
  },

  // Get Google OAuth URL
  getGoogleAuthUrl: (): string => {
    return `${API_URL}/auth/google`;
  },
};

// ========================
// Email API
// ========================

export interface GetEmailsParams {
  page?: number;
  limit?: number;
  sortBy?: "scheduledAt" | "createdAt" | "sentAt";
  sortOrder?: "asc" | "desc";
}

export interface GetEmailsResponse {
  emails: Email[];
  pagination: PaginationInfo;
}

export const emailApi = {
  // Schedule emails with file attachments
  schedule: async (
    data: ScheduleEmailRequest & { files?: File[] },
  ): Promise<{ batchId: string; totalEmails: number }> => {
    // Create FormData to support file uploads
    const formData = new FormData();

    // Add all email data as form fields
    formData.append('subject', data.subject);
    formData.append('body', data.body);
    formData.append('recipients', JSON.stringify(data.recipients));
    formData.append('startTime', data.startTime);
    formData.append('delayBetweenEmails', data.delayBetweenEmails.toString());
    formData.append('hourlyLimit', data.hourlyLimit.toString());
    if (data.senderId) {
      formData.append('senderId', data.senderId);
    }

    // Add attachment files
    if (data.files && data.files.length > 0) {
      data.files.forEach((file) => {
        formData.append('attachments', file);
      });
    }

    const response = await api.post<
      ApiResponse<{ batchId: string; totalEmails: number }>
    >("/emails/schedule", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Failed to schedule emails");
    }
    return response.data.data;
  },

  // Get scheduled emails
  getScheduled: async (
    params?: GetEmailsParams,
  ): Promise<GetEmailsResponse> => {
    const response = await api.get<ApiResponse<Email[]>>("/emails/scheduled", {
      params,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to get scheduled emails");
    }
    return {
      emails: response.data.data || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  },

  // Get sent emails
  getSent: async (params?: GetEmailsParams): Promise<GetEmailsResponse> => {
    const response = await api.get<ApiResponse<Email[]>>("/emails/sent", {
      params,
    });
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to get sent emails");
    }
    return {
      emails: response.data.data || [],
      pagination: response.data.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasMore: false,
      },
    };
  },

  // Get email statistics
  getStats: async (): Promise<EmailStats> => {
    const response = await api.get<ApiResponse<EmailStats>>("/emails/stats");
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Failed to get email stats");
    }
    return response.data.data;
  },

  // Get single email
  getById: async (id: string): Promise<Email> => {
    const response = await api.get<ApiResponse<Email>>(`/emails/${id}`);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Failed to get email");
    }
    return response.data.data;
  },

  // Cancel email
  cancel: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse>(`/emails/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to cancel email");
    }
  },
};

// ========================
// Sender API
// ========================

export const senderApi = {
  // Get all senders
  getAll: async (): Promise<Sender[]> => {
    const response = await api.get<ApiResponse<Sender[]>>("/senders");
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to get senders");
    }
    return response.data.data || [];
  },

  // Create sender
  create: async (data: {
    email: string;
    name: string;
    isDefault?: boolean;
  }): Promise<Sender> => {
    const response = await api.post<ApiResponse<Sender>>("/senders", data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Failed to create sender");
    }
    return response.data.data;
  },

  // Update sender
  update: async (id: string, data: Partial<Sender>): Promise<Sender> => {
    const response = await api.put<ApiResponse<Sender>>(`/senders/${id}`, data);
    if (!response.data.success || !response.data.data) {
      throw new Error(response.data.error || "Failed to update sender");
    }
    return response.data.data;
  },

  // Delete sender
  delete: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse>(`/senders/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to delete sender");
    }
  },
};

export default api;
