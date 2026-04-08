import { uid } from './storage';
import type { AppDB, AuthUser, Project, WorkNode } from './storage';

export function ensureSeed(db: AppDB) {
  if (Object.keys(db.users).length > 0) return db;

  const now = Date.now();
  const aliceId = uid('u');
  const bobId = uid('u');

  const alice: AuthUser = {
    id: aliceId,
    email: 'alice@example.com',
    username: 'alice',
    displayName: 'Alice',
    bio: 'Building a public roadmap with friends.',
    visibility: 'public',
    lastViewedNotifications: now,
    createdAt: now - 1000 * 60 * 60 * 24 * 3,
  };

  const bob: AuthUser = {
    id: bobId,
    email: 'bob@example.com',
    username: 'bob',
    displayName: 'Bob',
    bio: 'I like breaking big work into small fruits.',
    visibility: 'public',
    lastViewedNotifications: now,
    createdAt: now - 1000 * 60 * 60 * 24 * 2,
  };

  db.users[aliceId] = alice;
  db.users[bobId] = bob;
  db.usernames['alice'] = aliceId;
  db.usernames['bob'] = bobId;
  db.emailToId['alice@example.com'] = aliceId;
  db.emailToId['bob@example.com'] = bobId;

  const tree: WorkNode = {
    id: uid('n'),
    title: 'Launch v1',
    description: 'Root work: ship the first usable version.',
    type: 'root',
    done: false,
    createdAt: now - 1000 * 60 * 60 * 24,
    children: [
      {
        id: uid('n'),
        title: 'Design',
        type: 'branch',
        done: true,
        createdAt: now - 1000 * 60 * 60 * 22,
        description: 'Core UX and information architecture.',
        children: [
          {
            id: uid('n'),
            title: 'Landing page',
            type: 'leaf',
            done: true,
            createdAt: now - 1000 * 60 * 60 * 20,
            children: [],
          },
        ],
      },
      {
        id: uid('n'),
        title: 'Build',
        type: 'branch',
        done: false,
        createdAt: now - 1000 * 60 * 60 * 21,
        description: 'Implementation and testing.',
        children: [
          {
            id: uid('n'),
            title: 'Auth + profiles',
            type: 'stem',
            done: true,
            createdAt: now - 1000 * 60 * 60 * 18,
            children: [],
          },
          {
            id: uid('n'),
            title: 'Projects + tree',
            type: 'stem',
            done: false,
            createdAt: now - 1000 * 60 * 60 * 16,
            children: [
              {
                id: uid('n'),
                title: 'Progress tracking',
                type: 'fruit',
                done: false,
                createdAt: now - 1000 * 60 * 60 * 12,
                children: [],
              },
            ],
          },
        ],
      },
    ],
  };

  const p: Project = {
    id: uid('p'),
    ownerId: aliceId,
    title: 'Public Roadmap',
    description: 'A demo public project anyone can view and request to join.',
    visibility: 'public',
    collaborators: [
      { userId: aliceId, role: 'owner', addedAt: now - 1000 * 60 * 60 * 24 },
      { userId: bobId, role: 'editor', addedAt: now - 1000 * 60 * 60 * 23 },
    ],
    collaboratorIds: [aliceId, bobId],
    editorIds: [bobId],
    invited: [],
    createdAt: now - 1000 * 60 * 60 * 24,
    updatedAt: now - 1000 * 60 * 30,
    tree,
  };

  db.projects[p.id] = p;

  return db;
}
