'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, Send, LogOut, ChevronDown, User, Camera, Edit2, Settings } from 'lucide-react';
import { useAuthStore, useEmailStore, useUIStore } from '@/hooks/useStore';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function Sidebar() {
    const router = useRouter();
    const { user, logout, setUser } = useAuthStore();
    const { stats } = useEmailStore();
    const { activeTab, setActiveTab, setComposeOpen } = useUIStore();

    // Profile menu state
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editName, setEditName] = useState(user?.name || '');
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const profileMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            toast.success('Logged out successfully');
            router.push('/login');
        } catch {
            toast.error('Failed to logout');
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveProfile = () => {
        // Update user profile (in a real app, this would call an API)
        if (user) {
            setUser({
                ...user,
                name: editName,
                avatar: avatarPreview || user.avatar
            });
            toast.success('Profile updated successfully');
            setShowEditModal(false);
        }
    };

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <img src="/logo.png" alt="ONB" className="sidebar-logo-img" />
            </div>

            {/* User Info with Dropdown */}
            <div className="user-info-wrapper" ref={profileMenuRef}>
                <div
                    className="user-info"
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    style={{ cursor: 'pointer' }}
                >
                    <img
                        src={user?.avatar || '/default-avatar.png'}
                        alt={user?.name || 'User'}
                        className="user-avatar"
                        onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'U');
                        }}
                    />
                    <div className="user-details">
                        <div className="user-name">{user?.name || 'User'}</div>
                        <div className="user-email">{user?.email || ''}</div>
                    </div>
                    <ChevronDown
                        size={16}
                        style={{
                            color: 'var(--text-muted)',
                            transition: 'transform 0.2s',
                            transform: showProfileMenu ? 'rotate(180deg)' : 'rotate(0deg)'
                        }}
                    />
                </div>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                    <div className="profile-menu">
                        <div className="profile-menu-header">
                            <img
                                src={user?.avatar || '/default-avatar.png'}
                                alt={user?.name || 'User'}
                                className="profile-menu-avatar"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'U');
                                }}
                            />
                            <div>
                                <div className="profile-menu-name">{user?.name || 'User'}</div>
                                <div className="profile-menu-email">{user?.email || ''}</div>
                            </div>
                        </div>
                        <div className="profile-menu-divider" />
                        <div
                            className="profile-menu-item"
                            onClick={() => {
                                setShowProfileMenu(false);
                                setEditName(user?.name || '');
                                setAvatarPreview(user?.avatar || '');
                                setShowEditModal(true);
                            }}
                        >
                            <Edit2 size={16} />
                            <span>Edit Profile</span>
                        </div>
                        <div
                            className="profile-menu-item"
                            onClick={() => {
                                fileInputRef.current?.click();
                                setShowProfileMenu(false);
                            }}
                        >
                            <Camera size={16} />
                            <span>Change Avatar</span>
                        </div>
                        <div className="profile-menu-item">
                            <Settings size={16} />
                            <span>Settings</span>
                        </div>
                        <div className="profile-menu-divider" />
                        <div
                            className="profile-menu-item profile-menu-item-danger"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            <span>Logout</span>
                        </div>
                    </div>
                )}

                {/* Hidden file input for avatar */}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    style={{ display: 'none' }}
                />
            </div>

            {/* Compose Button */}
            <button className="compose-btn" onClick={() => setComposeOpen(true)}>
                Compose
            </button>

            {/* Navigation */}
            <div className="sidebar-section-title">CORE</div>
            <nav className="sidebar-nav">
                <div
                    className={`nav-item ${activeTab === 'scheduled' ? 'active' : ''}`}
                    onClick={() => setActiveTab('scheduled')}
                >
                    <Clock size={18} />
                    <span>Scheduled</span>
                    {stats && stats.scheduled > 0 && (
                        <span className="nav-item-count">{stats.scheduled}</span>
                    )}
                </div>
                <div
                    className={`nav-item ${activeTab === 'sent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sent')}
                >
                    <Send size={18} />
                    <span>Sent</span>
                    {stats && stats.sent > 0 && (
                        <span className="nav-item-count">{stats.sent}</span>
                    )}
                </div>
            </nav>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Profile</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowEditModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="avatar-edit-section">
                                <div className="avatar-preview-wrapper">
                                    <img
                                        src={avatarPreview || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(editName || 'U')}
                                        alt="Avatar Preview"
                                        className="avatar-preview"
                                    />
                                    <button
                                        className="avatar-edit-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Camera size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Enter your name"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    value={user?.email || ''}
                                    disabled
                                    style={{ background: 'var(--bg-secondary)', cursor: 'not-allowed' }}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => setShowEditModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveProfile}
                                style={{ marginTop: 0, width: 'auto', padding: '10px 24px' }}
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
