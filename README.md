# WorkTree ID

WorkTree ID is a React + TypeScript app for building collaborative projects as nested work trees. Each user has a permanent identity, an optional username, a profile with privacy controls, and a set of projects that can be explored, edited, and shared with collaborators.

The current implementation is a hybrid:

- Local app state is stored in `localStorage`
- Media is stored in IndexedDB or embedded as compressed base64
- Authentication, public user profiles, project sync, and collaboration requests use Firebase

This means the app already behaves like a real product in several places, but some features are still partly demo-oriented and browser-local.

## What the app does

Core product concepts:

- Permanent user identity via Firebase Auth UID
- Optional unique username for search and sharing
- Public or private user profiles
- Projects owned by a user and represented as a tree
- Tree nodes mapped to `root -> branch -> stem -> leaf -> fruit`
- Collaboration via invites and team-up requests
- Progress tracking based on completed nodes
- Two project views:
  - a structured list/tree editor
  - a visual horizontal graph view

## Main user flows

### 1. Authentication

Users can:

- sign up with email/password
- sign in with email/password
- sign in with Google

After login, the app:

- syncs or creates a Firestore user profile
- mirrors that user into the browser-local database
- stores the active session user ID locally

## 2. Profiles

Each profile includes:

- permanent ID
- username
- display name
- bio
- visibility (`public` or `private`)
- projects associated with the user
- a lightweight team section based on accepted team-up requests

Owners can edit their profile and sync it back to Firestore.

## 3. Projects

A project contains:

- owner
- visibility
- collaborators
- nested work tree
- timestamps

Owners can:

- create projects
- edit title and description
- switch public/private visibility
- invite collaborators
- remove collaborators
- duplicate a project
- delete a project

Editors can modify tree content. Viewers can open the project but not edit it.

## 4. Work trees

Projects are modeled as recursive nodes. A node can be:

- `normal`
- `note`
- `link`
- `photo`
- `video`

Users can:

- add child nodes
- rename nodes
- mark nodes done
- reorder siblings
- delete nodes
- attach URLs
- upload image/video content
- resize note-style nodes
- search/filter the tree
- undo and redo edits in the main project page

## 5. Collaboration and notifications

The app supports two request types:

- `project_invite`
- `team_up`

Users receive pending requests in the notification bell and can accept or reject them. Accepted project invites are used to add collaborators to the project. Accepted team-up requests currently power the "Team" UI on profiles.

## Screens and routes

- `/` - landing page, profile search, public project preview, recent searches
- `/auth` - email/password and Google authentication
- `/explore` - public project listing
- `/about` - company/founder/about page
- `/u/:userId` - profile page and profile settings
- `/p/:projectId` - project editor, collaborator management, list/tree editing
- `/p/:projectId/tree` - visual graph/tree layout view

## Tech stack

- React 19
- TypeScript
- Vite 7
- React Router 7
- Tailwind CSS 4
- Firebase Auth
- Firestore
- Firebase Hosting config included
- Lucide icons
- Framer Motion
- Three.js / React Three Fiber / Drei are installed, though not central to current flows

## Repository structure

```text
src/
  components/
    AuroraBackground.tsx
    MediaDisplay.tsx
    NotificationBell.tsx
    UserSearchInput.tsx
    WorkTree.tsx
    ui.tsx
  contexts/
    AuthContext.tsx
  lib/
    firebase.ts
    firestore.ts
    history.ts
    media.ts
    recent.ts
    sample.ts
    storage.ts
    upload.ts
    utils.ts
  pages/
    About.tsx
    Auth.tsx
    Explore.tsx
    Home.tsx
    Profile.tsx
    Project.tsx
    TreeView.tsx
  App.tsx
  main.tsx
public/
  brand/
  owners/
firebase.json
firestore.rules
```

## Architecture summary

### Frontend state model

There are two overlapping persistence layers:

### Local browser database

Defined in `src/lib/storage.ts`.

Stored in `localStorage` under:

- `design-arena:worktree-db:v1`
- `design-arena:worktree-session:v1`
- `design-arena:worktree-recent-searches:v1`

This local DB currently holds:

- users
- username index
- email-to-user mapping
- projects

It is still the main source of truth for most UI rendering.

### Firebase / Firestore

Defined in:

- `src/lib/firebase.ts`
- `src/lib/firestore.ts`
- `src/contexts/AuthContext.tsx`

Firebase is used for:

- authentication
- remote user profiles
- collaboration requests
- project document sync
- project/user discovery across devices

### Media storage

Defined in `src/lib/media.ts`.

The current media strategy is intentionally lightweight:

- small images are compressed and stored inline as `sync:<base64>`
- larger images and videos are stored in IndexedDB as `local:<id>`

This is not Firebase Storage-backed media yet, even though Firebase Storage is initialized.

## Data model

### `AuthUser`

Important fields:

- `id`
- `email`
- `username`
- `displayName`
- `bio`
- `visibility`
- `lastViewedNotifications`
- `createdAt`

### `Project`

Important fields:

- `id`
- `ownerId`
- `title`
- `description`
- `visibility`
- `collaborators`
- `collaboratorIds`
- `invited`
- `createdAt`
- `updatedAt`
- `tree`

### `WorkNode`

Important fields:

- `id`
- `title`
- `description`
- `type`
- `displayType`
- `done`
- `children`
- `createdAt`
- `linkUrl`
- `mediaUrl`
- `noteWidth`
- `noteHeight`

## Important implementation details

### Seed data

On first load, the app seeds sample local data if the browser DB is empty. The seed includes:

- users `alice` and `bob`
- a public example project called `Public Roadmap`

This makes the app usable immediately in a fresh browser.

### Profile search

There are two search paths:

- home page search uses the local browser database
- navbar/invite search uses Firestore username prefix search

### Project editing

The main project page uses an undo/redo history stack around the tree state. Keyboard shortcuts:

- `Ctrl+Z` / `Cmd+Z`
- `Ctrl+Shift+Z` / `Cmd+Shift+Z`
- `Ctrl+Y`

### Tree visibility rules

Non-owners can view private projects only if they are collaborators. In the visual tree and list tree UIs, media nodes may be hidden from non-owners.

### Collaboration workflow

Project collaboration currently works like this:

1. Owner searches for a user.
2. Owner sends an invite request in Firestore.
3. Recipient sees it in notifications.
4. Recipient accepts.
5. Owner-side listener notices accepted invites and adds the user to project collaborators.

### Notifications

Notifications are based on Firestore request documents and a `lastViewedNotifications` timestamp stored on the user profile.

## Firebase setup

Create a `.env.local` file in the project root with:

```env
VITE_FIREBASE_API_KEY=your_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

The app reads these values in `src/lib/firebase.ts`.

## Local development

Install dependencies:

```bash
npm install
```

Run the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Preview the production build:

```bash
npm run preview
```

## Firebase hosting and rules

Included files:

- `firebase.json` configures SPA hosting from `dist`
- `firestore.rules` contains Firestore security rules

Current rule behavior is important:

- user profiles are publicly readable
- only the authenticated user can write their own profile
- requests are readable/writable only by involved users
- projects currently require authentication for reads
- only the owner can write a project document

That project read rule does not fully match the UI concept of "public projects viewable by anyone". If anonymous public access is required, Firestore rules will need to change.

## Known limitations and caveats

- The app still relies heavily on browser-local project state.
- Firestore sync is partial rather than fully authoritative.
- Media does not upload to Cloud Storage yet.
- `finalizeTeamUp()` is still a placeholder.
- "Public" in the UI is broader than current Firestore read rules.
- The footer still describes the build as local-storage-first, which is only partly true now.
- Home page search and navbar search use different backends.
- Some text encoding artifacts exist in the source UI strings.

## Current maturity

This is best described as a working product prototype:

- real authentication exists
- real Firestore sync exists
- collaboration requests exist
- project editing is substantial
- persistence is still mixed between local demo-style storage and remote services

## Suggested next steps

If you want to continue productizing this codebase, the highest-leverage improvements are:

1. Make Firestore the single source of truth for projects.
2. Move media to Firebase Storage instead of IndexedDB/base64.
3. Align Firestore security rules with public/private project behavior.
4. Unify all user/project search onto one data source.
5. Finish team-up persistence beyond request acceptance.
6. Add tests for tree editing, collaborator flows, and auth/profile sync.

## Summary

WorkTree ID is a collaborative identity + project-tree app built with React, Vite, Tailwind, and Firebase. Users create persistent identities, manage public/private profiles, build nested work trees, invite collaborators, and track progress visually. The app is already usable, but it is still in a hybrid stage between local-first prototype behavior and fully remote-backed production architecture.
