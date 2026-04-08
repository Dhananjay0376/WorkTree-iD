import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Compass, Plus, Search, Shield, Sparkles, TreePine, Users, X } from 'lucide-react';
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
  const [recent, setRecent] = useState<string[]>(() => loadRecentSearches());
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

  const totalUsers = useMemo(() => Object.keys(db.users).length, [db.users]);
  const totalProjects = useMemo(() => Object.keys(db.projects).length, [db.projects]);

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
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-16">
      <section className="relative min-h-[calc(100vh-72px)] w-full py-12 sm:py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-12 h-64 w-64 -translate-x-[140%] rounded-full bg-cyan-400/10 blur-3xl sm:h-80 sm:w-80" />
          <div className="absolute right-1/2 top-24 h-72 w-72 translate-x-[150%] rounded-full bg-emerald-400/10 blur-3xl sm:h-96 sm:w-96" />
          <div className="absolute inset-x-[12%] top-20 h-48 rounded-[3rem] border border-white/6 bg-linear-to-r from-white/3 via-white/1 to-white/3 opacity-70 blur-2xl" />
        </div>

        <div className="mx-auto flex min-h-[calc(100vh-72px-5rem)] w-full max-w-5xl flex-col items-center justify-center">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center justify-center">
              <span className="relative text-5xl font-semibold tracking-tight sm:text-6xl">
                <span className="absolute inset-0 bg-linear-to-r from-indigo-400/35 via-emerald-300/25 to-pink-400/25 blur-2xl" />
                <span className="relative bg-linear-to-r from-indigo-200 via-white to-emerald-200 bg-clip-text text-transparent drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]">
                  WorkTree ID
                </span>
                <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-70">
                  <span className="home-shimmer absolute -inset-y-10 -left-1/2 w-[200%] bg-[linear-gradient(110deg,transparent,rgba(255,255,255,0.18),transparent)]" />
                </span>
              </span>
            </div>
            <div className="mt-4 text-sm text-white/55">Permanent identity for collaborative work trees.</div>
          </div>

          <div className="mt-12 w-full max-w-3xl text-center">
            <h1 className="text-center text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Build structured projects with people you trust.
            </h1>
            <p className="mx-auto mt-4 max-w-3xl text-pretty text-lg leading-8 text-white/70">
              Create a lasting identity, shape work from roots to fruits, and invite collaborators into a system that keeps ownership and
              progress clear as ideas grow.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Pill className="border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
              <Sparkles size={14} /> Structured collaboration
            </Pill>
            <Pill className="border-white/10 bg-white/7 text-white/80">{totalUsers} identities created</Pill>
            <Pill className="border-white/10 bg-white/7 text-white/80">{totalProjects} projects growing</Pill>
            <Pill className="border-white/10 bg-white/7 text-white/80">{publicProjects.length} public projects to explore</Pill>
          </div>

          <div className="mt-10 grid w-full max-w-4xl gap-4 sm:grid-cols-3">
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Identity layer</div>
              <div className="mt-2 text-sm font-medium text-white/85">One profile anchor for everything you build.</div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Tree logic</div>
              <div className="mt-2 text-sm font-medium text-white/85">Projects stay readable as they branch and grow.</div>
            </div>
            <div className="rounded-[1.75rem] border border-white/10 bg-black/25 p-5 backdrop-blur">
              <div className="text-[11px] uppercase tracking-[0.24em] text-white/45">Trusted sharing</div>
              <div className="mt-2 text-sm font-medium text-white/85">Public when discoverable, private when collaboration matters.</div>
            </div>
          </div>

          {!me ? (
            <Card className="mx-auto mt-10 w-full max-w-4xl overflow-hidden p-6 sm:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.08),transparent_36%)]" />
              <div className="grid gap-8 lg:grid-cols-[1.3fr_0.9fr] lg:items-center">
                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                    <Sparkles size={14} className="text-white/60" /> Start with identity, grow into collaboration
                  </div>
                  <div className="mt-5 text-2xl font-semibold text-white sm:text-3xl">A cleaner home for serious collaborative work.</div>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/68 sm:text-base">
                    Sign in with Firebase, create your profile, and build public or private work trees with ownership and progress visible from
                    day one.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Link to="/auth">
                      <Button className="w-full sm:w-auto">
                        Sign in / Sign up <ArrowRight size={16} />
                      </Button>
                    </Link>
                    <Link to="/explore">
                      <Button variant="secondary" className="w-full sm:w-auto">
                        <Compass size={16} /> Explore public projects
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="relative grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Identity</div>
                    <div className="mt-2 text-sm font-medium text-white/85">Permanent ID with optional username</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Collaboration</div>
                    <div className="mt-2 text-sm font-medium text-white/85">Invite by ID instead of messy handoffs</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-5 backdrop-blur">
                    <div className="text-xs uppercase tracking-[0.22em] text-white/45">Visibility</div>
                    <div className="mt-2 text-sm font-medium text-white/85">Track progress across the whole tree</div>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          {me ? (
            <Card className="mx-auto mt-12 w-full max-w-3xl p-6">
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

          <div ref={wrapRef} className="mx-auto mt-12 w-full max-w-3xl">
            <div className="mb-3 text-center">
              <div className="text-sm font-semibold text-white">Search profiles</div>
              <div className="mt-1 text-sm text-white/60">Find anyone by permanent ID or username.</div>
            </div>
            <Card className="overflow-hidden p-0">
              <div className="border-b border-white/10 bg-linear-to-r from-white/5 via-white/2 to-white/5 px-4 py-3 text-xs uppercase tracking-[0.24em] text-white/45">
                Profile discovery
              </div>
              <div className="p-3">
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
              </div>
            </Card>

            {open ? (
              <Card className="mt-3 overflow-hidden p-3">
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
                      <div className="px-2 pb-1 text-sm text-white/60">No users found. Try a different ID or username.</div>
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
                    <div className="mt-2 px-2 text-xs text-white/50">Tip: try @alice, bob, or a full user ID.</div>
                  </div>
                )}
              </Card>
            ) : null}
          </div>

          <div className="mt-14 flex justify-center">
            <a href="#how-it-works" className="text-xs text-white/50 hover:text-white">
              Scroll to learn more
            </a>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="mt-20 scroll-mt-24 sm:mt-24">
        <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <Card className="overflow-hidden p-7 sm:p-9">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-white">How it works</div>
              <div className="mt-1 text-sm text-white/60">A simple flow for building, sharing, and growing structured work.</div>
            </div>
            <Pill className="border-white/10 bg-white/5">Built for clear ownership</Pill>
          </div>
          <div className="mt-7 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Step 1</div>
              <div className="mt-2 text-sm font-semibold text-white">Create your identity</div>
              <div className="mt-2 text-sm leading-6 text-white/70">
                Sign in once to get a permanent ID, then claim a username if you want a cleaner public handle.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Step 2</div>
              <div className="mt-2 text-sm font-semibold text-white">Build projects as a tree</div>
              <div className="mt-2 text-sm leading-6 text-white/70">
                Turn big ideas into roots, branches, stems, leaves, and fruits so the structure stays understandable.
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="text-xs uppercase tracking-[0.22em] text-white/45">Step 3</div>
              <div className="mt-2 text-sm font-semibold text-white">Collaborate and track progress</div>
              <div className="mt-2 text-sm leading-6 text-white/70">
                Invite collaborators by ID or username, keep access intentional, and watch progress move across the tree.
              </div>
            </div>
          </div>
        </Card>
      </section>

      <section className="mt-20 sm:mt-24">
        <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div>
          <div className="text-sm font-semibold text-white">Get started</div>
          <div className="mt-1 text-sm text-white/60">Create your identity, explore public work, and collaborate safely.</div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/20 to-transparent" />
            <div className="text-lg font-semibold text-white">Start building with a real identity</div>
            <div className="mt-3 max-w-2xl text-sm leading-7 text-white/70">
              Sign in or create your account, set up your profile, and begin building work trees that are easy to share, manage, and grow.
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link to="/auth" className="sm:flex-1">
                <Button className="w-full">Sign in / Sign up</Button>
              </Link>
              <Link to="/explore" className="sm:flex-1">
                <Button variant="secondary" className="w-full">
                  <Compass size={16} /> Explore public projects
                </Button>
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Profiles</div>
                <div className="mt-2 text-sm text-white/80">Show your identity with an ID and optional username.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Projects</div>
                <div className="mt-2 text-sm text-white/80">Shape complex work into a system people can follow.</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-5 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Access</div>
                <div className="mt-2 text-sm text-white/80">Keep work public when discoverable, private when trust matters.</div>
              </div>
            </div>
          </Card>
          <Card className="relative overflow-hidden p-6 sm:p-8">
            <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl" />
            <div className="text-sm font-semibold text-white">Privacy note</div>
            <div className="mt-3 text-sm leading-7 text-white/70">
              Private profiles and projects stay limited to the people who should see them. Public work stays discoverable without losing who owns
              it.
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="text-xs uppercase tracking-[0.2em] text-white/45">Best for</div>
              <div className="mt-2 text-sm text-white/80">
                Founders, collaborators, student teams, and anyone who wants progress to stay visible.
              </div>
            </div>
          </Card>
        </div>
      </section>

      <section className="mt-20 sm:mt-24">
        <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />
        <div>
          <div className="text-sm font-semibold text-white">Why WorkTree ID</div>
          <div className="mt-1 text-sm text-white/60">Designed for privacy, collaboration, and structured progress.</div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-white">
              <Shield size={18} />
              <div className="font-semibold">Privacy</div>
            </div>
            <div className="mt-2 text-sm text-white/70">Profiles and projects can be public or private.</div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-white">
              <Users size={18} />
              <div className="font-semibold">Collaborate</div>
            </div>
            <div className="mt-2 text-sm text-white/70">Invite collaborators using their ID or username. Track progress together.</div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-2 text-white">
              <TreePine size={18} />
              <div className="font-semibold">Work Trees</div>
            </div>
            <div className="mt-2 text-sm text-white/70">Break work into roots, branches, stems, leaves, and fruits.</div>
          </Card>
        </div>
      </section>

      <section className="mt-20 sm:mt-24">
        <div className="mb-8 h-px w-full bg-linear-to-r from-transparent via-white/10 to-transparent" />
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

        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {publicProjects.map((p) => {
            const owner = db.users[p.ownerId];
            const prog = projectProgress(p.tree);
            const ownerName = owner?.displayName ?? (owner ? owner.email.split('@')[0] : p.ownerId);
            return (
              <Link key={p.id} to={`/p/${p.id}`} className="block">
                <Card className="group relative h-full overflow-hidden p-6 transition hover:-translate-y-0.5 hover:bg-white/7">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-white/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
                      <div className="h-full bg-linear-to-r from-emerald-300/80 via-cyan-300/75 to-white/70" style={{ width: `${prog.pct}%` }} />
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
