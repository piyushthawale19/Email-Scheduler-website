import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ONB Email Scheduler - Professional Email Scheduling Platform",
    description: "Schedule, manage, and track your email campaigns with our production-grade email scheduler. Built with advanced queuing, rate limiting, and real-time tracking.",
    keywords: ["email scheduler", "email automation", "email campaigns", "BullMQ", "email marketing"],
    authors: [{ name: "ONB Team" }],
    openGraph: {
        title: "ONB Email Scheduler",
        description: "Professional Email Scheduling Platform",
        type: "website",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={inter.className}>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1F2937',
                            color: '#fff',
                            padding: '12px 16px',
                            borderRadius: '8px',
                        },
                        success: {
                            iconTheme: {
                                primary: '#10B981',
                                secondary: '#fff',
                            },
                        },
                        error: {
                            iconTheme: {
                                primary: '#EF4444',
                                secondary: '#fff',
                            },
                        },
                    }}
                />
            </body>
        </html>
    );
}
