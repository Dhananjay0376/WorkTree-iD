import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from './ui';
import type { AuthUser } from '../lib/storage';
import { searchUsersByUsername } from '../lib/firestore';
import { useNavigate } from 'react-router-dom';

interface UserSearchInputProps {
    onSelect?: (user: AuthUser) => void;
    placeholder?: string;
    className?: string;
    autoNavigate?: boolean; // if true, navigates to profile on selection
}

export function UserSearchInput({ onSelect, placeholder = "Search users...", className = "", autoNavigate = false }: UserSearchInputProps) {
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<AuthUser[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (query.trim().length >= 2) {
                searchUsersByUsername(query).then(users => {
                    setSuggestions(users);
                    setIsOpen(true);
                });
            } else {
                setSuggestions([]);
                setIsOpen(false);
            }
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [query]);

    const handleSelect = (user: AuthUser) => {
        setQuery(user.username || user.id);
        setIsOpen(false);
        if (onSelect) onSelect(user);
        if (autoNavigate) {
            navigate(`/u/${user.id}`);
            setQuery(''); // clear after nav
        }
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="pl-9"
                    onFocus={() => {
                        if (suggestions.length > 0) setIsOpen(true);
                    }}
                />
                {query && (
                    <button
                        onClick={() => { setQuery(''); setIsOpen(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1a1a] p-1 shadow-xl z-50">
                    {suggestions.map(user => (
                        <button
                            key={user.id}
                            onClick={() => handleSelect(user)}
                            className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-white/5 transition-colors"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300">
                                {(user.displayName?.[0] || user.email[0]).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium text-white">
                                    {user.displayName || 'Anonymous'}
                                </div>
                                <div className="truncate text-xs text-white/50">
                                    @{user.username || user.id.slice(0, 8)}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
