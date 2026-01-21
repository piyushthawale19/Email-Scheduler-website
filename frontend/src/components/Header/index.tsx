'use client';

import { useState, useRef, useEffect } from 'react';
import { Search, Filter, RefreshCw, ChevronDown } from 'lucide-react';
import { useEmailStore, useUIStore } from '@/hooks/useStore';
import toast from 'react-hot-toast';

type FilterOption = 'all' | 'newest' | 'oldest' | 'starred';

export default function Header() {
    const { fetchScheduledEmails, fetchSentEmails, fetchStats, setSearchQuery, setFilterOption } = useEmailStore();
    const { activeTab, isEmailDetailOpen } = useUIStore();

    const [searchValue, setSearchValue] = useState('');
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [activeFilter, setActiveFilter] = useState<FilterOption>('newest');
    const filterRef = useRef<HTMLDivElement>(null);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilterMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRefresh = async () => {
        try {
            if (activeTab === 'scheduled') {
                await fetchScheduledEmails();
            } else {
                await fetchSentEmails();
            }
            await fetchStats();
            toast.success('Refreshed successfully');
        } catch {
            toast.error('Failed to refresh');
        }
    };

    const handleSearch = (value: string) => {
        setSearchValue(value);
        setSearchQuery(value);
    };

    const handleFilterSelect = (filter: FilterOption) => {
        setActiveFilter(filter);
        setFilterOption(filter);
        setShowFilterMenu(false);

        // Refetch with new filter
        if (activeTab === 'scheduled') {
            fetchScheduledEmails(1);
        } else {
            fetchSentEmails(1);
        }
    };

    const filterOptions: { value: FilterOption; label: string }[] = [
        { value: 'all', label: 'All Emails' },
        { value: 'newest', label: 'Newest First' },
        { value: 'oldest', label: 'Oldest First' },
        { value: 'starred', label: 'Starred Only' },
    ];

    // Hide header completely when email detail view is open
    if (isEmailDetailOpen) return null;

    return (
        <header className="header">
            {/* Search */}
            <div className="search-container">
                <div style={{ position: 'relative' }}>
                    <Search
                        size={18}
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                        }}
                    />
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Search"
                        value={searchValue}
                        onChange={(e) => handleSearch(e.target.value)}
                        style={{ paddingLeft: '40px' }}
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="header-actions">
                {/* Filter Dropdown */}
                <div ref={filterRef} style={{ position: 'relative' }}>
                    <button
                        className={`icon-btn ${showFilterMenu ? 'active' : ''}`}
                        title="Filter"
                        onClick={() => setShowFilterMenu(!showFilterMenu)}
                    >
                        <Filter size={18} />
                    </button>

                    {showFilterMenu && (
                        <div className="filter-dropdown">
                            <div className="filter-dropdown-header">
                                <span>Filter by</span>
                            </div>
                            {filterOptions.map((option) => (
                                <div
                                    key={option.value}
                                    className={`filter-dropdown-item ${activeFilter === option.value ? 'active' : ''}`}
                                    onClick={() => handleFilterSelect(option.value)}
                                >
                                    <span>{option.label}</span>
                                    {activeFilter === option.value && (
                                        <span className="filter-check">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <button className="icon-btn" onClick={handleRefresh} title="Refresh">
                    <RefreshCw size={18} />
                </button>
            </div>
        </header>
    );
}
