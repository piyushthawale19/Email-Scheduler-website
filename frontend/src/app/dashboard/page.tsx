'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore, useEmailStore, useSenderStore, useUIStore } from '@/hooks/useStore';
import { authApi } from '@/services/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import EmailList from '@/components/EmailList';
import ComposeEmail from '@/components/ComposeEmail';
import toast from 'react-hot-toast';

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, isAuthenticated, isLoading, fetchUser } = useAuthStore();
    const { fetchScheduledEmails, fetchSentEmails, fetchStats } = useEmailStore();
    const { fetchSenders } = useSenderStore();
    const { activeTab, isComposeOpen, isEmailDetailOpen } = useUIStore();

    useEffect(() => {
        // Check for token in URL (from OAuth callback)
        const token = searchParams.get('token');
        if (token) {
            authApi.setToken(token);
             
            window.history.replaceState({}, '', '/dashboard');
        }

        // Fetch user data
        fetchUser().then(() => {
            const state = useAuthStore.getState();
            if (!state.isAuthenticated) {
                router.push('/login');
            } else {
                
                fetchScheduledEmails();
                fetchSentEmails();
                fetchStats();
                fetchSenders();
                toast.success(`Welcome, ${state.user?.name}!`, { id: 'welcome-toast' });
            }
        });
    }, [searchParams, router, fetchUser, fetchScheduledEmails, fetchSentEmails, fetchStats, fetchSenders]);

     
    if (isLoading) {
        return (
            <div className="loading-container" style={{ minHeight: '100vh' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    // Redirect if not authenticated
    if (!isAuthenticated || !user) {
        return null;
    }

    return (
        <div className="dashboard-layout">
            {!isEmailDetailOpen && <Sidebar />}
            <div className="main-content">
                <Header />
                <EmailList />
            </div>
            {isComposeOpen && <ComposeEmail />}
        </div>
    );
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="loading-container" style={{ minHeight: '100vh' }}>
                <div className="loading-spinner" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    );
}
