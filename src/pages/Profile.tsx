import { Link, useNavigate, useParams } from 'react-router-dom';
import { canViewProfile, projectProgress, saveDB, setSessionUserId, slugifyUsername, isValidUsername, uid } from '../lib/storage';
import type { AppDB, Project, Visibility } from '../lib/storage';
import { Card, Button, Input, Label, Pill } from '../components/ui';
import { formatDate } from '../lib/utils';
import { Eye, EyeOff, Handshake, LogOut, Plus, Search, Settings, Share2, Users } from 'lucide-react';
import { getUserProfile, syncUserProfile, sendTeamUpRequest, isTeamedUp, hasPendingTeamUp, subscribeToTeamMembers, subscribeToUserProjects } from '../lib/firestore';
import type { AuthUser } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useMemo, useState, useRef } from 'react';

export default function Profile({ db, onDB }: { db: AppDB; onDB: (next: AppDB) => void }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const viewerId = currentUser ? currentUser.uid : null;

  // Local DB user
  const localUser = userId ? db.users[userId] : null;
  // State for user (local or fetched)
  const [user, setUser] = useState(localUser);
  const [loading, setLoading] = useState(!localUser);

  // Sync/Fetch effect
  useMemo(() => {
    if (localUser) {
      setUser(localUser);
      setLoading(false);
    }
  }, [localUser]);

  useEffect(() => {
    if (!userId) return;
    if (db.users[userId]) return; // already have it

    setLoading(true);
    getUserProfile(userId).then((u) => {
      if (u) setUser(u);
      setLoading(false);
    });
  }, [userId, db.users]);

  const profile = user;

  const isOwner = viewerId && profile ? viewerId === profile.id : false;
  const canView = profile ? canViewProfile(viewerId, profile) : false;

  // Sync current user's latest profile to Firestore on load (if viewer is profile owner)
  useEffect(() => {
    if (currentUser && isOwner && profile) {
      syncUserProfile(currentUser, {
        username: profile.username,
        displayName: profile.displayName,
        bio: profile.bio,
        visibility: profile.visibility
      });
    }
  }, [currentUser?.uid, isOwner]);

  // Team state
  const [teamStatus, setTeamStatus] = useState<'none' | 'pending' | 'teamed'>('none');
  const [teamMembers, setTeamMembers] = useState<AuthUser[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Check team-up status with this profile
  useEffect(() => {
    if (!viewerId || !profile || isOwner) return;
    (async () => {
      const teamed = await isTeamedUp(viewerId, profile.id);
      if (teamed) { setTeamStatus('teamed'); return; }
      const pending = await hasPendingTeamUp(viewerId, profile.id);
      if (pending) setTeamStatus('pending');
    })();
  }, [viewerId, profile?.id]);

  // Listen for real-time team updates
  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToTeamMembers(profile.id, setTeamMembers);
    return () => unsubscribe();
  }, [profile?.id]);

  // DISCOVERY: Listen for projects involving this user in Firestore
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = subscribeToUserProjects(profile.id, (remoteProjects) => {
      const currentDB = dbRef.current;
      const db2 = { ...currentDB, projects: { ...currentDB.projects } };
      let changed = false;

      // 1. Add/Update projects from Firestore
      remoteProjects.forEach(rp => {
        const local = currentDB.projects[rp.id];
        if (!local || rp.updatedAt > local.updatedAt) {
          db2.projects[rp.id] = rp;
          changed = true;
        }
      });

      // 2. Cleanup: If a project was local and we were a collaborator, 
      // but it's no longer in the discovery list (and we aren't the owner), remove it.
      const remoteIds = new Set(remoteProjects.map(p => p.id));
      Object.keys(currentDB.projects).forEach(id => {
        const p = currentDB.projects[id];
        if (p.ownerId !== profile.id && p.collaboratorIds?.includes(profile.id)) {
          if (!remoteIds.has(id)) {
            delete db2.projects[id];
            changed = true;
          }
        }
      });

      if (changed) {
        onDB(db2);
      }
    });
    return () => unsubscribe();
  }, [profile?.id]);

  const [search, setSearch] = useState('');

  const projectsList = useMemo(() => {
    if (!profile) return [] as Project[];
    return Object.values(db.projects)
      .filter((p) => p.ownerId === profile.id || p.collaboratorIds?.includes(profile.id))
      .filter((p) => (p.visibility === 'public' ? true : isOwner || p.collaboratorIds?.includes(viewerId!)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [db.projects, profile?.id, isOwner, viewerId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projectsList;
    return projectsList.filter((p) => p.title.toLowerCase().includes(q));
  }, [projectsList, search]);

  if (loading) {
    return <div className="p-10 text-center text-white/50">Loading profile...</div>;
  }

  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Card className="p-6">
          <div className="text-lg font-semibold text-white">User not found</div>
          <div className="mt-2 text-white/70">Try searching by ID or username from the home page.</div>
          <div className="mt-4">
            <Link to="/">
              <Button>Go home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Card className="p-6">
          <div className="flex items-center gap-2 text-white">
            <EyeOff size={18} />
            <div className="text-lg font-semibold">This profile is private</div>
          </div>
          <div className="mt-2 text-white/70">Only the owner can view it in this demo.</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/auth">
              <Button>Sign in</Button>
            </Link>
            <Link to="/">
              <Button variant="secondary">Home</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-semibold text-white">{profile.displayName ?? 'User'}</div>
                <div className="mt-1 text-sm text-white/70">Joined {formatDate(profile.createdAt)}</div>
              </div>
              <Pill className="border-white/10 bg-white/5">{profile.visibility === 'public' ? <span className="inline-flex items-center gap-1"><Eye size={14} /> Public</span> : <span className="inline-flex items-center gap-1"><EyeOff size={14} /> Private</span>}</Pill>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-white/60">Permanent ID</div>
                <code className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/80">{profile.id}</code>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-white/60">Username</div>
                <code className="rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/80">{profile.username ?? '—'}</code>
              </div>
              <div className="pt-2 text-white/70">{profile.bio ?? ''}</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  navigator.clipboard.writeText(profile.username ? `@${profile.username}` : profile.id);
                }}
              >
                <Share2 size={16} /> Copy identity
              </Button>
              {/* Team Up button — shown only on other users' profiles */}
              {!isOwner && viewerId ? (
                <Button
                  variant={teamStatus === 'teamed' ? 'secondary' : 'primary'}
                  disabled={teamStatus !== 'none' || teamLoading}
                  onClick={async () => {
                    if (!viewerId || !profile) return;
                    setTeamLoading(true);
                    try {
                      const me = db.users[viewerId];
                      if (!me) return;
                      await sendTeamUpRequest(me, profile);
                      setTeamStatus('pending');
                    } catch (e) {
                      console.error(e);
                    } finally {
                      setTeamLoading(false);
                    }
                  }}
                >
                  <Handshake size={16} />
                  {teamStatus === 'teamed' ? 'Teamed up' : teamStatus === 'pending' ? 'Request sent' : 'Team Up'}
                </Button>
              ) : null}
              {isOwner ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSessionUserId(null);
                    navigate('/');
                  }}
                >
                  <LogOut size={16} /> Sign out
                </Button>
              ) : null}
            </div>
          </Card>

          {/* Team section */}
          {teamMembers.length > 0 || isOwner ? (
            <Card className="p-5">
              <div className="flex items-center gap-2 text-white">
                <Users size={16} />
                <div className="text-sm font-semibold">Team</div>
                <Pill className="border-white/10 bg-white/5 text-xs">{teamMembers.length}</Pill>
              </div>
              {teamMembers.length === 0 ? (
                <div className="mt-3 text-xs text-white/40">No team members yet.</div>
              ) : (
                <div className="mt-3 space-y-2">
                  {teamMembers.map((m) => (
                    <Link key={m.id} to={`/u/${m.id}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/5 transition">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/20 text-sm font-bold text-white">
                        {(m.username || m.displayName || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-white">{m.displayName || m.username}</div>
                        {m.username && <div className="text-xs text-white/50">@{m.username}</div>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          ) : null}

          {isOwner ? <ProfileSettings db={db} onDB={onDB} /> : null}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-white">Projects</div>
                <div className="mt-1 text-sm text-white/70">Public projects are visible to anyone. Private projects are limited to collaborators.</div>
              </div>
              {isOwner ? (
                <Button
                  onClick={() => {
                    const projectId = uid('p');
                    const now = Date.now();
                    const rootId = uid('n');
                    const next: Project = {
                      id: projectId,
                      ownerId: profile.id,
                      title: `New Project ${Object.keys(db.projects).length + 1}`,
                      description: 'Describe your project…',
                      visibility: 'private',
                      collaborators: [{ userId: profile.id, role: 'owner', addedAt: now }],
                      collaboratorIds: [profile.id],
                      invited: [],
                      createdAt: now,
                      updatedAt: now,
                      tree: {
                        id: rootId,
                        title: 'Root work',
                        description: 'Start from the root.',
                        type: 'root',
                        done: false,
                        createdAt: now,
                        children: [],
                      },
                    };
                    const db2 = { ...db, projects: { ...db.projects, [projectId]: next } };
                    saveDB(db2);
                    onDB(db2);
                    navigate(`/p/${projectId}`);
                  }}
                >
                  <Plus size={16} /> New project
                </Button>
              ) : null}
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-2">
                <Search size={16} className="ml-2 text-white/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter projects…"
                  className="h-10 border-transparent bg-transparent focus:ring-0"
                />
              </div>
            </div>
          </Card>

          <div className="grid gap-3 md:grid-cols-2">
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
                      <Pill className="border-white/10 bg-white/5">{p.visibility}</Pill>
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

                    <div className="mt-4 flex items-center justify-between text-xs text-white/60">
                      <div>Updated {formatDate(p.updatedAt)}</div>
                      <div className="inline-flex items-center gap-1">
                        <Users size={14} /> {p.collaborators.length}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>

          {filtered.length === 0 ? (
            <Card className="p-6">
              <div className="text-white/80">No projects found.</div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ProfileSettings({ db, onDB }: { db: AppDB; onDB: (next: AppDB) => void }) {
  const { currentUser } = useAuth();
  const viewerId = currentUser ? currentUser.uid : null;
  const me = viewerId ? db.users[viewerId] : null;
  const [displayName, setDisplayName] = useState(me?.displayName ?? '');
  const [bio, setBio] = useState(me?.bio ?? '');
  const [username, setUsername] = useState(me?.username ?? '');
  const [visibility, setVisibility] = useState<Visibility>(me?.visibility ?? 'public');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (!me) return null;

  const currentUsername = me.username || '';
  const nextUsername = slugifyUsername(username);

  // Real-time validation info
  const isTaken = nextUsername !== currentUsername && db.usernames[nextUsername.toLowerCase()] && db.usernames[nextUsername.toLowerCase()] !== me.id;
  const isValid = isValidUsername(nextUsername);

  const save = () => {
    setMsg(null);
    setErr(null);

    if (nextUsername && !isValid) {
      setErr('Username must be 3–24 chars: a-z 0-9 _ .');
      return;
    }

    if (isTaken) {
      setErr('That username is already taken. Please choose another.');
      return;
    }

    const db2: AppDB = structuredClone(db);
    const current = db2.users[me.id];

    // username uniqueness (double check)
    const currentLower = (current.username ?? '').toLowerCase();
    const desiredLower = (nextUsername ?? '').toLowerCase();

    if (desiredLower && db2.usernames[desiredLower] && db2.usernames[desiredLower] !== me.id) {
      setErr('That username is taken.');
      return;
    }

    // update username index
    if (currentLower && currentLower !== desiredLower) delete db2.usernames[currentLower];
    if (desiredLower) db2.usernames[desiredLower] = me.id;

    current.username = desiredLower || undefined;
    current.displayName = displayName.trim() || undefined;
    current.bio = bio.trim() || undefined;
    current.visibility = visibility;

    saveDB(db2);
    onDB(db2);

    // Sync to Firestore
    if (me && currentUser) {
      syncUserProfile(currentUser, {
        displayName: current.displayName,
        bio: current.bio,
        username: current.username,
        visibility: current.visibility
      }).then(() => {
        setMsg('Saved and synced to public directory.');
      }).catch((e) => {
        console.error(e);
        setErr('Saved locally, but failed to sync to public directory.');
      });
    } else {
      setMsg('Saved locally.');
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-white">
        <Settings size={18} />
        <div className="text-lg font-semibold">Profile settings</div>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <Label>Display name</Label>
          <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
        </div>
        <div>
          <Label>Bio</Label>
          <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="A short bio…" />
        </div>
        <div>
          <Label>Username</Label>
          <div className="relative">
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="unique_name"
              className={isTaken ? 'border-red-500/50 focus:border-red-500' : (isValid && username !== currentUsername ? 'border-emerald-500/50 focus:border-emerald-500' : '')}
            />
            {username && username !== currentUsername && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-wider">
                {isTaken ? (
                  <span className="text-red-400">Taken</span>
                ) : isValid ? (
                  <span className="text-emerald-400">Available</span>
                ) : (
                  <span className="text-white/30">Invalid</span>
                )}
              </div>
            )}
          </div>
          <div className="mt-1 text-xs text-white/50">Searchable identity. 3–24 chars: a-z 0-9 _ .</div>
        </div>

        <div>
          <Label>Profile visibility</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button variant={visibility === 'public' ? 'primary' : 'secondary'} onClick={() => setVisibility('public')}>
              <Eye size={16} /> Public
            </Button>
            <Button variant={visibility === 'private' ? 'primary' : 'secondary'} onClick={() => setVisibility('private')}>
              <EyeOff size={16} /> Private
            </Button>
          </div>
        </div>

        {err ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">{err}</div> : null}
        {msg ? <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-100">{msg}</div> : null}

        <Button className="w-full" onClick={save}>
          Save changes
        </Button>
      </div>
    </Card>
  );
}
