import React from 'react';
import { resolveMedia } from '../lib/media';
import { cn } from '../lib/utils';

export function MediaDisplay({ mediaUrl, type, title, className }: { mediaUrl: string; type: 'photo' | 'video'; title: string; className?: string }) {
    const [url, setUrl] = React.useState<string | null>(null);
    const [error, setError] = React.useState(false);

    React.useEffect(() => {
        let active = true;
        setError(false);
        resolveMedia(mediaUrl).then(resolved => {
            if (!active) return;
            if (resolved) setUrl(resolved);
            else setError(true);
        }).catch(() => {
            if (active) setError(true);
        });
        return () => { active = false; };
    }, [mediaUrl]);

    if (error) return (
        <div className={cn("flex flex-col items-center justify-center bg-black/40 text-center p-4", className)}>
            <div className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Local-Only Media</div>
            <div className="mt-1 text-[9px] text-white/20">This file is stored on another device.</div>
        </div>
    );

    if (!url) return <div className={cn("flex items-center justify-center bg-black/40 text-[10px] text-white/30", className)}>Loading...</div>;

    return (
        <div className={className || "mt-2 overflow-hidden rounded-lg border border-white/10 bg-black/40"}>
            {type === 'photo' ? (
                <img src={url} alt={title} className="h-full w-full object-cover" />
            ) : (
                <div className="relative h-full w-full">
                    <video src={url} controls className="h-full w-full object-cover" />
                </div>
            )}
        </div>
    );
}
