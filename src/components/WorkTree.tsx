import { ChevronDown, ChevronRight, ChevronUp, Circle, CircleCheck, FileText, Filter, Image, Link as LinkIcon, MinusSquare, Play, Plus, PlusSquare, Search, Trash2, Type, ExternalLink, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { addChildNode, deleteNode, findParentOf, reorderChild, uid, updateNode } from '../lib/storage';
import type { WorkNode, WorkNodeDisplayType, WorkNodeType } from '../lib/storage';
import { Button, Input, Pill, Textarea } from './ui';
import { cn } from '../lib/utils';
import { uploadFile } from '../lib/upload';
import { MediaDisplay } from './MediaDisplay';

const typeMeta: Record<WorkNodeType, { label: string; className: string }> = {
  root: { label: 'Root', className: 'bg-emerald-500/10 border-emerald-400/15 text-emerald-100' },
  branch: { label: 'Branch', className: 'bg-sky-500/10 border-sky-400/15 text-sky-100' },
  stem: { label: 'Stem', className: 'bg-indigo-500/10 border-indigo-400/15 text-indigo-100' },
  leaf: { label: 'Leaf', className: 'bg-amber-500/10 border-amber-400/15 text-amber-100' },
  fruit: { label: 'Fruit', className: 'bg-fuchsia-500/10 border-fuchsia-400/15 text-fuchsia-100' },
};

export function WorkNodeLegend({ compact }: { compact?: boolean }) {
  const items: WorkNodeType[] = ['root', 'branch', 'stem', 'leaf', 'fruit'];
  return (
    <div className={cn('flex flex-wrap items-center gap-2', compact ? 'text-xs' : 'text-sm')}>
      {items.map((t) => (
        <span key={t} className={cn('inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1')}>
          <span className={cn('h-2.5 w-2.5 rounded-full border', typeMeta[t].className)} />
          <span className="text-white/70">{typeMeta[t].label}</span>
        </span>
      ))}
    </div>
  );
}

function nextChildType(parent: WorkNodeType): WorkNodeType {
  if (parent === 'root') return 'branch';
  if (parent === 'branch') return 'stem';
  if (parent === 'stem') return 'leaf';
  return 'fruit';
}

function flattenAll(root: WorkNode) {
  const ids: string[] = [];
  const walk = (n: WorkNode) => {
    ids.push(n.id);
    n.children.forEach(walk);
  };
  walk(root);
  return ids;
}

type FilterMode = 'all' | 'done' | 'todo';

function NodeRow({
  node,
  depth,
  expanded,
  toggleExpanded,
  canEdit,
  onToggleDone,
  onAddChild,
  onDelete,
  onRename,
  onUpdateDisplayType,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  projectId,
  onUpdateNodeData,
}: {
  node: WorkNode;
  depth: number;
  expanded: boolean;
  toggleExpanded: () => void;
  canEdit: boolean;
  onToggleDone: () => void;
  onAddChild: () => void;
  onDelete: () => void;
  onRename: (title: string) => void;
  onUpdateDisplayType: (type: WorkNodeDisplayType) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  projectId?: string;
  onUpdateNodeData: (patch: Partial<WorkNode>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(node.title);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const path = `projects/${projectId}/nodes/${node.id}/${file.name}`;
      const url = await uploadFile(file, path, (p) => setUploadProgress(p));
      onUpdateNodeData({ displayType: type, mediaUrl: url });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Failed to upload file.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="group flex items-start gap-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="relative flex items-center gap-2" style={{ paddingLeft: depth * 14 }}>
        {/* connector from parent to this row (fixes last/odd child not showing a join) */}
        {depth > 0 ? (
          <div
            className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2"
            style={{ width: depth * 14 + 10 }}
          >
            <div className="absolute right-0 top-1/2 h-px w-4 -translate-y-1/2 bg-white/10" />
          </div>
        ) : null}
        {/* indent guides */}
        {depth > 0 ? (
          <div className="pointer-events-none absolute" style={{ marginLeft: depth * 14 }} />
        ) : null}
        <button
          className={cn(
            'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10',
            node.children.length === 0 && 'opacity-40 hover:bg-white/5'
          )}
          onClick={toggleExpanded}
          disabled={node.children.length === 0}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {node.children.length === 0 ? <span className="text-xs">•</span> : expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {(!node.displayType || node.displayType === 'normal') && (
          <button
            className={cn(
              'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/80 hover:bg-white/10',
              !canEdit && 'opacity-50 hover:bg-white/5'
            )}
            onClick={onToggleDone}
            disabled={!canEdit}
            aria-label={node.done ? 'Mark not done' : 'Mark done'}
          >
            {node.done ? <CircleCheck size={16} /> : <Circle size={16} />}
          </button>
        )}
        {node.displayType === 'link' && (
          <a
            href={node.linkUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
            title="Open link"
          >
            <ExternalLink size={14} />
          </a>
        )}
        {node.displayType === 'photo' && (
          <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
            <Image size={14} />
          </div>
        )}
        {node.displayType === 'video' && (
          <div className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60">
            <Play size={14} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className={cn(
          "flex flex-wrap gap-2",
          node.displayType === 'note' ? "items-start" : "items-center"
        )}>
          <Pill className={cn('border', typeMeta[node.type].className)}>{typeMeta[node.type].label}</Pill>

          {!editing ? (
            node.displayType && node.displayType !== 'normal' ? (
              <div
                className={cn(
                  'w-full text-left text-sm font-medium text-white/90 whitespace-pre-wrap break-words leading-relaxed p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition cursor-pointer h-auto',
                  !canEdit && 'pointer-events-none'
                )}
                onClick={() => {
                  if (!canEdit) return;
                  setTitle(node.title);
                  setEditing(true);
                }}
              >
                {node.title}
                {(node.displayType === 'photo' || node.displayType === 'video') && node.mediaUrl && (
                  <MediaDisplay mediaUrl={node.mediaUrl} type={node.displayType as any} title={node.title} className="mt-2 max-w-sm overflow-hidden rounded-lg border border-white/10 bg-black/40 h-40" />
                )}
                {node.displayType === 'link' && node.linkUrl && (
                  <div className="mt-1 text-xs text-indigo-400 truncate max-w-md">
                    {node.linkUrl}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                <button
                  className={cn(
                    'min-w-0 truncate text-left text-sm font-semibold text-white hover:underline',
                    !canEdit && 'pointer-events-none'
                  )}
                  onClick={() => {
                    if (!canEdit) return;
                    setTitle(node.title);
                    setEditing(true);
                  }}
                  title={canEdit ? 'Click to rename' : undefined}
                >
                  {node.title}
                </button>
              </div>
            )
          ) : (
            <form
              className="flex w-full max-w-xl flex-col gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const t = title.trim();
                if (!t) return;
                onRename(t);
                setEditing(false);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="text-xs text-white/60">Editing {typeMeta[node.type].label}</div>
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                      (!node.displayType || node.displayType === 'normal') ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                    )}
                    onClick={() => onUpdateNodeData({ displayType: 'normal' })}
                  >
                    <Type size={12} /> Normal
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                      node.displayType === 'note' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                    )}
                    onClick={() => onUpdateDisplayType('note')}
                  >
                    <FileText size={12} /> Note
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                      node.displayType === 'link' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                    )}
                    onClick={() => onUpdateNodeData({ displayType: 'link' })}
                  >
                    <LinkIcon size={12} /> Link
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                      node.displayType === 'photo' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                    )}
                    onClick={() => onUpdateNodeData({ displayType: 'photo' })}
                  >
                    <Image size={12} /> Photo
                  </button>
                  <button
                    type="button"
                    className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                      node.displayType === 'video' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                    )}
                    onClick={() => onUpdateNodeData({ displayType: 'video' })}
                  >
                    <Play size={12} /> Video
                  </button>
                </div>
              </div>
              {node.displayType === 'link' && (
                <div className="space-y-1">
                  <div className="text-[10px] text-white/50">Redirect URL</div>
                  <Input
                    value={node.linkUrl ?? ''}
                    onChange={(e) => onUpdateNodeData({ linkUrl: e.target.value })}
                    placeholder="https://..."
                    className="h-8 text-xs"
                  />
                </div>
              )}
              {(node.displayType === 'photo' || node.displayType === 'video') && (
                <div className="space-y-1">
                  <div className="text-[10px] text-white/50">Upload {node.displayType}</div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={node.displayType === 'photo' ? 'image/*' : 'video/*'}
                    onChange={(e) => handleFileUpload(e, node.displayType as any)}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <><Loader2 size={12} className="animate-spin" /> {Math.round(uploadProgress)}%</>
                      ) : (
                        <>Upload file</>
                      )}
                    </Button>
                    {node.mediaUrl && (
                      <a
                        href={node.mediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
                      >
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}
              {node.displayType === 'note' ? (
                <Textarea value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
              ) : (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" autoFocus />
              )}
              <div className="flex items-center gap-2">
                <Button size="sm" type="submit">
                  Save
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(false);
                    setTitle(node.title);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
        {node.description ? <div className="mt-1 text-sm text-white/60">{node.description}</div> : null}
      </div>

      <div className="flex items-center gap-1">
        {canEdit && depth > 0 ? (
          <>
            <Button size="sm" variant="ghost" onClick={onMoveUp} disabled={!canMoveUp} className="h-8 w-8 p-0" title="Move up">
              <ChevronUp size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={onMoveDown} disabled={!canMoveDown} className="h-8 w-8 p-0" title="Move down">
              <ChevronDown size={14} />
            </Button>
          </>
        ) : null}
        <Button size="sm" variant="secondary" onClick={onAddChild} disabled={!canEdit} className="h-9">
          <Plus size={16} /> Add
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} disabled={!canEdit || depth === 0} className="h-9">
          <Trash2 size={16} />
        </Button>
      </div>
    </div >
  );
}

export function WorkTree({
  value,
  onChange,
  canEdit,
  projectId,
  isOwner,
}: {
  value: WorkNode;
  onChange: (next: WorkNode) => void;
  canEdit: boolean;
  projectId?: string;
  isOwner?: boolean;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [isUploadingNew, setIsUploadingNew] = useState(false);
  const [newUploadProgress, setNewUploadProgress] = useState(0);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const [displayType, setDisplayType] = useState<WorkNodeDisplayType>('normal');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [search, setSearch] = useState('');

  // Ensure root is expanded by default.
  useEffect(() => {
    setExpanded((p) => ({ ...p, [value.id]: true }));
  }, [value.id]);

  const flat = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows: Array<{ node: WorkNode; depth: number }> = [];

    const nodeMatches = (n: WorkNode) => {
      if (filterMode === 'done' && !n.done) return false;
      if (filterMode === 'todo' && n.done) return false;
      if (!q) return true;
      return (n.title ?? '').toLowerCase().includes(q) || (n.description ?? '').toLowerCase().includes(q);
    };

    const subtreeHasMatch = (n: WorkNode): boolean => {
      if (nodeMatches(n)) return true;
      return n.children.some(subtreeHasMatch);
    };

    const walk = (n: WorkNode, depth: number) => {
      // Filter out media nodes for non-owners
      if (!isOwner && (n.displayType === 'photo' || n.displayType === 'video')) return;

      // When searching/filtering, keep ancestors of matches.
      if ((q || filterMode !== 'all') && !subtreeHasMatch(n)) return;
      rows.push({ node: n, depth });
      const isExpanded = expanded[n.id] ?? depth < 1;
      if (isExpanded) n.children.forEach((c) => walk(c, depth + 1));
    };

    walk(value, 0);
    return rows;
  }, [value, expanded, filterMode, search, isOwner]);

  const allIds = useMemo(() => flattenAll(value), [value]);

  const expandAll = () => {
    const map: Record<string, boolean> = {};
    for (const id of allIds) map[id] = true;
    setExpanded(map);
  };

  const collapseAll = () => {
    setExpanded({ [value.id]: true });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={expandAll}>
            <PlusSquare size={16} /> Expand all
          </Button>
          <Button size="sm" variant="secondary" onClick={collapseAll}>
            <MinusSquare size={16} /> Collapse all
          </Button>
          <Pill className="border-white/10 bg-black/20">{flat.length} visible</Pill>
        </div>

        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-xs">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/45" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search in tree  " className="h-10 pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={filterMode === 'all' ? 'primary' : 'secondary'}
              onClick={() => setFilterMode('all')}
              title="Show all"
            >
              <Filter size={16} /> All
            </Button>
            <Button size="sm" variant={filterMode === 'todo' ? 'primary' : 'secondary'} onClick={() => setFilterMode('todo')} title="Todo">
              Todo
            </Button>
            <Button size="sm" variant={filterMode === 'done' ? 'primary' : 'secondary'} onClick={() => setFilterMode('done')} title="Done">
              Done
            </Button>
          </div>
        </div>
      </div>

      {flat.map(({ node, depth }) => {
        const isExpanded = expanded[node.id] ?? depth < 1;
        return (
          <React.Fragment key={node.id}>
            <div className="relative">
              {/* indent guides */}
              {depth > 0 ? (
                <div
                  className="pointer-events-none absolute left-0 top-0 h-full"
                  style={{ width: depth * 14 + 12 }}
                >
                  {Array.from({ length: depth }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute top-0 h-full border-l border-white/10"
                      style={{ left: i * 14 + 18 }}
                    />
                  ))}
                </div>
              ) : null}

              <NodeRow
                node={node}
                depth={depth}
                expanded={isExpanded}
                toggleExpanded={() => setExpanded((p) => ({ ...p, [node.id]: !(p[node.id] ?? depth < 1) }))}
                canEdit={canEdit}
                onToggleDone={() => onChange(updateNode(value, node.id, (n) => (n.done = !n.done)))}
                onRename={(title) => onChange(updateNode(value, node.id, (n) => (n.title = title)))}
                onUpdateDisplayType={(type) => onChange(updateNode(value, node.id, (n) => (n.displayType = type)))}
                onUpdateNodeData={(patch) => onChange(updateNode(value, node.id, (n) => Object.assign(n, patch)))}
                projectId={projectId}
                onAddChild={() => {
                  if (!canEdit) return;
                  setAddingTo(node.id);
                  setNewTitle('');
                  setDisplayType('normal');
                  setExpanded((p) => ({ ...p, [node.id]: true }));
                }}
                onDelete={() => {
                  if (!canEdit) return;
                  onChange(deleteNode(value, node.id));
                }}
                onMoveUp={() => onChange(reorderChild(value, node.id, 'up'))}
                onMoveDown={() => onChange(reorderChild(value, node.id, 'down'))}
                canMoveUp={(() => { const p = findParentOf(value, node.id); if (!p) return false; const idx = p.children.findIndex(c => c.id === node.id); return idx > 0; })()}
                canMoveDown={(() => { const p = findParentOf(value, node.id); if (!p) return false; const idx = p.children.findIndex(c => c.id === node.id); return idx < p.children.length - 1; })()}
              />
            </div>

            {addingTo === node.id ? (
              <div className="-mt-1 rounded-xl border border-white/10 bg-white/5 p-3" style={{ marginLeft: depth * 14 + 50 }}>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/60">Add a {typeMeta[nextChildType(node.type)].label.toLowerCase()} under “{node.title}”</div>
                  <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                        displayType === 'normal' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                      )}
                      onClick={() => setDisplayType('normal')}
                    >
                      <Type size={12} /> Normal
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                        displayType === 'note' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                      )}
                      onClick={() => setDisplayType('note')}
                    >
                      <FileText size={12} /> Note
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                        displayType === 'link' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                      )}
                      onClick={() => setDisplayType('link')}
                    >
                      <LinkIcon size={12} /> Link
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                        displayType === 'photo' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                      )}
                      onClick={() => setDisplayType('photo')}
                    >
                      <Image size={12} /> Photo
                    </button>
                    <button
                      type="button"
                      className={cn(
                        'flex items-center gap-1.5 rounded px-2 py-1 text-[10px] font-medium transition',
                        displayType === 'video' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/60'
                      )}
                      onClick={() => setDisplayType('video')}
                    >
                      <Play size={12} /> Video
                    </button>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  {displayType === 'link' && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/50 uppercase">Redirect URL</div>
                      <Input
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-xs"
                      />
                    </div>
                  )}

                  {(displayType === 'photo' || displayType === 'video') && (
                    <div className="space-y-1">
                      <div className="text-[10px] text-white/50 uppercase">Upload {displayType}</div>
                      <input
                        type="file"
                        ref={newFileInputRef}
                        className="hidden"
                        accept={displayType === 'photo' ? 'image/*' : 'video/*'}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !projectId) return;
                          setIsUploadingNew(true);
                          setNewUploadProgress(0);
                          try {
                            const path = `projects/${projectId}/uploads/${Date.now()}_${file.name}`;
                            const url = await uploadFile(file, path, (p) => setNewUploadProgress(p));
                            setNewMediaUrl(url);
                          } catch (err) {
                            alert("Upload failed.");
                          } finally {
                            setIsUploadingNew(false);
                            setNewUploadProgress(0);
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="flex-1 h-8 text-[10px]"
                          onClick={() => newFileInputRef.current?.click()}
                          disabled={isUploadingNew}
                        >
                          {isUploadingNew ? (
                            <><Loader2 size={12} className="animate-spin" /> {Math.round(newUploadProgress)}%</>
                          ) : (
                            <>{newMediaUrl ? 'Change file' : 'Upload file'}</>
                          )}
                        </Button>
                        {newMediaUrl && (
                          <div className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/40">
                            {displayType === 'photo' ? (
                              <img src={newMediaUrl} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-white/40">
                                <Play size={10} />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <form
                  className="mt-2 flex flex-col gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const t = newTitle.trim();
                    if (!t) return;
                    const child: WorkNode = {
                      id: uid('n'),
                      title: t,
                      type: nextChildType(node.type),
                      displayType,
                      done: false,
                      createdAt: Date.now(),
                      children: [],
                      linkUrl: displayType === 'link' ? newLinkUrl : undefined,
                      mediaUrl: (displayType === 'photo' || displayType === 'video') ? newMediaUrl : undefined,
                    };
                    onChange(addChildNode(value, node.id, child));
                    setAddingTo(null);
                    setNewTitle('');
                    setNewLinkUrl('');
                    setNewMediaUrl('');
                  }}
                >
                  {displayType === 'note' ? (
                    <Textarea value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Content..." autoFocus />
                  ) : (
                    <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="h-10" autoFocus />
                  )}
                  <div className="flex items-center gap-2">
                    <Button type="submit">Add</Button>
                    <Button type="button" variant="ghost" onClick={() => setAddingTo(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
