import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Email, Sender, EmailStats } from '@/types';
import { authApi, emailApi, senderApi } from '@/services/api';

// ========================
// Auth Store
// ========================
interface AuthState {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    fetchUser: () => Promise<void>;
    logout: () => Promise<void>;
    setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            isLoading: true,
            isAuthenticated: false,

            fetchUser: async () => {
                try {
                    set({ isLoading: true });
                    const user = await authApi.getMe();
                    set({ user, isAuthenticated: true, isLoading: false });
                } catch {
                    set({ user: null, isAuthenticated: false, isLoading: false });
                }
            },

            logout: async () => {
                try {
                    await authApi.logout();
                } finally {
                    set({ user: null, isAuthenticated: false });
                }
            },

            setUser: (user) => {
                set({ user, isAuthenticated: !!user, isLoading: false });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
        }
    )
);

// ========================
// Email Store
// ========================
type FilterOption = 'all' | 'newest' | 'oldest' | 'starred';

interface EmailState {
    scheduledEmails: Email[];
    sentEmails: Email[];
    stats: EmailStats | null;
    isLoading: boolean;
    error: string | null;
    scheduledPagination: { page: number; hasMore: boolean };
    sentPagination: { page: number; hasMore: boolean };
    searchQuery: string;
    filterOption: FilterOption;

    fetchScheduledEmails: (page?: number) => Promise<void>;
    fetchSentEmails: (page?: number) => Promise<void>;
    fetchStats: () => Promise<void>;
    clearError: () => void;
    setSearchQuery: (query: string) => void;
    setFilterOption: (option: FilterOption) => void;
}

export const useEmailStore = create<EmailState>((set, get) => ({
    scheduledEmails: [],
    sentEmails: [],
    stats: null,
    isLoading: false,
    error: null,
    scheduledPagination: { page: 1, hasMore: false },
    sentPagination: { page: 1, hasMore: false },
    searchQuery: '',
    filterOption: 'newest',

    fetchScheduledEmails: async (page = 1) => {
        try {
            set({ isLoading: true, error: null });
            const { filterOption } = get();
            const sortOrder = filterOption === 'oldest' ? 'asc' : 'desc';
            const { emails, pagination } = await emailApi.getScheduled({
                page,
                limit: 20,
                sortOrder
            });

            if (page === 1) {
                set({ scheduledEmails: emails });
            } else {
                set({ scheduledEmails: [...get().scheduledEmails, ...emails] });
            }

            set({
                scheduledPagination: { page: pagination.page, hasMore: pagination.hasMore },
                isLoading: false,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch emails', isLoading: false });
        }
    },

    fetchSentEmails: async (page = 1) => {
        try {
            set({ isLoading: true, error: null });
            const { filterOption } = get();
            const sortOrder = filterOption === 'oldest' ? 'asc' : 'desc';
            const { emails, pagination } = await emailApi.getSent({
                page,
                limit: 20,
                sortOrder
            });

            if (page === 1) {
                set({ sentEmails: emails });
            } else {
                set({ sentEmails: [...get().sentEmails, ...emails] });
            }

            set({
                sentPagination: { page: pagination.page, hasMore: pagination.hasMore },
                isLoading: false,
            });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch emails', isLoading: false });
        }
    },

    fetchStats: async () => {
        try {
            const stats = await emailApi.getStats();
            set({ stats });
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    },

    clearError: () => set({ error: null }),

    setSearchQuery: (query: string) => set({ searchQuery: query }),

    setFilterOption: (option: FilterOption) => set({ filterOption: option }),
}));

// ========================
// Sender Store
// ========================
interface SenderState {
    senders: Sender[];
    isLoading: boolean;
    error: string | null;

    fetchSenders: () => Promise<void>;
    getDefaultSender: () => Sender | undefined;
}

export const useSenderStore = create<SenderState>((set, get) => ({
    senders: [],
    isLoading: false,
    error: null,

    fetchSenders: async () => {
        try {
            set({ isLoading: true, error: null });
            const senders = await senderApi.getAll();
            set({ senders, isLoading: false });
        } catch (error) {
            set({ error: error instanceof Error ? error.message : 'Failed to fetch senders', isLoading: false });
        }
    },

    getDefaultSender: () => {
        return get().senders.find((s) => s.isDefault) || get().senders[0];
    },
}));

// ========================
// UI Store
// ========================
interface UIState {
    activeTab: 'scheduled' | 'sent';
    isComposeOpen: boolean;
    isSidebarCollapsed: boolean;
    isEmailDetailOpen: boolean;

    setActiveTab: (tab: 'scheduled' | 'sent') => void;
    setComposeOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    setEmailDetailOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeTab: 'scheduled',
    isComposeOpen: false,
    isSidebarCollapsed: false,
    isEmailDetailOpen: false,

    setActiveTab: (tab) => set({ activeTab: tab }),
    setComposeOpen: (open) => set({ isComposeOpen: open }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    setEmailDetailOpen: (open) => set({ isEmailDetailOpen: open }),
}));
