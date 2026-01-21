'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
    ArrowLeft,
    Paperclip,
    Clock,
    ChevronDown,
    Upload,
    X,
    Bold,
    Italic,
    Underline,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    Undo,
    Redo,
    Quote,
    Code,
    Strikethrough,
    Type,
    Image as ImageIcon,
    File
} from 'lucide-react';
import { format, addHours, addDays, setHours, setMinutes } from 'date-fns';
import Papa from 'papaparse';
import { useUIStore, useSenderStore, useEmailStore } from '@/hooks/useStore';
import { emailApi } from '@/services/api';
import toast from 'react-hot-toast';

interface Attachment {
    file: File;
    preview?: string;
}

export default function ComposeEmail() {
    const { isComposeOpen, setComposeOpen } = useUIStore();
    const { senders, getDefaultSender } = useSenderStore();
    const { fetchScheduledEmails, fetchStats } = useEmailStore();

    // Form state
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipients, setRecipients] = useState<string[]>([]);
    const [recipientInput, setRecipientInput] = useState('');
    const [selectedSenderId, setSelectedSenderId] = useState<string>('');
    const [delayBetweenEmails, setDelayBetweenEmails] = useState(30);
    const [hourlyLimit, setHourlyLimit] = useState(50);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Schedule state
    const [showSchedulePopup, setShowSchedulePopup] = useState(false);
    const [scheduledTime, setScheduledTime] = useState<Date | null>(null);
    const [customDateTime, setCustomDateTime] = useState('');

    // Attachments state
    const [attachments, setAttachments] = useState<Attachment[]>([]);

    // Refs
    const recipientFileInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);
    const schedulePopupRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<HTMLDivElement>(null);

    // Set default sender
    useEffect(() => {
        const defaultSender = getDefaultSender();
        if (defaultSender && !selectedSenderId) {
            setSelectedSenderId(defaultSender.id);
        }
    }, [senders, getDefaultSender, selectedSenderId]);

    // Close schedule popup when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (schedulePopupRef.current && !schedulePopupRef.current.contains(event.target as Node)) {
                setShowSchedulePopup(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleClose = () => {
        setComposeOpen(false);
        resetForm();
    };

    const resetForm = () => {
        setSubject('');
        setBody('');
        setRecipients([]);
        setRecipientInput('');
        setScheduledTime(null);
        setCustomDateTime('');
        setAttachments([]);
        if (editorRef.current) {
            editorRef.current.innerHTML = '';
        }
    };

    // Add recipient on Enter or comma
    const handleRecipientKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addRecipient(recipientInput);
        }
    };

    const addRecipient = (email: string) => {
        const trimmed = email.trim().replace(',', '');
        if (trimmed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) && !recipients.includes(trimmed)) {
            setRecipients([...recipients, trimmed]);
            setRecipientInput('');
        }
    };

    const removeRecipient = (email: string) => {
        setRecipients(recipients.filter(r => r !== email));
    };

    // Parse recipient file (CSV or TXT)
    const handleRecipientFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;

            if (file.name.endsWith('.csv')) {
                Papa.parse(content, {
                    complete: (results) => {
                        const emails: string[] = [];
                        results.data.forEach((row: unknown) => {
                            if (Array.isArray(row)) {
                                row.forEach((cell: unknown) => {
                                    if (typeof cell === 'string') {
                                        const email = cell.trim();
                                        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                                            emails.push(email);
                                        }
                                    }
                                });
                            }
                        });
                        setRecipients([...new Set([...recipients, ...emails])]);
                        toast.success(`Added ${emails.length} recipients`);
                    }
                });
            } else {
                // Plain text - one email per line
                const emails = content
                    .split(/[\n,;]/)
                    .map(e => e.trim())
                    .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
                setRecipients([...new Set([...recipients, ...emails])]);
                toast.success(`Added ${emails.length} recipients`);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // Handle attachment upload
    const handleAttachmentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        const newAttachments: Attachment[] = [];
        const maxSize = 25 * 1024 * 1024; // 25MB

        Array.from(files).forEach(file => {
            if (file.size > maxSize) {
                toast.error(`${file.name} is too large (max 25MB)`);
                return;
            }

            const attachment: Attachment = { file };

            // Create preview for images
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    attachment.preview = e.target?.result as string;
                    setAttachments(prev => [...prev]);
                };
                reader.readAsDataURL(file);
            }

            newAttachments.push(attachment);
        });

        setAttachments(prev => [...prev, ...newAttachments]);
        e.target.value = '';
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    // Schedule options
    const handleScheduleOption = (option: string) => {
        const now = new Date();
        let time: Date;

        switch (option) {
            case 'in1hour':
                time = addHours(now, 1);
                break;
            case 'in4hours':
                time = addHours(now, 4);
                break;
            case 'tomorrow9am':
                time = setMinutes(setHours(addDays(now, 1), 9), 0);
                break;
            case 'tomorrow1pm':
                time = setMinutes(setHours(addDays(now, 1), 13), 0);
                break;
            default:
                return;
        }

        setScheduledTime(time);
        setShowSchedulePopup(false);
    };

    const handleCustomDateTime = () => {
        if (customDateTime) {
            setScheduledTime(new Date(customDateTime));
            setShowSchedulePopup(false);
        }
    };

    // Toolbar actions for rich text editing
    const execCommand = (command: string, value?: string) => {
        document.execCommand(command, false, value);
        editorRef.current?.focus();
    };

    // Handle submit
    const handleSubmit = async (sendNow: boolean = false) => {
        if (recipients.length === 0) {
            toast.error('Please add at least one recipient');
            return;
        }
        if (!subject.trim()) {
            toast.error('Please enter a subject');
            return;
        }

        // Get content from editor
        const emailBody = editorRef.current?.innerHTML || body;
        if (!emailBody.trim()) {
            toast.error('Please enter an email body');
            return;
        }

        const startTime = sendNow ? new Date() : (scheduledTime || new Date());

        // Build the request object - only include senderId if it's a valid value
        const requestData = {
            subject,
            body: emailBody,
            recipients,
            startTime: startTime.toISOString(),
            delayBetweenEmails,
            hourlyLimit,
            ...(selectedSenderId ? { senderId: selectedSenderId } : {}),
            files: attachments.map(att => att.file) // Include attachment files
        };

        try {
            setIsSubmitting(true);
            console.log('Scheduling emails with data:', { ...requestData, body: requestData.body.substring(0, 100) + '...' });
            await emailApi.schedule(requestData);

            toast.success(`${recipients.length} email(s) scheduled successfully!`);
            handleClose();
            fetchScheduledEmails();
            fetchStats();
        } catch (error: unknown) {
            console.error('Failed to schedule emails:', error);

            // Extract error message from axios error or Error object
            let errorMessage = 'Failed to schedule emails';
            if (error && typeof error === 'object') {
                if ('message' in error && typeof error.message === 'string') {
                    errorMessage = error.message;
                }
                // Check for axios error response
                if ('response' in error && error.response && typeof error.response === 'object') {
                    const response = error.response as { data?: { error?: string } };
                    if (response.data?.error) {
                        errorMessage = response.data.error;
                    }
                }
            }

            toast.error(errorMessage);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isComposeOpen) return null;

    return (
        <div className="compose-fullpage">
            {/* Header */}
            <div className="compose-header">
                <div className="compose-header-left">
                    <button className="icon-btn" onClick={handleClose}>
                        <ArrowLeft size={20} />
                    </button>
                    <span className="compose-title">Compose New Email</span>
                </div>
                <div className="compose-header-actions">
                    <button
                        className="icon-btn relative"
                        onClick={() => attachmentInputRef.current?.click()}
                        title="Attach files"
                        style={{ color: '#00A63E' }}
                    >
                        <Paperclip size={20} />
                        {attachments.length > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[10px] text-gray-900 border border-white">
                                {attachments.length}
                            </span>
                        )}
                    </button>

                    {/* Clock Icon (Independent) */}
                    <button
                        className="icon-btn"
                        onClick={() => setShowSchedulePopup(!showSchedulePopup)}
                        style={{ color: '#00A63E' }}
                    >
                        <Clock size={20} />
                    </button>

                    {/* Schedule Button with Popup */}
                    <div className="schedule-button-wrapper" ref={schedulePopupRef}>
                        {/* <button
                            className={`send-later-btn ${showSchedulePopup ? 'active' : ''}`}
                            onClick={() => setShowSchedulePopup(!showSchedulePopup)}
                            style={{
                                borderColor: '#00A63E',
                                color: '#00A63E',
                                padding: '6px 20px',
                                borderRadius: '9999px',
                                background: 'transparent'
                            }}
                        >
                            <span>Send Later</span>
                        </button> */}

                        {/* Schedule Popup - 318x364 dropdown */}
                        {showSchedulePopup && (
                            <div className="schedule-popup">
                                <div className="schedule-header">
                                    <div className="schedule-title">Schedule send</div>
                                    <div className="schedule-subtitle">
                                        {format(new Date(), 'EEEE, MMMM d, yyyy')}
                                    </div>
                                </div>

                                <div className="schedule-option" onClick={() => handleScheduleOption('in1hour')}>
                                    <span>In 1 hour</span>
                                    <span className="schedule-time">
                                        {format(addHours(new Date(), 1), 'h:mm a')}
                                    </span>
                                </div>
                                <div className="schedule-option" onClick={() => handleScheduleOption('in4hours')}>
                                    <span>In 4 hours</span>
                                    <span className="schedule-time">
                                        {format(addHours(new Date(), 4), 'h:mm a')}
                                    </span>
                                </div>
                                <div className="schedule-option" onClick={() => handleScheduleOption('tomorrow9am')}>
                                    <span>Tomorrow morning</span>
                                    <span className="schedule-time">9:00 AM</span>
                                </div>
                                <div className="schedule-option" onClick={() => handleScheduleOption('tomorrow1pm')}>
                                    <span>Tomorrow afternoon</span>
                                    <span className="schedule-time">1:00 PM</span>
                                </div>

                                {/* Custom Date/Time */}
                                <div className="schedule-custom">
                                    <input
                                        type="datetime-local"
                                        value={customDateTime}
                                        onChange={(e) => {
                                            setCustomDateTime(e.target.value);
                                            // Auto-set scheduled time when user picks a date/time
                                            if (e.target.value) {
                                                setScheduledTime(new Date(e.target.value));
                                            }
                                        }}
                                        className="schedule-datetime-picker"
                                    />
                                </div>

                                <div className="schedule-footer">
                                    <button className="btn-secondary" onClick={() => {
                                        setShowSchedulePopup(false);
                                        setCustomDateTime('');
                                        setScheduledTime(null);
                                    }}>
                                        Cancel
                                    </button>
                                    <button
                                        className="btn-done"
                                        onClick={() => {
                                            if (customDateTime) {
                                                setScheduledTime(new Date(customDateTime));
                                            }
                                            setShowSchedulePopup(false);
                                        }}
                                        disabled={!customDateTime}
                                    >
                                        Schedule
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        className="send-btn"
                        onClick={() => handleSubmit(scheduledTime === null)}
                        disabled={isSubmitting || recipients.length === 0}
                    >
                        {isSubmitting ? 'Sending...' : scheduledTime ? `Send at ${format(scheduledTime, 'h:mm a')}` : 'Send'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="compose-main">
                <div className="compose-form-section">
                    {/* From */}
                    <div className="compose-row">
                        <label className="compose-label">From</label>
                        <div className="compose-field">
                            <select
                                className="compose-select"
                                value={selectedSenderId}
                                onChange={(e) => setSelectedSenderId(e.target.value)}
                            >
                                {senders.map(sender => (
                                    <option key={sender.id} value={sender.id}>
                                        {sender.name} &lt;{sender.email}&gt;
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* To */}
                    <div className="compose-row">
                        <label className="compose-label">To</label>
                        <div className="compose-field to-field">
                            <div className="recipients-container">
                                {/* Show first 3 recipients, then overflow badge */}
                                {recipients.slice(0, 3).map(email => (
                                    <span key={email} className="recipient-tag">
                                        {email}
                                        <X
                                            size={12}
                                            className="recipient-remove"
                                            onClick={() => removeRecipient(email)}
                                        />
                                    </span>
                                ))}
                                {recipients.length > 3 && (
                                    <span className="recipients-overflow-badge">
                                        +{recipients.length - 3}
                                    </span>
                                )}
                                <input
                                    type="text"
                                    className="recipient-input"
                                    placeholder={recipients.length === 0 ? 'Add recipients...' : ''}
                                    value={recipientInput}
                                    onChange={(e) => setRecipientInput(e.target.value)}
                                    onKeyDown={handleRecipientKeyDown}
                                    onBlur={() => recipientInput && addRecipient(recipientInput)}
                                />
                            </div>
                            <button
                                className="upload-list-btn"
                                onClick={() => recipientFileInputRef.current?.click()}
                            >
                                <Upload size={14} />
                                Upload List
                            </button>
                        </div>
                    </div>



                    {/* Subject */}
                    <div className="compose-row">
                        <label className="compose-label">Subject</label>
                        <div className="compose-field">
                            <input
                                type="text"
                                className="compose-input"
                                placeholder="Enter email subject..."
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Scheduling Options */}
                    <div className="compose-scheduling">
                        <div className="scheduling-field">
                            <span className="scheduling-label">Delay between emails:</span>
                            <input
                                type="number"
                                className="scheduling-input"
                                value={delayBetweenEmails}
                                onChange={(e) => setDelayBetweenEmails(parseInt(e.target.value) || 30)}
                                min={1}
                            />
                            <span className="scheduling-unit">sec</span>
                        </div>
                        <div className="scheduling-field">
                            <span className="scheduling-label">Hourly limit:</span>
                            <input
                                type="number"
                                className="scheduling-input"
                                value={hourlyLimit}
                                onChange={(e) => setHourlyLimit(parseInt(e.target.value) || 50)}
                                min={1}
                            />
                            <span className="scheduling-unit">/hr</span>
                        </div>
                    </div>

                    {/* Editor Container with Toolbar at TOP */}
                    <div className="compose-editor-container">
                        {/* Toolbar at TOP */}
                        <div className="compose-toolbar">
                            <button className="toolbar-icon" onClick={() => execCommand('undo')} title="Undo">
                                <Undo size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('redo')} title="Redo">
                                <Redo size={16} />
                            </button>
                            <div className="toolbar-divider" />
                            <button className="toolbar-btn" title="Font Size">
                                <Type size={14} />
                                <ChevronDown size={10} />
                            </button>
                            <div className="toolbar-divider" />
                            <button className="toolbar-icon" onClick={() => execCommand('bold')} title="Bold">
                                <Bold size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('italic')} title="Italic">
                                <Italic size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('underline')} title="Underline">
                                <Underline size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('strikeThrough')} title="Strikethrough">
                                <Strikethrough size={16} />
                            </button>
                            <div className="toolbar-divider" />
                            <button className="toolbar-icon" onClick={() => execCommand('justifyLeft')} title="Align Left">
                                <AlignLeft size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('justifyCenter')} title="Align Center">
                                <AlignCenter size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('justifyRight')} title="Align Right">
                                <AlignRight size={16} />
                            </button>
                            <div className="toolbar-divider" />
                            <button className="toolbar-icon" onClick={() => execCommand('insertUnorderedList')} title="Bullet List">
                                <List size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('insertOrderedList')} title="Numbered List">
                                <ListOrdered size={16} />
                            </button>
                            <div className="toolbar-divider" />
                            <button className="toolbar-icon" onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote">
                                <Quote size={16} />
                            </button>
                            <button className="toolbar-icon" onClick={() => execCommand('formatBlock', 'pre')} title="Code">
                                <Code size={16} />
                            </button>
                        </div>

                        {/* Editable Content Area */}
                        <div
                            ref={editorRef}
                            className="compose-editor"
                            contentEditable
                            data-placeholder="Compose your email here..."
                            onInput={(e) => setBody((e.target as HTMLDivElement).innerHTML)}
                        />

                        {/* Attachment Thumbnails */}
                        {attachments.length > 0 && (
                            <div className="attachments-thumbnails">
                                {attachments.map((attachment, index) => (
                                    <div key={index} className="attachment-thumbnail">
                                        {attachment.preview ? (
                                            <img src={attachment.preview} alt={attachment.file.name} className="attachment-thumb-image" />
                                        ) : (
                                            <div className="attachment-thumb-file">
                                                <File size={24} />
                                            </div>
                                        )}
                                        <div className="attachment-thumb-info">
                                            <span className="attachment-thumb-name">{attachment.file.name}</span>
                                            <span className="attachment-thumb-size">{formatFileSize(attachment.file.size)}</span>
                                        </div>
                                        <button
                                            className="attachment-thumb-remove"
                                            onClick={() => removeAttachment(index)}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Hidden file inputs */}
            <input
                ref={recipientFileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleRecipientFileUpload}
                style={{ display: 'none' }}
            />
            <input
                ref={attachmentInputRef}
                type="file"
                multiple
                onChange={handleAttachmentUpload}
                style={{ display: 'none' }}
            />
        </div>
    );
}
