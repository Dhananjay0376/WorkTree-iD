import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from './ui';
import type { CollaborationRequest } from '../lib/firestore';
import { subscribeToRequests, respondToRequest, acceptTeamUp, subscribeToSentRequests, finalizeTeamUp, markNotificationsAsSeen, getUserProfile } from '../lib/firestore';
import { formatDate } from '../lib/utils';

export function NotificationBell({ userId }: { userId: string | null }) {
    const [requests, setRequests] = useState<CollaborationRequest[]>([]);
    const [lastSeen, setLastSeen] = useState<number>(0);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!userId) {
            setRequests([]);
            setLastSeen(0);
            return;
        }

        // Fetch initials for lastSeen
        getUserProfile(userId).then(p => {
            if (p) setLastSeen(p.lastViewedNotifications || 0);
        });

        const unsubscribe = subscribeToRequests(userId, (reqs) => {
            setRequests(reqs);
        });
        const unsubscribeSent = subscribeToSentRequests(userId, (sent) => {
            sent.forEach(req => {
                if (req.type === 'team_up' && req.status === 'accepted') {
                    finalizeTeamUp(req.fromUserId, req.toUserId);
                }
            });
        });
        return () => {
            if (unsubscribe) unsubscribe();
            if (unsubscribeSent) unsubscribeSent();
        };
    }, [userId]);

    // Update lastSeen when bell is opened
    useEffect(() => {
        if (isOpen && userId) {
            markNotificationsAsSeen(userId);
            setLastSeen(Date.now());
        }
    }, [isOpen, userId]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRespond = async (req: CollaborationRequest, status: 'accepted' | 'rejected') => {
        // Optimistic update
        setRequests(prev => prev.filter(r => r.id !== req.id));

        if (status === 'accepted' && req.type === 'team_up') {
            await acceptTeamUp(req.id, req.fromUserId, req.toUserId);
        } else {
            await respondToRequest(req.id, status);
        }
    };

    const renderMessage = (req: CollaborationRequest) => {
        if (req.type === 'team_up') {
            return (
                <div className="text-sm text-white">
                    <span className="font-semibold">{req.fromUsername || 'Someone'}</span>{' '}
                    wants to <span className="font-semibold text-violet-300">team up</span> with you
                </div>
            );
        }
        // project_invite
        return (
            <div className="text-sm text-white">
                <span className="font-semibold">{req.fromUsername || 'Someone'}</span>{' '}
                invited you to <span className="font-semibold">{req.projectName}</span>
                {req.role && <span className="ml-1 text-xs text-white/50">as {req.role}</span>}
            </div>
        );
    };

    return (
        <div ref={wrapperRef} className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative rounded-full p-2 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
                <Bell size={20} />
                {requests.filter(r => r.status === 'pending' && r.createdAt > lastSeen).length > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#0f0f12]">
                        {requests.filter(r => r.status === 'pending' && r.createdAt > lastSeen).length}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl z-50">
                    <div className="border-b border-white/5 px-4 py-3">
                        <div className="text-sm font-semibold text-white">Notifications</div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto">
                        {requests.length === 0 ? (
                            <div className="p-8 text-center text-xs text-white/40">
                                No new notifications
                            </div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {requests.map(req => (
                                    <div key={req.id} className="p-4">
                                        {renderMessage(req)}
                                        <div className="mt-1 text-xs text-white/50">{formatDate(req.createdAt)}</div>
                                        <div className="mt-3 flex gap-2">
                                            <Button
                                                size="sm"
                                                className="h-7 px-3 text-xs bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border-transparent"
                                                onClick={() => handleRespond(req, 'accepted')}
                                            >
                                                <Check size={12} className="mr-1" /> Accept
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 px-3 text-xs text-white/50 hover:text-white"
                                                onClick={() => handleRespond(req, 'rejected')}
                                            >
                                                <X size={12} className="mr-1" /> Decline
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
