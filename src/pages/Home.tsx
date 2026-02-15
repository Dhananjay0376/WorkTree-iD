import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Compass, Plus, Search, Shield, TreePine, Users, X } from 'lucide-react';
import { Card, Button, Input, Pill } from '../components/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getSessionUserId, getUserByUsernameOrId, projectProgress } from '../lib/storage';
import type { AppDB } from '../lib/storage';
import { addRecentSearch, clearRecentSearches, loadRecentSearches } from '../lib/recent';
import { formatDate } from '../lib/utils';

export default function Home({ db }: { db: AppDB }) {
  const viewerId = getSessionUserId();
  const me = viewerId ? db.users[viewerId] : null;
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const meName = me?.displayName ?? (me ? me.email.split('@')[0] : '');

  const example = useMemo(() => {
    const ids = Object.keys(db.users);
    if (ids.length === 0) return null;
    const u = db.users[ids[0]];
    return u.username ?? u.id;
  }, [db.users]);

  const myProjects = useMemo(() => {
    if (!me) return [];
    return Object.values(db.projects)
      .filter((p) => p.ownerId === me.id)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.projects, me]);

  const suggestions = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 1) return [] as Array<{ id: string; label: string }>;
    return Object.values(db.users)
      .map((u) => ({
        id: u.id,
        label: u.displayName ?? (u.username ? `@${u.username}` : u.email),
        username: u.username,
        email: u.email,
      }))
      .filter((x) => {
        const label = (x.label ?? '').toLowerCase();
        const id = x.id.toLowerCase();
        const uname = (x.username ?? '').toLowerCase();
        const email = (x.email ?? '').toLowerCase();
        return label.includes(s) || id.includes(s) || uname.includes(s) || email.includes(s);
      })
      .slice(0, 6)
      .map((x) => ({ id: x.id, label: x.label }));
  }, [db.users, q]);

  const publicProjects = useMemo(() => {
    return Object.values(db.projects)
      .filter((p) => p.visibility === 'public')
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 6);
  }, [db.projects]);

  useEffect(() => {
    setRecent(loadRecentSearches());
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  const submitSearch = (query: string) => {
    const user = getUserByUsernameOrId(db, query);
    if (!user) return false;
    addRecentSearch(query);
    setRecent(loadRecentSearches());
    navigate(`/u/${user.id}`);
    return true;
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {/* Hero + search (full viewport section) */}
      <section className="min-h-[calc(100vh-72px)] w-full py-10 sm:py-14">
        <div className="mx-auto flex min-h-[calc(100vh-72px-5rem)] w-full max-w-5xl flex-col items-center justify-center">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center justify-center">
              <span className="relative text-5xl font-semibold tracking-tight sm:text-6xl">
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-400/35 via-emerald-300/25 to-pink-400/25 blur-2xl" />
                <span className="relative bg-gradient-to-r from-indigo-200 via-white to-emerald-200 bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
                  WorkTree ID
                </span>
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-70">
                  <span className="home-shimmer absolute -inset-y-10 -left-1/2 w-[200%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)]" />
                </span>
              </span>
            </div>
            <div className="mt-4 text-sm text-white/55">Permanent identity for collaborative work trees.</div>
          </div>

          <div className="mt-10 w-full max-w-3xl text-center">
            <h1 className="text-center text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              WorkTree ID — build projects as a tree, solo or with friends.
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-pretty text-lg text-white/70">
              Each user gets a unique permanent ID and an optional unique username. Create public or private profiles, then build projects and
              nested tasks from roots to fruits.
            </p>
          </div>

          {me ? (
            <Card className="mx-auto mt-10 w-full max-w-3xl p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-left">
                  <div className="text-sm text-white/60">Welcome back</div>
                  <div className="mt-0.5 text-xl font-semibold text-white">{meName}</div>
                  <div className="mt-1 text-sm text-white/60">{me.username ? `@${me.username}` : me.id}</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={`/u/${me.id}`}>
                    <Button variant="secondary">
                      <BadgeCheck size={16} /> My profile
                    </Button>
                  </Link>
                  {myProjects[0] ? (
                    <Link to={`/p/${myProjects[0].id}`}>
                      <Button>
                        Continue <ArrowRight size={16} />
                      </Button>
                    </Link>
                  ) : (
                    <Link to={`/u/${me.id}`}>
                      <Button>
                        <Plus size={16} /> New project
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
              {myProjects[0] ? (
                <div className="mt-4 text-xs text-white/50">Last updated {formatDate(myProjects[0].updatedAt)} • {myProjects[0].title}</div>
              ) : (
                <div className="mt-4 text-xs text-white/50">Create your first project and start building a work tree.</div>
              )}
            </Card>
          ) : null}

          <div ref={wrapRef} className="mx-auto mt-10 w-full max-w-3xl">
            <div className="mb-3 text-center">
              <div className="text-sm font-semibold text-white">Search profiles</div>
              <div className="mt-1 text-sm text-white/60">Find anyone by permanent ID or username.</div>
            </div>
            <Card className="w-full p-2">
              <form
                className="flex items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSearch(q);
                  setOpen(false);
                }}
              >
                <Search className="ml-2 text-white/50" size={18} />
                <Input
                  value={q}
                  onChange={(e) => {
                    setQ(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => setOpen(true)}
                  placeholder={example ? `Search by ID or username (e.g. ${example})` : 'Search by ID or username'}
                  className="h-10 border-transparent bg-transparent focus:ring-0"
                />
                {q ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setQ('');
                      setOpen(true);
                    }}
                    className="h-10"
                    aria-label="Clear"
                  >
                    <X size={16} />
                  </Button>
                ) : null}
                <Button type="submit" className="shrink-0">
                  View <ArrowRight size={16} />
                </Button>
              </form>
            </Card>

            {open ? (
              <Card className="mt-2 overflow-hidden p-2">
                {q.trim().length > 0 ? (
                  <div>
                    <div className="px-2 pb-2 text-xs font-semibold text-white/60">Suggestions</div>
                    {suggestions.length ? (
                      <div className="space-y-1">
                        {suggestions.map((s) => (
                          <button
                            key={s.id}
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-left hover:bg-white/5"
                            onClick={() => {
                              submitSearch(s.id);
                              setOpen(false);
                            }}
                            type="button"
                          >
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold text-white">{s.label}</div>
                              <div className="truncate text-xs text-white/50">{s.id}</div>
                            </div>
                            <div className="text-xs text-white/50">Open</div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2 pb-1 text-sm text-white/60">No users found. Try a different ID/username.</div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between px-2 pb-2">
                      <div className="text-xs font-semibold text-white/60">Recent searches</div>
                      {recent.length ? (
                        <button
                          className="text-xs text-white/50 hover:text-white"
                          onClick={() => {
                            clearRecentSearches();
                            setRecent([]);
                          }}
                          type="button"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    {recent.length ? (
                      <div className="flex flex-wrap gap-2 px-2 pb-1">
                        {recent.map((r) => (
                          <button
                            key={r}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80 hover:bg-white/10"
                            onClick={() => {
                              setQ(r);
                              submitSearch(r);
                              setOpen(false);
                            }}
                            type="button"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-2 pb-1 text-sm text-white/60">Search by permanent ID or username.</div>
                    )}
                    <div className="mt-2 px-2 text-xs text-white/50">Tip: try • @alice • bob • or a full user ID.</div>
                  </div>
                )}
              </Card>
            ) : null}
          </div>

          <div className="mt-10 flex justify-center">
            <a href="#how-it-works" className="text-xs text-white/50 hover:text-white">
              Scroll to learn more
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mt-12 scroll-mt-24">
        <div className="mb-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <Card className="p-6">
          <div className="text-sm font-semibold text-white">How it works</div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-white">1) Create your identity</div>
              <div className="mt-1 text-sm text-white/70">Authenticate once to get a permanent ID and optional username.</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-white">2) Build projects as a tree</div>
              <div className="mt-1 text-sm text-white/70">Break work into roots • branches • stems • leaves • fruits.</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-white">3) Collaborate + track progress</div>
              <div className="mt-1 text-sm text-white/70">Invite friends by ID/username and mark nodes done to see progress.</div>
            </div>
          </div>
          <div className="mt-5 rounded-xl border border-white/10 bg-black/30 p-4">
            <div className="text-xs text-white/60">Demo accounts (local-only)</div>
            <div className="mt-2 grid gap-2 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="text-white/80">alice@example.com</div>
                <div className="text-white/50">password: anything</div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-white/80">bob@example.com</div>
                <div className="text-white/50">password: anything</div>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Get started */}
      <section className="mt-14">
        <div className="mb-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div>
          <div className="text-sm font-semibold text-white">Get started</div>
          <div className="mt-1 text-sm text-white/60">Create your identity, explore public work, and collaborate safely.</div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="text-sm font-semibold text-white">Start building</div>
            <div className="mt-1 text-sm text-white/70">Create your identity to save projects and invite collaborators.</div>
            <div className="mt-3">
              <Link to="/auth">
                <Button className="w-full">Sign in / Create account</Button>
              </Link>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold text-white">Explore</div>
            <div className="mt-1 text-sm text-white/70">Browse public projects and join via link.</div>
            <div className="mt-3">
              <Link to="/explore">
                <Button variant="secondary" className="w-full">
                  <Compass size={16} /> Explore public projects
                </Button>
              </Link>
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm font-semibold text-white">Privacy note</div>
            <div className="mt-1 text-sm text-white/70">Private content is limited to you and collaborators.</div>
            <div className="mt-3 text-xs text-white/50">Public projects can be shared and joined responsibly.</div>
          </Card>
        </div>
      </section>

      {/* Why */}
      <section className="mt-14">
        <div className="mb-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div>
          <div className="text-sm font-semibold text-white">Why WorkTree ID</div>
          <div className="mt-1 text-sm text-white/60">Designed for privacy, collaboration, and structured progress.</div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-white">
              <Shield size={18} />
              <div className="font-semibold">Privacy</div>
            </div>
            <div className="mt-2 text-sm text-white/70">Profiles and projects can be public or private.</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-white">
              <Users size={18} />
              <div className="font-semibold">Collaborate</div>
            </div>
            <div className="mt-2 text-sm text-white/70">Invite friends using their ID/username. Track progress together.</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-white">
              <TreePine size={18} />
              <div className="font-semibold">Work Trees</div>
            </div>
            <div className="mt-2 text-sm text-white/70">Break work into roots → branches → stems → leaves → fruits.</div>
          </Card>
        </div>
      </section>

      {/* Public projects */}
      <section className="mt-14">
        <div className="mb-6 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xl font-semibold text-white">Public projects</div>
            <div className="mt-1 text-sm text-white/70">Jump into something already in progress.</div>
          </div>
          <Link to="/explore">
            <Button variant="secondary">
              <Compass size={16} /> View all
            </Button>
          </Link>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {publicProjects.map((p) => {
            const owner = db.users[p.ownerId];
            const prog = projectProgress(p.tree);
            const ownerName = owner?.displayName ?? (owner ? owner.email.split('@')[0] : p.ownerId);
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

                  <div className="mt-3">
                    <div className="text-xs text-white/50">Created by</div>
                    <div className="mt-1 text-xs font-semibold text-white/80">{ownerName}</div>
                    <div className="mt-0.5 text-xs text-white/50">{owner?.username ? `@${owner.username}` : owner?.id ?? p.ownerId}</div>
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
                </Card>
              </Link>
            );
          })}
        </div>

        {publicProjects.length === 0 ? (
          <Card className="mt-4 p-6">
            <div className="text-white/80">No public projects yet.</div>
            <div className="mt-2 text-sm text-white/70">Create one from your profile and set it to public.</div>
          </Card>
        ) : null}
      </section>
    </div>
  );
}
