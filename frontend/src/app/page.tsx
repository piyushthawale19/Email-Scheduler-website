'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useStore';

export default function Home() {
    const router = useRouter();
    const { isAuthenticated, isLoading, fetchUser } = useAuthStore();

    useEffect(() => {
        fetchUser().then(() => {
            // Redirect based on auth state
            if (useAuthStore.getState().isAuthenticated) {
                router.push('/dashboard');
            } else {
                router.push('/login');
            }
        });
    }, [fetchUser, router]);

    return (
        <div className="loading-container" style={{ minHeight: '100vh' }}>
            <div className="loading-spinner" />
        </div>
    );
}
