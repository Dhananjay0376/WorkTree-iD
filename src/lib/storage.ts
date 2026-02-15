export type Visibility = 'public' | 'private';

export type AuthUser = {
  id: string; // permanent unique id
  email: string;
  username?: string;
  displayName?: string;
  bio?: string;
  visibility: Visibility;
  lastViewedNotifications: number; // timestamp
  createdAt: number;
};

export type Collaborator = {
  userId: string;
  role: 'owner' | 'editor' | 'viewer';
  addedAt: number;
};

export type WorkNodeType = 'root' | 'branch' | 'stem' | 'leaf' | 'fruit';
export type WorkNodeDisplayType = 'normal' | 'note' | 'link' | 'photo' | 'video';

export type WorkNode = {
  id: string;
  title: string;
  description?: string;
  type: WorkNodeType;
  displayType?: WorkNodeDisplayType;
  done: boolean;
  children: WorkNode[];
  createdAt: number;
  linkUrl?: string;
  mediaUrl?: string;
};

export type Project = {
  id: string;
  ownerId: string;
  title: string;
  description?: string;
  visibility: Visibility;
  collaborators: Collaborator[];
  collaboratorIds: string[]; // for easy Firestore querying
  invited: string[]; // userIds invited
  createdAt: number;
  updatedAt: number;
  tree: WorkNode;
};

export type AppDB = {
  users: Record<string, AuthUser>; // by userId
  usernames: Record<string, string>; // username(lowercase) -> userId
  emailToId: Record<string, string>; // email(lowercase) -> userId
  projects: Record<string, Project>; // by projectId
};

const DB_KEY = 'design-arena:worktree-db:v1';
const SESSION_KEY = 'design-arena:worktree-session:v1';

export function uid(prefix = 'u') {
  // short unique id, stable once assigned
  const rand = Math.random().toString(16).slice(2);
  const time = Date.now().toString(16);
  return `${prefix}_${time}_${rand}`;
}

export function slugifyUsername(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_\.]/g, '')
    .slice(0, 24);
}

export function isValidUsername(u: string) {
  return /^[a-z0-9_\.]{3,24}$/.test(u);
}

export function generateUniqueUsername(base: string, isTaken: (u: string) => boolean) {
  const clean = slugifyUsername(base) || 'user';
  if (!isTaken(clean)) return clean;

  let counter = 1;
  while (true) {
    const candidate = `${clean}${counter}`;
    if (!isTaken(candidate)) return candidate;
    counter++;
    if (counter > 100) return `${clean}_${uid().slice(-4)}`; // fallback
  }
}

export function loadDB(): AppDB {
  const raw = localStorage.getItem(DB_KEY);
  if (!raw) {
    const seed: AppDB = { users: {}, usernames: {}, emailToId: {}, projects: {} };
    localStorage.setItem(DB_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as AppDB;
    return {
      users: parsed.users ?? {},
      usernames: parsed.usernames ?? {},
      emailToId: parsed.emailToId ?? {},
      projects: parsed.projects ?? {},
    };
  } catch {
    const reset: AppDB = { users: {}, usernames: {}, emailToId: {}, projects: {} };
    localStorage.setItem(DB_KEY, JSON.stringify(reset));
    return reset;
  }
}

export function saveDB(db: AppDB) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

export function getSessionUserId(): string | null {
  return localStorage.getItem(SESSION_KEY);
}

export function setSessionUserId(userId: string | null) {
  if (!userId) localStorage.removeItem(SESSION_KEY);
  else localStorage.setItem(SESSION_KEY, userId);
}

export function getUserById(db: AppDB, userId: string) {
  return db.users[userId] ?? null;
}

export function getUserByUsernameOrId(db: AppDB, query: string) {
  const q = query.trim();
  if (!q) return null;
  const lower = q.toLowerCase();
  const asUsername = db.usernames[lower];
  if (asUsername) return db.users[asUsername] ?? null;
  return db.users[q] ?? null;
}

export function canViewProfile(viewerId: string | null, profile: AuthUser) {
  if (profile.visibility === 'public') return true;
  return viewerId === profile.id;
}

export function canViewProject(viewerId: string | null, project: Project) {
  if (project.visibility === 'public') return true;
  if (!viewerId) return false;
  if (viewerId === project.ownerId) return true;
  return project.collaborators.some((c) => c.userId === viewerId);
}

export function projectProgress(tree: WorkNode) {
  let total = 0;
  let done = 0;
  const walk = (n: WorkNode) => {
    total += 1;
    if (n.done) done += 1;
    n.children.forEach(walk);
  };
  walk(tree);
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
}

export function findNodeById(root: WorkNode, nodeId: string): WorkNode | null {
  if (root.id === nodeId) return root;
  for (const child of root.children) {
    const found = findNodeById(child, nodeId);
    if (found) return found;
  }
  return null;
}

export function updateNode(root: WorkNode, nodeId: string, updater: (n: WorkNode) => void): WorkNode {
  const clone = structuredClone(root) as WorkNode;
  const node = findNodeById(clone, nodeId);
  if (node) updater(node);
  return clone;
}

export function addChildNode(root: WorkNode, parentId: string, child: WorkNode): WorkNode {
  const clone = structuredClone(root) as WorkNode;
  const parent = findNodeById(clone, parentId);
  if (!parent) return clone;
  parent.children.push(child);
  return clone;
}

export function deleteNode(root: WorkNode, nodeId: string): WorkNode {
  const clone = structuredClone(root) as WorkNode;
  if (clone.id === nodeId) return clone;
  const walk = (n: WorkNode) => {
    n.children = n.children.filter((c) => c.id !== nodeId);
    n.children.forEach(walk);
  };
  walk(clone);
  return clone;
}

/** Find the parent node of a given node ID */
export function findParentOf(root: WorkNode, nodeId: string): WorkNode | null {
  for (const child of root.children) {
    if (child.id === nodeId) return root;
    const found = findParentOf(child, nodeId);
    if (found) return found;
  }
  return null;
}

/** Move a child node up or down among its siblings */
export function reorderChild(root: WorkNode, nodeId: string, direction: 'up' | 'down'): WorkNode {
  const clone = structuredClone(root) as WorkNode;
  const parent = findParentOf(clone, nodeId);
  if (!parent) return clone;
  const idx = parent.children.findIndex((c) => c.id === nodeId);
  if (idx < 0) return clone;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= parent.children.length) return clone;
  // Swap
  [parent.children[idx], parent.children[targetIdx]] = [parent.children[targetIdx], parent.children[idx]];
  return clone;
}
