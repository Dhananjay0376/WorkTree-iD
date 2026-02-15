import { Link } from 'react-router-dom';
import { projectProgress } from '../lib/storage';
import type { AppDB } from '../lib/storage';
import { Card, Button, Input, Pill } from '../components/ui';
import { formatDate } from '../lib/utils';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function Explore({ db }: { db: AppDB }) {
  const [q, setQ] = useState('');

  const projects = useMemo(() => {
    return Object.values(db.projects)
      .filter((p) => p.visibility === 'public')
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.projects]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return projects;
    return projects.filter((p) => p.title.toLowerCase().includes(s) || (p.description ?? '').toLowerCase().includes(s));
  }, [projects, q]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">Explore public projects</div>
          <div className="mt-1 text-sm text-white/70">Anyone can view public projects and request to join (in project page).</div>
        </div>
        <Link to="/">
          <Button variant="secondary">Home</Button>
        </Link>
      </div>

      <Card className="mt-5 p-3">
        <div className="flex items-center gap-2">
          <Search size={16} className="ml-2 text-white/50" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search projects…" className="h-10 border-transparent bg-transparent focus:ring-0" />
        </div>
      </Card>

      <div className="mt-5 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const prog = projectProgress(p.tree);
          return (
            <Link key={p.id} to={`/p/${p.id}`} className="block">
              <Card className="h-full p-5 hover:bg-white/7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-white">{p.title}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-white/70">{p.description}</div>
                  </div>
                  <Pill className="border-white/10 bg-white/5">public</Pill>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <div>Progress</div>
                    <div>
                      {prog.done}/{prog.total} ({prog.pct}%)
                    </div>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-black/20">
                    <div className="h-full bg-white/40" style={{ width: `${prog.pct}%` }} />
                  </div>
                </div>
                <div className="mt-4 text-xs text-white/60">Updated {formatDate(p.updatedAt)}</div>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-5 p-6">
          <div className="text-white/80">No public projects yet.</div>
        </Card>
      ) : null}
    </div>
  );
}
