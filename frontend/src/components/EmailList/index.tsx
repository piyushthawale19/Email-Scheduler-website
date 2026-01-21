'use client';

import { useState, useMemo, useEffect } from 'react';
import { Star, Archive, Trash2, Clock, Send, ArrowLeft, AlertTriangle, ChevronDown, Paperclip, User } from 'lucide-react';
import { format } from 'date-fns';
import { useEmailStore, useUIStore, useAuthStore } from '@/hooks/useStore';
import { Email, EmailStatus, EmailAttachment } from '@/types';
import { emailApi } from '@/services/api';
import toast from 'react-hot-toast';

interface EmailDetailProps {
    email: Email;
    onClose: () => void;
    onDelete: (id: string) => void;
    onArchive: (id: string) => void;
    onToggleStar: (id: string) => void;
}

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmType: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

// Confirmation Modal Component
function ConfirmModal({ isOpen, title, message, confirmLabel, confirmType, onConfirm, onCancel, isLoading }: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onCancel}>
            <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
                <div className="confirm-modal-icon">
                    <AlertTriangle size={48} color={confirmType === 'danger' ? '#EF4444' : '#F59E0B'} />
                </div>
                <h3 className="confirm-modal-title">{title}</h3>
                <p className="confirm-modal-message">{message}</p>
                <div className="confirm-modal-actions">
                    <button
                        className="btn-secondary"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className={`btn-confirm ${confirmType}`}
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Processing...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Email Detail View Component - Gmail-like design matching reference
function EmailDetail({ email, onClose, onDelete, onArchive, onToggleStar }: EmailDetailProps) {
    const { user } = useAuthStore();

    // Get initials for avatar
    const getInitials = (name: string | undefined, emailAddr: string | undefined) => {
        if (name) return name.charAt(0).toUpperCase();
        if (emailAddr) return emailAddr.charAt(0).toUpperCase();
        return 'S';
    };

    // Get background color based on initial
    const getAvatarColor = (initial: string) => {
        const colors = ['#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#E91E63', '#00BCD4'];
        const index = initial.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const senderName = email.sender?.name || email.sender?.email?.split('@')[0] || 'Sender';
    const senderEmail = email.sender?.email || 'sender@example.com';
    const initial = getInitials(email.sender?.name, email.sender?.email);

    // Get recipient name from email
    const recipientName = email.recipientEmail.split('@')[0];
    const formattedRecipientName = recipientName.charAt(0).toUpperCase() + recipientName.slice(1);

    // Parse attachments from email metadata (if available)
    const attachments = email.attachments || [];

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <div className="email-detail-view">
            {/* Header - Gmail style with recipient name and subject */}
            <div className="email-detail-header">
                <button className="icon-btn" onClick={onClose} title="Back">
                    <ArrowLeft size={20} />
                </button>
                <div className="email-detail-subject-header">
                    <span className="recipient-greeting">{formattedRecipientName}, hello there!</span>
                    <span className="subject-separator">|</span>
                    <span className="subject-text">{email.subject}</span>
                </div>
                <div className="email-detail-actions">
                    <button
                        className={`icon-btn ${email.isStarred ? 'starred' : ''}`}
                        onClick={() => onToggleStar(email.id)}
                        title="Star"
                    >
                        <Star size={18} fill={email.isStarred ? '#F59E0B' : 'none'} color={email.isStarred ? '#F59E0B' : 'currentColor'} />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => onArchive(email.id)}
                        title="Archive"
                    >
                        <Archive size={18} />
                    </button>
                    <button
                        className="icon-btn"
                        onClick={() => onDelete(email.id)}
                        title="Delete"
                    >
                        <Trash2 size={18} />
                    </button>
                    <div className="header-divider"></div>
                    <div className="user-profile-icon" title="Profile" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                            src={user?.avatar || '/default-avatar.png'}
                            alt={user?.name || 'User'}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '9999px',
                                objectFit: 'cover',
                                border: '1px solid var(--border)'
                            }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.name || 'U');
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Email Content */}
            <div className="email-detail-content">
                {/* Sender Info Row */}
                <div className="email-detail-sender-row">
                    <div
                        className="sender-avatar-circle"
                        style={{ backgroundColor: getAvatarColor(initial) }}
                    >
                        {initial}
                    </div>
                    <div className="sender-details">
                        <div className="sender-name-row">
                            <span className="sender-display-name">{senderName}</span>
                            <span className="sender-email-address">&lt;{senderEmail}&gt;</span>
                        </div>
                        <div className="sender-to-line">
                            to me <ChevronDown size={14} />
                        </div>
                    </div>
                    <div className="email-timestamp">
                        {email.sentAt
                            ? format(new Date(email.sentAt), 'MMM d, h:mm a')
                            : format(new Date(email.scheduledAt), 'MMM d, h:mm a')
                        }
                    </div>
                </div>

                {/* Email Body */}
                <div
                    className="email-body-content"
                    dangerouslySetInnerHTML={{ __html: email.body }}
                />

                {/* Attachments Section */}
                {attachments.length > 0 && (
                    <div className="email-attachments-section">
                        <div className="attachments-header">
                            <Paperclip size={16} />
                            <span>{attachments.length} Attachment{attachments.length > 1 ? 's' : ''}</span>
                        </div>
                        <div className="attachments-grid">
                            {attachments.map((attachment, index) => {
                                // Construct attachment URL
                                const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
                                const attachmentUrl = `${API_URL}/emails/${email.id}/attachments/${index}`;
                                return (
                                    <a
                                        key={index}
                                        href={attachmentUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="attachment-card clickable"
                                        style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                                    >
                                        {attachment.preview ? (
                                            <div className="attachment-preview">
                                                <img src={attachment.preview} alt={attachment.filename} />
                                            </div>
                                        ) : (
                                            <div className="attachment-icon">
                                                <Paperclip size={24} />
                                            </div>
                                        )}
                                        <div className="attachment-info">
                                            <span className="attachment-name">{attachment.filename}</span>
                                            <span className="attachment-size">{formatFileSize(attachment.size)}</span>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function EmailList() {
    const {
        scheduledEmails,
        sentEmails,
        isLoading,
        fetchScheduledEmails,
        fetchSentEmails,
        fetchStats,
        scheduledPagination,
        sentPagination,
        searchQuery,
        filterOption
    } = useEmailStore();
    const { activeTab, setEmailDetailOpen } = useUIStore();

    // Local state
    const [starredEmails, setStarredEmails] = useState<Set<string>>(new Set());
    const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
    const [deletedEmails, setDeletedEmails] = useState<Set<string>>(new Set());
    const [archivedEmails, setArchivedEmails] = useState<Set<string>>(new Set());

    // Confirmation modal state
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        type: 'delete' | 'archive';
        emailId: string;
        emailSubject: string;
    } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const emails = activeTab === 'scheduled' ? scheduledEmails : sentEmails;
    const pagination = activeTab === 'scheduled' ? scheduledPagination : sentPagination;
    const fetchMore = activeTab === 'scheduled' ? fetchScheduledEmails : fetchSentEmails;

    // Auto-refresh interval to keep statuses updated
    useEffect(() => {
        const interval = setInterval(() => {
            // Only refresh the active tab's first page to catch status updates
            if (activeTab === 'scheduled') {
                fetchScheduledEmails(1);
            } else {
                fetchSentEmails(1);
            }
            fetchStats();
        }, 5000); // Refresh every 5 seconds

        return () => clearInterval(interval);
    }, [activeTab, fetchScheduledEmails, fetchSentEmails, fetchStats]);

    // Apply search and filter, and exclude deleted/archived emails
    const filteredEmails = useMemo(() => {
        let result = [...emails];

        // Exclude deleted and archived emails
        result = result.filter(email =>
            !deletedEmails.has(email.id) && !archivedEmails.has(email.id)
        );

        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(email =>
                email.subject.toLowerCase().includes(query) ||
                email.recipientEmail.toLowerCase().includes(query) ||
                email.body.toLowerCase().includes(query)
            );
        }

        // Apply starred filter
        if (filterOption === 'starred') {
            result = result.filter(email => starredEmails.has(email.id));
        }

        // Add isStarred property
        result = result.map(email => ({
            ...email,
            isStarred: starredEmails.has(email.id)
        }));

        return result;
    }, [emails, searchQuery, filterOption, starredEmails, deletedEmails, archivedEmails]);

    const handleToggleStar = (emailId: string) => {
        setStarredEmails(prev => {
            const newSet = new Set(prev);
            if (newSet.has(emailId)) {
                newSet.delete(emailId);
            } else {
                newSet.add(emailId);
            }
            return newSet;
        });
    };

    // Show delete confirmation
    const showDeleteConfirm = (emailId: string, emailSubject: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'delete',
            emailId,
            emailSubject
        });
    };

    // Show archive confirmation
    const showArchiveConfirm = (emailId: string, emailSubject: string) => {
        setConfirmModal({
            isOpen: true,
            type: 'archive',
            emailId,
            emailSubject
        });
    };

    // Handle confirmed delete
    const handleConfirmDelete = async () => {
        if (!confirmModal) return;

        setIsProcessing(true);
        try {
            await emailApi.cancel(confirmModal.emailId);

            // Add to deleted set to remove from UI
            setDeletedEmails(prev => new Set([...prev, confirmModal.emailId]));

            toast.success('Email deleted successfully');
            setSelectedEmail(null);

            // Refresh stats
            fetchStats();
        } catch (error) {
            console.error('Failed to delete email:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete email');
        } finally {
            setIsProcessing(false);
            setConfirmModal(null);
        }
    };

    // Handle confirmed archive
    const handleConfirmArchive = async () => {
        if (!confirmModal) return;

        setIsProcessing(true);
        try {
            // For now, archive just removes from the list locally
            // In production, you'd have an archive API endpoint
            setArchivedEmails(prev => new Set([...prev, confirmModal.emailId]));

            toast.success('Email archived successfully');
            setSelectedEmail(null);
        } catch (error) {
            console.error('Failed to archive email:', error);
            toast.error('Failed to archive email');
        } finally {
            setIsProcessing(false);
            setConfirmModal(null);
        }
    };

    // Cancel confirmation
    const handleCancelConfirm = () => {
        setConfirmModal(null);
    };

    // Handle delete button click
    const handleDelete = (emailId: string) => {
        const email = emails.find(e => e.id === emailId);
        showDeleteConfirm(emailId, email?.subject || 'this email');
    };

    // Handle archive button click
    const handleArchive = (emailId: string) => {
        const email = emails.find(e => e.id === emailId);
        showArchiveConfirm(emailId, email?.subject || 'this email');
    };

    const handleLoadMore = () => {
        fetchMore(pagination.page + 1);
    };

    const getStatusClass = (status: EmailStatus): string => {
        switch (status) {
            case 'SCHEDULED':
                return 'scheduled';
            case 'PROCESSING':
                return 'processing';
            case 'SENT':
                return 'sent';
            case 'FAILED':
                return 'failed';
            case 'RATE_LIMITED':
                return 'rate-limited';
            default:
                return '';
        }
    };

    const getStatusLabel = (status: EmailStatus): string => {
        switch (status) {
            case 'RATE_LIMITED':
                return 'Rate Limited';
            default:
                return status;
        }
    };

    // Show email detail view
    if (selectedEmail) {
        return (
            <>
                <EmailDetail
                    email={{ ...selectedEmail, isStarred: starredEmails.has(selectedEmail.id) }}
                    onClose={() => { setSelectedEmail(null); setEmailDetailOpen(false); }}
                    onDelete={handleDelete}
                    onArchive={handleArchive}
                    onToggleStar={handleToggleStar}
                />

                {/* Confirmation Modal */}
                {confirmModal && (
                    <ConfirmModal
                        isOpen={confirmModal.isOpen}
                        title={confirmModal.type === 'delete' ? 'Delete Email?' : 'Archive Email?'}
                        message={confirmModal.type === 'delete'
                            ? `Are you sure you want to delete "${confirmModal.emailSubject}"? This action cannot be undone.`
                            : `Are you sure you want to archive "${confirmModal.emailSubject}"?`
                        }
                        confirmLabel={confirmModal.type === 'delete' ? 'Delete' : 'Archive'}
                        confirmType={confirmModal.type === 'delete' ? 'danger' : 'warning'}
                        onConfirm={confirmModal.type === 'delete' ? handleConfirmDelete : handleConfirmArchive}
                        onCancel={handleCancelConfirm}
                        isLoading={isProcessing}
                    />
                )}
            </>
        );
    }

    // Loading state
    if (isLoading && emails.length === 0) {
        return (
            <div className="email-list-container">
                <div className="loading-container">
                    <div className="loading-spinner" />
                </div>
            </div>
        );
    }

    // Empty state
    if (filteredEmails.length === 0) {
        return (
            <div className="email-list-container">
                <div className="empty-state">
                    <div className="empty-state-icon">
                        {activeTab === 'scheduled' ? <Clock size={32} /> : <Send size={32} />}
                    </div>
                    <div className="empty-state-title">
                        {searchQuery
                            ? 'No emails found'
                            : activeTab === 'scheduled'
                                ? 'No scheduled emails'
                                : 'No sent emails'
                        }
                    </div>
                    <div className="empty-state-text">
                        {searchQuery
                            ? 'Try adjusting your search query'
                            : activeTab === 'scheduled'
                                ? 'Schedule your first email by clicking the Compose button'
                                : 'Sent emails will appear here'
                        }
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="email-list-container">
                {/* Email Items - Clean list matching Figma design */}
                {filteredEmails.map((email) => (
                    <div
                        key={email.id}
                        className="email-item-clean"
                        onClick={() => { setSelectedEmail(email); setEmailDetailOpen(true); }}
                    >
                        {/* Recipient Column */}
                        <div className="email-recipient-col">
                            <span className="to-label">To:</span>
                            <span className="recipient-name">{email.recipientEmail.split('@')[0]}</span>
                        </div>

                        {/* Status Badge */}
                        <div className={`status-badge-clean ${getStatusClass(email.status)}`} style={{ display: 'flex', alignItems: 'center' }}>
                            {email.status === 'SCHEDULED' ? (
                                <>
                                    <Clock size={14} style={{ marginRight: 6 }} />
                                    {email.scheduledAt ? format(new Date(email.scheduledAt), 'EEE h:mm:ss a') : 'Scheduled'}
                                </>
                            ) : (
                                getStatusLabel(email.status)
                            )}
                        </div>

                        {/* Subject and Preview */}
                        <div className="email-content-col">
                            {email.attachments && email.attachments.length > 0 && (
                                <Paperclip size={14} style={{ marginRight: '4px', color: '#9CA3AF' }} />
                            )}
                            <span className="email-subject-text">{email.subject}</span>
                            <span className="email-preview-text">
                                - {email.body.replace(/<[^>]*>/g, '').substring(0, 60)}...
                            </span>
                        </div>

                        {/* Star on right */}
                        <button
                            className={`star-btn-right ${email.isStarred ? 'starred' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleToggleStar(email.id);
                            }}
                        >
                            <Star size={18} fill={email.isStarred ? '#F59E0B' : 'none'} color={email.isStarred ? '#F59E0B' : '#D1D5DB'} />
                        </button>
                    </div>
                ))}

                {/* Load More */}
                {pagination.hasMore && (
                    <div className="load-more-container">
                        <button
                            className="btn-secondary"
                            onClick={handleLoadMore}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Loading...' : 'Load More'}
                        </button>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal && (
                <ConfirmModal
                    isOpen={confirmModal.isOpen}
                    title={confirmModal.type === 'delete' ? 'Delete Email?' : 'Archive Email?'}
                    message={confirmModal.type === 'delete'
                        ? `Are you sure you want to delete "${confirmModal.emailSubject}"? This action cannot be undone.`
                        : `Are you sure you want to archive "${confirmModal.emailSubject}"?`
                    }
                    confirmLabel={confirmModal.type === 'delete' ? 'Delete' : 'Archive'}
                    confirmType={confirmModal.type === 'delete' ? 'danger' : 'warning'}
                    onConfirm={confirmModal.type === 'delete' ? handleConfirmDelete : handleConfirmArchive}
                    onCancel={handleCancelConfirm}
                    isLoading={isProcessing}
                />
            )}
        </>
    );
}
