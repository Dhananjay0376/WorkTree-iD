import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AppDB, Project, WorkNode, WorkNodeDisplayType } from '../lib/storage';
import { canViewProject, getSessionUserId, projectProgress, saveDB, uid } from '../lib/storage';
import { Card, Button, Input, Pill, Textarea } from '../components/ui';
import { ArrowLeft, Circle, CircleCheck, FileText, Image, Link as LinkIcon, Maximize2, Minimize2, Minus, Play, Plus, RotateCcw, Save, Trash2, Type, ExternalLink, Loader2 } from 'lucide-react';
import React, { useMemo, useState, useRef } from 'react';
import { cn } from '../lib/utils';
import { uploadFile } from '../lib/upload';
import { MediaDisplay } from '../components/MediaDisplay';

type LayoutNode = {
  node: WorkNode;
  depth: number;
  x: number;
  y: number;
};

function getNodeHeightUnits(node: WorkNode) {
  if (node.displayType === 'note') return 2;
  if ((node.displayType === 'photo' || node.displayType === 'video') && node.mediaUrl) return 3;
  return 1;
}

function buildLayout(root: WorkNode) {
  const nodes: LayoutNode[] = [];
  const edges: Array<{ from: string; to: string }> = [];

  const yCenter = new Map<string, number>();
  let currentY = 0;

  const nodeH = 64;
  const yGap = 34;

  const assignY = (n: WorkNode) => {
    if (n.children.length === 0) {
      const heightPx = getNodeHeightUnits(n) * nodeH;
      yCenter.set(n.id, currentY + heightPx / 2);
      currentY += heightPx + yGap;
      return;
    }
    n.children.forEach(assignY);
    const min = Math.min(...n.children.map((c) => yCenter.get(c.id) ?? 0));
    const max = Math.max(...n.children.map((c) => yCenter.get(c.id) ?? 0));
    yCenter.set(n.id, (min + max) / 2);
  };

  assignY(root);

  const walk = (n: WorkNode, depth: number) => {
    nodes.push({ node: n, depth, x: depth, y: yCenter.get(n.id) ?? 0 });
    for (const c of n.children) {
      edges.push({ from: n.id, to: c.id });
      walk(c, depth + 1);
    }
  };

  walk(root, 0);

  const minY = Math.min(0, ...nodes.map(n => n.y - (getNodeHeightUnits(n.node) * nodeH) / 2));
  const maxY = Math.max(nodeH, ...nodes.map((n) => n.y + (getNodeHeightUnits(n.node) * nodeH) / 2));
  const maxX = Math.max(1, ...nodes.map((n) => n.x));

  return { nodes, edges, maxX, maxY, minY };
}

function nodeLabel(n: WorkNode) {
  return n.title || 'Untitled';
}

function filterMediaNodes(n: WorkNode): WorkNode {
  const c = structuredClone(n);
  c.children = c.children
    .filter(child => child.displayType !== 'photo' && child.displayType !== 'video')
    .map(filterMediaNodes);
  return c;
}

export default function TreeView({ db, onDB }: { db: AppDB; onDB: (next: AppDB) => void }) {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const viewerId = getSessionUserId();
  const project = projectId ? db.projects[projectId] : null;

  const canView = project ? canViewProject(viewerId, project) : false;
  const isOwner = viewerId && project ? viewerId === project.ownerId : false;
  const canEdit =
    !!viewerId &&
    !!project &&
    (isOwner || project.collaborators.some((c) => c.userId === viewerId && (c.role === 'owner' || c.role === 'editor')));

  const [zoom, setZoom] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [displayType, setDisplayType] = useState<WorkNodeDisplayType>('normal');
  const [isMaximized, setIsMaximized] = useState(false);

  const prog = useMemo(() => (project ? projectProgress(project.tree) : { done: 0, total: 0, pct: 0 }), [project]);

  const layout = useMemo(() => {
    if (!project) return null;
    const tree = isOwner ? project.tree : filterMediaNodes(project.tree);
    return buildLayout(tree);
  }, [project, isOwner]);

  const selected = useMemo(() => {
    if (!project || !selectedId) return null;
    const find = (n: WorkNode): WorkNode | null => {
      if (n.id === selectedId) return n;
      for (const c of n.children) {
        const f = find(c);
        if (f) return f;
      }
      return null;
    };
    return find(project.tree);
  }, [project, selectedId]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  const [newUploadProgress, setNewUploadProgress] = useState(0);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const [newTitle, setNewTitle] = useState('');

  const nextChildType = (type: WorkNode['type']): WorkNode['type'] => {
    switch (type) {
      case 'root': return 'branch';
      case 'branch': return 'stem';
      case 'stem': return 'leaf';
      default: return 'fruit';
    }
  };

  React.useEffect(() => {
    if (selected) {
      setTitle(selected.title);
    }
  }, [selected?.id]);

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

  const updateProject = (patch: (p: Project) => void) => {
    const db2: AppDB = structuredClone(db);
    const p = db2.projects[project.id];
    patch(p);
    p.updatedAt = Date.now();
    saveDB(db2);
    onDB(db2);
  };

  const toggleDone = (id: string) => {
    if (!canEdit) return;
    const update = (n: WorkNode): WorkNode => {
      const c = structuredClone(n) as WorkNode;
      if (c.id === id) c.done = !c.done;
      c.children = c.children.map(update);
      return c;
    };
    updateProject((p) => (p.tree = update(p.tree)));
  };

  const rename = () => {
    if (!canEdit || !selected) return;
    const nt = title.trim();
    if (!nt) return;
    const update = (n: WorkNode): WorkNode => {
      const c = structuredClone(n) as WorkNode;
      if (c.id === selected.id) {
        c.title = nt;
      }
      c.children = c.children.map(update);
      return c;
    };
    updateProject((p) => (p.tree = update(p.tree)));
  };

  const updateNodeData = (patch: Partial<WorkNode>) => {
    if (!canEdit || !selected) return;
    const update = (n: WorkNode): WorkNode => {
      const c = structuredClone(n) as WorkNode;
      if (c.id === selected.id) {
        Object.assign(c, patch);
      }
      c.children = c.children.map(update);
      return c;
    };
    updateProject((p) => (p.tree = update(p.tree)));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !selected || !project) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const path = `projects/${project.id}/nodes/${selected.id}/${file.name}`;
      const url = await uploadFile(file, path, (p) => setUploadProgress(p));
      updateNodeData({ displayType: type, mediaUrl: url });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleNewFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !project) return;
    setIsUploadingNew(true);
    setNewUploadProgress(0);
    try {
      const path = `projects/${project.id}/uploads/${Date.now()}_${file.name}`;
      const url = await uploadFile(file, path, (p) => setNewUploadProgress(p));
      setNewMediaUrl(url);
    } catch (err) {
      alert("Upload failed.");
    } finally {
      setIsUploadingNew(false);
      setNewUploadProgress(0);
    }
  };

  const addChild = () => {
    if (!canEdit || !selected) return;
    const t = newTitle.trim();
    const finalTitle = t || (displayType === 'photo' ? 'Photo' : displayType === 'video' ? 'Video' : '');
    if (!finalTitle) return;
    if ((displayType === 'photo' || displayType === 'video') && !newMediaUrl) return;
    const child: WorkNode = {
      id: uid('n'),
      title: finalTitle,
      type: nextChildType(selected.type),
      displayType,
      done: false,
      createdAt: Date.now(),
      children: [],
      linkUrl: displayType === 'link' ? newLinkUrl : undefined,
      mediaUrl: (displayType === 'photo' || displayType === 'video') ? newMediaUrl : undefined,
    };

    updateProject((p) => {
      const add = (n: WorkNode): WorkNode => {
        const c = structuredClone(n);
        if (c.id === selected.id) c.children.push(child);
        else c.children = c.children.map(add);
        return c;
      };
      p.tree = add(p.tree);
    });
    setNewTitle('');
    setNewLinkUrl('');
    setNewMediaUrl('');
  };

  const deleteSelected = () => {
    if (!canEdit || !selected || selected.id === project.tree.id) return;
    const remove = (n: WorkNode): WorkNode => {
      const c = structuredClone(n) as WorkNode;
      c.children = c.children.filter((x) => x.id !== selected.id).map(remove);
      return c;
    };
    updateProject((p) => (p.tree = remove(p.tree)));
    setSelectedId(null);
  };

  const nodeW = 210;
  const nodeH = 64;
  const xGap = 120;

  const width = ((layout?.maxX ?? 1) + 1) * (nodeW + xGap) + 200;
  const height = (layout?.maxY ?? 0) - (layout?.minY ?? 0) + 200;

  return (
    <div className={cn(
      "mx-auto w-full px-4 py-10 transition-all",
      isMaximized ? "max-w-none h-screen fixed inset-0 z-[100] bg-gray-950/95 backdrop-blur-sm flex flex-col p-10" : "max-w-6xl"
    )}>
      <div className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between",
        isMaximized && "mb-6"
      )}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <div className="text-xl font-semibold text-white">Tree view</div>
              <Button
                size="sm"
                variant={isMaximized ? "primary" : "secondary"}
                onClick={() => setIsMaximized(!isMaximized)}
                title={isMaximized ? "Collapse to normal view" : "Expand to whole screen"}
                className="h-8 py-0 px-3 text-[11px]"
              >
                {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {isMaximized ? "Minimize" : "Maximize"}
              </Button>
            </div>
            <div className="mt-1 text-sm text-white/60">{project.title}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Pill className="border-white/10 bg-white/5">{prog.pct}%</Pill>
          <Button variant="secondary" onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.1) * 10) / 10))}>
            <Minus size={16} />
          </Button>
          <Button variant="secondary" onClick={() => setZoom((z) => Math.min(1.6, Math.round((z + 0.1) * 10) / 10))}>
            <Plus size={16} />
          </Button>
          <Button variant="secondary" onClick={() => setZoom(1)}>
            <RotateCcw size={16} /> Reset
          </Button>
        </div>
      </div>

      <div className={cn(
        "mt-6 grid gap-4 transition-all",
        isMaximized ? "flex-1 min-h-0 grid-cols-1" : "lg:grid-cols-[1fr_360px]"
      )}>
        <Card className={cn(
          "relative overflow-hidden p-0",
          isMaximized ? "h-full border-white/20 shadow-2xl flex flex-col" : ""
        )}>
          <div className={cn("overflow-auto", isMaximized ? "flex-1" : "")}>
            <div style={{ width, height, position: 'relative', transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
              <svg style={{ width, height, position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
                <defs>
                  <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
                    <path d="M0,0 L10,5 L0,10 Z" fill="rgba(255,255,255,0.15)" />
                  </marker>
                </defs>
                {layout?.edges.map((e, idx) => {
                  const from = layout.nodes.find((n) => n.node.id === e.from);
                  const to = layout.nodes.find((n) => n.node.id === e.to);
                  if (!from || !to) return null;
                  const x1 = from.x * (nodeW + xGap) + nodeW + 100;
                  const y1 = from.y - layout.minY + 100;
                  const x2 = to.x * (nodeW + xGap) + 100;
                  const y2 = to.y - layout.minY + 100;
                  return (
                    <path
                      key={idx}
                      d={`M ${x1} ${y1} C ${x1 + xGap / 2} ${y1}, ${x2 - xGap / 2} ${y2}, ${x2} ${y2}`}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="2"
                      fill="none"
                      markerEnd="url(#arrow)"
                    />
                  );
                })}
              </svg>

              {layout?.nodes.map((n) => {
                const isSel = selectedId === n.node.id;
                const x = n.x * (nodeW + xGap) + 100;
                const y = n.y - layout.minY + 100 - (getNodeHeightUnits(n.node) * nodeH) / 2;
                return (
                  <button
                    key={n.node.id}
                    className={
                      'absolute rounded-2xl border text-left transition ' +
                      (n.node.displayType === 'note' ? 'overflow-auto resize bg-black/50 ' : '') +
                      (isSel
                        ? 'border-white/25 bg-white/10 shadow-[0_0_0_1px_rgba(255,255,255,0.10)] font-medium'
                        : 'border-white/10 bg-black/20 hover:bg-white/5')
                    }
                    style={{
                      left: x,
                      top: y,
                      width: n.node.displayType === 'note' && n.node.noteWidth ? n.node.noteWidth : nodeW,
                      minHeight: nodeH,
                      height: n.node.displayType === 'note' && n.node.noteHeight ? n.node.noteHeight : 'auto',
                      resize: n.node.displayType === 'note' ? 'both' : undefined,
                      overflow: n.node.displayType === 'note' ? 'auto' : undefined,
                      boxSizing: 'border-box'
                    }}
                    onMouseUp={(e) => {
                      if (n.node.displayType !== 'note' || !canEdit) return;
                      const el = e.currentTarget;
                      if (el.offsetWidth && el.offsetHeight &&
                        (el.offsetWidth !== n.node.noteWidth || el.offsetHeight !== n.node.noteHeight)) {
                        const update = (node: WorkNode): WorkNode => {
                          const c = structuredClone(node) as WorkNode;
                          if (c.id === n.node.id) {
                            c.noteWidth = el.offsetWidth;
                            c.noteHeight = el.offsetHeight;
                          }
                          c.children = c.children.map(update);
                          return c;
                        };
                        updateProject((p) => (p.tree = update(p.tree)));
                      }
                    }}
                    onClick={(e) => {
                      if (n.node.displayType === 'note' && canEdit) {
                        const el = e.currentTarget;
                        const rect = el.getBoundingClientRect();
                        const isResizingCorner = 'clientX' in e && (e as any).clientX > rect.right - 20 && (e as any).clientY > rect.bottom - 20;
                        if (isResizingCorner) return;
                      }
                      setSelectedId(n.node.id)
                    }}
                    type="button"
                  >
                    <div className="flex h-full flex-col justify-center px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className={cn(
                            "text-sm font-semibold text-white",
                            n.node.displayType === 'note' ? "whitespace-pre-wrap break-words" : "truncate"
                          )}>
                            {n.node.displayType === 'link' ? (
                              <div className="flex items-center gap-1">
                                <LinkIcon size={14} className="text-white/60" />
                                <span>{nodeLabel(n.node)}</span>
                              </div>
                            ) : n.node.displayType === 'photo' ? (
                              <div className="flex items-center gap-1">
                                <Image size={14} className="text-white/60" />
                                <span>{nodeLabel(n.node)}</span>
                              </div>
                            ) : n.node.displayType === 'video' ? (
                              <div className="flex items-center gap-1">
                                <Play size={14} className="text-white/60" />
                                <span>{nodeLabel(n.node)}</span>
                              </div>
                            ) : (
                              nodeLabel(n.node)
                            )}
                          </div>
                          <div className="mt-1 text-[10px] text-white/50 uppercase tracking-wider">{n.node.type}</div>
                        </div>
                        <div className="shrink-0">
                          {n.node.displayType === 'link' && (
                            <a
                              href={n.node.linkUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>

                      {(n.node.displayType === 'photo' || n.node.displayType === 'video') && n.node.mediaUrl && (
                        <MediaDisplay mediaUrl={n.node.mediaUrl} type={n.node.displayType as any} title={n.node.title} className="mt-2 overflow-hidden rounded-lg border border-white/10 bg-black/40 h-24" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {!isMaximized && (
          <div className="space-y-4">
            <Card className="p-5">
              <div className="text-sm font-semibold text-white">Edit Node</div>
              <div className="mt-2 text-sm text-white/70">
                {selected ? (
                  <div>
                    <div className="text-white/80 line-clamp-1">Selected: <span className="font-semibold text-white">{selected.title}</span></div>
                    <div className="mt-1 text-[10px] text-white/40 uppercase tracking-tighter">ID: {selected.id}</div>
                  </div>
                ) : (
                  'Select a node to edit its properties.'
                )}
              </div>

              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">Display Mode</div>
                  <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
                    {(['normal', 'note', 'link', 'photo', 'video'] as WorkNodeDisplayType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={cn(
                          "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium transition capitalize",
                          selected && (selected.displayType === t || (!selected.displayType && t === 'normal')) ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                        )}
                        onClick={() => updateNodeData({ displayType: t })}
                        disabled={!canEdit || !selected}
                      >
                        {t === 'normal' && <Type size={12} />}
                        {t === 'note' && <FileText size={12} />}
                        {t === 'link' && <LinkIcon size={12} />}
                        {t === 'photo' && <Image size={12} />}
                        {t === 'video' && <Play size={12} />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {selected?.displayType === 'link' && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-white/50 uppercase">Redirect Link</div>
                    <Input
                      value={selected.linkUrl ?? ''}
                      onChange={(e) => updateNodeData({ linkUrl: e.target.value })}
                      placeholder="https://..."
                      className="h-9"
                      disabled={!canEdit}
                    />
                  </div>
                )}

                {(selected?.displayType === 'photo' || selected?.displayType === 'video') && (
                  <div className="space-y-2">
                    <div className="text-[10px] text-white/50 uppercase">Upload Media</div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept={selected.displayType === 'photo' ? 'image/*' : 'video/*'}
                      onChange={(e) => handleFileUpload(e, selected.displayType as any)}
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!canEdit || isUploading}
                      >
                        {isUploading ? (
                          <><Loader2 size={14} className="animate-spin" /> {Math.round(uploadProgress)}%</>
                        ) : (
                          <>{selected.mediaUrl ? 'Replace file' : 'Upload file'}</>
                        )}
                      </Button>
                      {selected.mediaUrl && (
                        <a
                          href={selected.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-[10px] text-white/50 uppercase tracking-wider">Content / Title</div>
                  {selected?.displayType === 'note' ? (
                    <Textarea
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter note contents..."
                      disabled={!canEdit || !selected}
                      rows={4}
                      className="text-sm bg-white/5"
                    />
                  ) : (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter node title"
                      disabled={!canEdit || !selected}
                      className="h-10 text-sm bg-white/5"
                    />
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {selected?.displayType !== 'note' && (
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => selected && toggleDone(selected.id)} disabled={!canEdit || !selected}>
                      {selected?.done ? <Circle size={16} /> : <CircleCheck size={16} />} Status
                    </Button>
                  )}
                  <Button size="sm" variant="primary" className="flex-1" onClick={rename} disabled={!canEdit || !selected}>
                    <Save size={16} /> Save Changes
                  </Button>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="text-sm font-semibold text-white">Add Child Node</div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-white/50 uppercase">New Node Type</div>
                    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
                      {(['normal', 'note', 'link', 'photo', 'video'] as WorkNodeDisplayType[]).map((t) => (
                        <button
                          key={t}
                          type="button"
                          className={cn(
                            "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-medium transition capitalize",
                            displayType === t ? "bg-white/10 text-white" : "text-white/40 hover:text-white/60"
                          )}
                          onClick={() => setDisplayType(t)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-white/50 uppercase">New Node Content</div>
                    {displayType === 'note' ? (
                      <Textarea value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Note content..." rows={3} className="text-sm" />
                    ) : (
                      <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Node title" className="h-9 text-sm" />
                    )}
                  </div>

                  {displayType === 'link' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/50 uppercase tracking-tighter">Redirect URL</div>
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  {(displayType === 'photo' || displayType === 'video') && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/50 uppercase tracking-tighter">Upload Media</div>
                      <input
                        type="file"
                        ref={newFileInputRef}
                        className="hidden"
                        accept={displayType === 'photo' ? 'image/*' : 'video/*'}
                        onChange={handleNewFileUpload}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() => newFileInputRef.current?.click()}
                          disabled={isUploadingNew}
                        >
                          {isUploadingNew ? (
                            <><Loader2 size={14} className="animate-spin" /> {Math.round(newUploadProgress)}%</>
                          ) : (
                            <>{newMediaUrl ? 'Replace file' : 'Upload file'}</>
                          )}
                        </Button>
                        {newMediaUrl && (
                          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                            {displayType === 'photo' ? (
                              <img src={newMediaUrl} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white/60">
                                <Play size={14} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={addChild}
                      disabled={!canEdit || !selected || (!newTitle.trim() && displayType !== 'photo' && displayType !== 'video') || (displayType === 'link' && !newLinkUrl) || ((displayType === 'photo' || displayType === 'video') && !newMediaUrl)}
                    >
                      <Plus size={16} /> Create Child
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={deleteSelected}
                      disabled={!canEdit || !selected || selected?.id === project.tree.id}
                    >
                      <Trash2 size={16} /> Delete Selected
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <div className="text-sm font-semibold text-white">Tips</div>
              <ul className="mt-2 space-y-1 text-xs text-white/60">
                <li>• Use zoom controls to navigate.</li>
                <li>• Click a node to edit its properties.</li>
                <li>• This is a horizontal tree representation.</li>
              </ul>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
