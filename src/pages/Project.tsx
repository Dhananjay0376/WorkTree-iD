import { Link, useNavigate, useParams } from 'react-router-dom';
import { canEditProject, canViewProject, getSessionUserId, normalizeProject, projectProgress, saveDB, uid } from '../lib/storage';
import { UserSearchInput } from '../components/UserSearchInput';
import { sendProjectInvite, getUserProfiles, subscribeToProjectInvites, saveProjectToFirestore, subscribeToProject, subscribeToSentRequests } from '../lib/firestore';
import type { CollaborationRequest } from '../lib/firestore';
import type { AppDB, Project, AuthUser } from '../lib/storage';
import { Card, Button, Input, Pill } from '../components/ui';
import { WorkNodeLegend, WorkTree } from '../components/WorkTree';
import { formatDate } from '../lib/utils';
import { ArrowLeft, Clock, Eye, EyeOff, Link as LinkIcon, Network, Plus, Save, Trash2, Users } from 'lucide-react';
import { useEffect, useMemo, useState, useRef } from 'react';
import { historyCanRedo, historyCanUndo, historyInit, historyPush, historyRedo, historyUndo } from '../lib/history';

export default function ProjectPage({ db, onDB }: { db: AppDB; onDB: (next: AppDB) => void }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const viewerId = getSessionUserId();
  const project = projectId ? db.projects[projectId] : null;

  const canView = project ? canViewProject(viewerId, project) : false;
  const isOwner = viewerId && project ? viewerId === project.ownerId : false;
  const canEdit = project ? canEditProject(viewerId, project) : false;

  const [inviteMsg, setInviteMsg] = useState<string | null>(null);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [pendingReqs, setPendingReqs] = useState<CollaborationRequest[]>([]);

  const prog = useMemo(() => (project ? projectProgress(project.tree) : { done: 0, total: 0, pct: 0 }), [project]);

  const [treeHistory, setTreeHistory] = useState(() => historyInit(project?.tree ?? (null as any)));

  useEffect(() => {
    if (!project) return;
    setTreeHistory(historyInit(project.tree));
  }, [project?.id]);

  // Track latest db to avoid stale closures in listeners
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchingUsers = useRef<Set<string>>(new Set());

  // Listen for remote project updates
  useEffect(() => {
    if (!projectId) return;
    const unsubscribe = subscribeToProject(projectId, (remote) => {
      const currentDB = dbRef.current;
      const local = currentDB.projects[projectId];

      // If we don't have it locally or if remote is newer
      if (!local || (remote.updatedAt > local.updatedAt)) {
        console.log("Remote update received for project:", projectId, remote.updatedAt);
        const db2: AppDB = structuredClone(currentDB);
        db2.projects[projectId] = remote;
        onDB(db2);
      }
    });
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, [projectId]);

  // Fetch missing collaborator profiles from Firestore
  useEffect(() => {
    if (!project) return;
    const missingIds = [project.ownerId, ...project.collaborators.map(c => c.userId)]
      .filter(id => !db.users[id] && !fetchingUsers.current.has(id));

    if (missingIds.length === 0) return;

    missingIds.forEach(id => fetchingUsers.current.add(id));

    getUserProfiles(missingIds).then((profiles: (AuthUser | null)[]) => {
      if (!isMounted.current) return;

      const found = profiles.filter(Boolean) as AuthUser[];
      if (found.length > 0) {
        const db2: AppDB = structuredClone(dbRef.current);
        found.forEach(u => {
          db2.users[u.id] = u;
          fetchingUsers.current.delete(u.id);
        });
        onDB(db2);
      }
    }).catch((err: any) => {
      console.error("Batch getUserProfiles failed:", err);
      missingIds.forEach(id => fetchingUsers.current.delete(id));
    });
    // We join the IDs into a string to ensure the dependency array only changes
    // when the *set* of IDs changes, not when the array reference changes.
  }, [project?.id, project?.collaborators.map(c => c.userId).join(',')]);

  useEffect(() => {
    if (!project || !isOwner) return;
    const unsubscribe = subscribeToProjectInvites(project.id, (reqs) => {
      setPendingReqs(reqs);
    });
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, [project?.id, isOwner]);

  useEffect(() => {
    if (!project || !isOwner || !viewerId) return;
    const unsubscribe = subscribeToSentRequests(viewerId, (sent) => {
      if (!isMounted.current) return;
      const currentProject = dbRef.current.projects[project.id];
      if (!currentProject) return;

      const acceptedInvites = sent.filter(r =>
        r.type === 'project_invite' &&
        r.status === 'accepted' &&
        r.projectId === currentProject.id &&
        !currentProject.collaborators.some(c => c.userId === r.toUserId)
      );

      if (acceptedInvites.length > 0) {
        const db2: AppDB = structuredClone(dbRef.current);
        const p = db2.projects[currentProject.id];
        acceptedInvites.forEach(inv => {
          p.collaborators.push({
            userId: inv.toUserId,
            role: inv.role || 'viewer',
            addedAt: Date.now()
          });
          if (!p.collaboratorIds) p.collaboratorIds = [p.ownerId];
          if (!p.collaboratorIds.includes(inv.toUserId)) {
            p.collaboratorIds.push(inv.toUserId);
          }
          p.invited = p.invited.filter((userId) => userId !== inv.toUserId);
        });
        db2.projects[currentProject.id] = normalizeProject(p);
        onDB(db2);
        saveDB(db2);
        void saveProjectToFirestore(db2.projects[currentProject.id]).catch((err) => {
          console.error('Failed to sync accepted invites:', err);
        });
      }
    });
    return () => { setTimeout(() => unsubscribe(), 0); };
  }, [project?.id, isOwner, viewerId]);

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Card className="p-6">
          <div className="text-lg font-semibold text-white">Project not found</div>
          <div className="mt-4">
            <Link to="/">
              <Button>Home</Button>
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
          <div className="text-lg font-semibold text-white">This project is private</div>
          <div className="mt-2 text-white/70">Only collaborators can access it.</div>
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

  const owner = db.users[project.ownerId];
  const ownerName = owner?.username ? `@${owner.username}` : owner?.displayName ?? project.ownerId.slice(0, 8);

  const updateProject = (fn: (p: Project) => void) => {
    const db2: AppDB = structuredClone(db);
    const p = db2.projects[project.id];
    if (p) {
      fn(p);
      db2.projects[project.id] = normalizeProject(p);
      const nextProject = db2.projects[project.id];
      saveDB(db2);
      onDB(db2);
      if (canEdit) {
        void saveProjectToFirestore(nextProject).catch((err) => {
          console.error('Failed to sync project to Firestore:', err);
        });
      }
    }
  };

  const pushTree = (nextTree: Project['tree']) => {
    setTreeHistory((h) => historyPush(h, nextTree));
    updateProject((p) => (p.tree = nextTree));
  };

  const doUndo = () => {
    setTreeHistory((h) => {
      const next = historyUndo(h);
      updateProject((p) => (p.tree = next.present));
      return next;
    });
  };

  const doRedo = () => {
    setTreeHistory((h) => {
      const next = historyRedo(h);
      updateProject((p) => (p.tree = next.present));
      return next;
    });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!canEdit) return;
      const key = e.key.toLowerCase();
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;

      // Undo/redo
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (historyCanUndo(treeHistory)) doUndo();
      }
      if ((key === 'y') || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        if (historyCanRedo(treeHistory)) doRedo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canEdit, treeHistory]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div>
            <div className="text-xl font-semibold text-white">{project.title}</div>
            <div className="mt-1 text-sm text-white/60">
              by <Link className="text-white/80 hover:underline" to={`/u/${project.ownerId}`}>{ownerName}</Link> • created {formatDate(project.createdAt)}
            </div>

            {/* Pending invites linked to this project */}
            {pendingReqs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {pendingReqs.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[11px] font-medium text-amber-200">
                    <Clock size={10} className="text-amber-400/70" />
                    <span>Invited: {r.toUserId.slice(0, 8)}…</span>
                    <span className="text-amber-400/50">({r.role ?? 'editor'})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Pill className="border-white/10 bg-white/5">{project.visibility === 'public' ? <span className="inline-flex items-center gap-1"><Eye size={14} /> Public</span> : <span className="inline-flex items-center gap-1"><EyeOff size={14} /> Private</span>}</Pill>
          <Button
            variant="secondary"
            onClick={() => {
              navigator.clipboard.writeText(`${location.origin}/p/${project.id}`);
            }}
          >
            <LinkIcon size={16} /> Copy link
          </Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                {canEdit ? (
                  <EditableText
                    label="Title"
                    value={project.title}
                    onSave={(v) => updateProject((p) => (p.title = v))}
                  />
                ) : (
                  <div className="text-white/80">{project.description}</div>
                )}
                <div className="mt-2">
                  {canEdit ? (
                    <EditableText
                      label="Description"
                      value={project.description ?? ''}
                      onSave={(v) => updateProject((p) => (p.description = v))}
                      multiline
                    />
                  ) : (
                    <div className="text-white/70">{project.description}</div>
                  )}
                </div>
              </div>

              {canEdit ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={project.visibility === 'public' ? 'primary' : 'secondary'}
                    onClick={() => updateProject((p) => (p.visibility = 'public'))}
                  >
                    <Eye size={16} /> Public
                  </Button>
                  <Button
                    variant={project.visibility === 'private' ? 'primary' : 'secondary'}
                    onClick={() => updateProject((p) => (p.visibility = 'private'))}
                  >
                    <EyeOff size={16} /> Private
                  </Button>
                </div>
              ) : null}
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

          <Card className="p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-lg font-semibold text-white">Work tree</div>
                <div className="mt-1 text-sm text-white/70">
                  Add nodes and mark them done. Use Ctrl/⌘+Z to undo and Ctrl/⌘+Shift+Z (or Ctrl/⌘+Y) to redo.
                </div>
              </div>
              <Link to={`/p/${project.id}/tree`}>
                <Button variant="secondary">
                  <Network size={16} /> Open tree view
                </Button>
              </Link>
            </div>
            {canEdit ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={doUndo} disabled={!historyCanUndo(treeHistory)}>
                  Undo
                </Button>
                <Button size="sm" variant="secondary" onClick={doRedo} disabled={!historyCanRedo(treeHistory)}>
                  Redo
                </Button>
              </div>
            ) : null}

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs font-semibold text-white/70">Node type legend</div>
              <div className="mt-2">
                <WorkNodeLegend compact />
              </div>
            </div>
            <div className="mt-4">
              <WorkTree
                value={treeHistory.present}
                canEdit={canEdit}
                onChange={(nextTree) => pushTree(nextTree)}
                projectId={project.id}
                isOwner={isOwner}
              />
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold text-white">People</div>
              <Pill className="border-white/10 bg-white/5">
                <span className="inline-flex items-center gap-1">
                  <Users size={14} /> {project.collaborators.length}
                </span>
              </Pill>
            </div>

            <div className="mt-3 space-y-2">
              {project.collaborators.map((c) => {
                const u = db.users[c.userId];
                return (
                  <div key={c.userId} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{u?.username ? `@${u.username}` : u?.displayName ?? u?.email ?? c.userId}</div>
                      <div className="text-xs text-white/60">{c.role}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/u/${c.userId}`} className="text-xs text-white/60 hover:text-white">View</Link>
                      {isOwner && c.userId !== viewerId && (
                        <button
                          onClick={() => {
                            if (!window.confirm('Remove this collaborator?')) return;
                            updateProject(p => {
                              p.collaborators = p.collaborators.filter(x => x.userId !== c.userId);
                            });
                          }}
                          className="p-1 text-white/40 hover:text-red-400 transition-colors"
                          title="Remove collaborator"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {isOwner ? (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-sm font-semibold text-white">Invite collaborator</div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-white/50">Role:</span>
                  <button
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${inviteRole === 'editor' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}
                    onClick={() => setInviteRole('editor')}
                  >Editor</button>
                  <button
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${inviteRole === 'viewer' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'}`}
                    onClick={() => setInviteRole('viewer')}
                  >Read only</button>
                </div>
                <div className="mt-3">
                  <UserSearchInput
                    placeholder="Search user to invite..."
                    onSelect={async (user) => {
                      setInviteMsg(null);
                      setInviteErr(null);

                      if (project.collaborators.some((x) => x.userId === user.id)) {
                        setInviteErr('Already a collaborator.');
                        return;
                      }
                      if (pendingReqs.some((request) => request.toUserId === user.id && request.status === 'pending')) {
                        setInviteErr('Invite already pending for this user.');
                        return;
                      }

                      try {
                        const me = db.users[viewerId!];
                        if (!me) return;
                        await sendProjectInvite(me, user, project, inviteRole);
                        setInviteMsg(`Request sent to ${user.username || user.displayName} as ${inviteRole}.`);
                      } catch (e) {
                        console.error(e);
                        setInviteErr('Failed to send request.');
                      }
                    }}
                  />
                </div>
                {inviteErr ? <div className="mt-2 text-sm text-red-100">{inviteErr}</div> : null}
                {inviteMsg ? <div className="mt-2 text-sm text-emerald-100">{inviteMsg}</div> : null}
              </div>
            ) : null}
          </Card>

          {isOwner ? (
            <Card className="p-5">
              <div className="text-lg font-semibold text-white">Owner actions</div>
              <div className="mt-3 flex flex-col gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    const cloneId = uid('p');
                    const now = Date.now();
                    const ownerId = viewerId ?? project.ownerId;
                    const copy = normalizeProject({
                      ...structuredClone(project),
                      id: cloneId,
                      ownerId,
                      title: `${project.title} (copy)`,
                      visibility: 'private',
                      collaborators: [{ userId: ownerId, role: 'owner', addedAt: now }],
                      collaboratorIds: [ownerId],
                      editorIds: [],
                      invited: [],
                      createdAt: now,
                      updatedAt: now,
                    });
                    const db2: AppDB = structuredClone(db);
                    db2.projects[cloneId] = copy;
                    saveDB(db2);
                    onDB(db2);
                    navigate(`/p/${cloneId}`);
                  }}
                >
                  <Plus size={16} /> Duplicate project
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    const ok = confirm('Delete this project?');
                    if (!ok) return;
                    const db2: AppDB = structuredClone(db);
                    delete db2.projects[project.id];
                    saveDB(db2);
                    onDB(db2);
                    navigate(`/u/${project.ownerId}`);
                  }}
                >
                  Delete project
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EditableText({
  label,
  value,
  onSave,
  multiline,
}: {
  label: string;
  value: string;
  onSave: (v: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState(value);

  return (
    <div>
      <div className="text-xs text-white/60">{label}</div>
      {!editing ? (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 truncate text-white/90">{value || <span className="text-white/40">(empty)</span>}</div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setV(value);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        </div>
      ) : (
        <div className="mt-1 space-y-2">
          {multiline ? (
            <textarea
              value={v}
              onChange={(e) => setV(e.target.value)}
              className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-white/20 focus:ring-2 focus:ring-white/15"
            />
          ) : (
            <Input value={v} onChange={(e) => setV(e.target.value)} />
          )}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                const t = v.trim();
                onSave(t);
                setEditing(false);
              }}
            >
              <Save size={16} /> Save
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
