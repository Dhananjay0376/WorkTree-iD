
import {
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    limit,
    onSnapshot,
    updateDoc
} from "firebase/firestore";
import { db } from "./firebase";
import type { User } from "firebase/auth";
import type { AuthUser, Project } from "./storage";

// Collection reference
const USERS_COLLECTION = "users";
const REQUESTS_COLLECTION = "requests";
const PROJECTS_COLLECTION = "projects";

/**
 * Syncs the Firebase Auth user to Firestore.
 */
export async function syncUserProfile(user: User, additionalData?: Partial<AuthUser>) {
    if (!user) return;
    const userRef = doc(db, USERS_COLLECTION, user.uid);

    // Check if user already exists to avoid overwriting with defaults
    const snap = await getDoc(userRef);
    const existing = snap.exists() ? snap.data() as AuthUser : null;

    const userData: Partial<AuthUser> = {
        id: user.uid,
        email: user.email || "",
        lastViewedNotifications: Date.now(),
        ...additionalData
    };

    // Only set defaults if user doesn't exist
    if (!existing) {
        userData.username = user.displayName?.toLowerCase().replace(/\s+/g, '_') || user.email?.split('@')[0] || "user";
        userData.displayName = user.displayName || "Anonymous";
        userData.visibility = "public";
        userData.createdAt = Date.now();
        userData.bio = "New here — building my first work tree.";
    }

    try {
        await setDoc(userRef, userData, { merge: true });
        return { ...(existing || {}), ...userData } as AuthUser;
    } catch (error) {
        console.error("Error syncing user profile:", error);
        throw error;
    }
}

/**
 * Fetches a user profile by ID from Firestore.
 */
export async function getUserProfile(userId: string): Promise<AuthUser | null> {
    try {
        const userRef = doc(db, USERS_COLLECTION, userId);
        const snap = await getDoc(userRef);
        return snap.exists() ? (snap.data() as AuthUser) : null;
    } catch (err) {
        console.error("getUserProfile failed:", err);
        return null;
    }
}

/** Search users by username prefix */
export async function searchUsersByUsername(prefix: string): Promise<AuthUser[]> {
    if (!prefix) return [];
    const q = query(
        collection(db, USERS_COLLECTION),
        where("username", ">=", prefix.toLowerCase()),
        where("username", "<=", prefix.toLowerCase() + '\uf8ff'),
        limit(5)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AuthUser);
}

// ─── Projects ──────────────────────────────────────────────────

/** Save a project to Firestore for collaboration */
export async function saveProjectToFirestore(project: Project) {
    // Ensure collaboratorIds is in sync
    const ids = project.collaborators.map(c => c.userId);
    const updated = { ...project, collaboratorIds: ids };
    const ref = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(ref, updated);
}

/** Listen for all projects a user is involved in */
export function subscribeToUserProjects(userId: string, callback: (projects: Project[]) => void) {
    const q = query(
        collection(db, PROJECTS_COLLECTION),
        where("collaboratorIds", "array-contains", userId)
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => d.data() as Project));
    }, (err) => {
        console.error("subscribeToUserProjects failed:", err);
    });
}

/** Listen for real-time project updates */
export function subscribeToProject(projectId: string, onUpdate: (p: Project) => void) {
    const ref = doc(db, PROJECTS_COLLECTION, projectId);
    return onSnapshot(ref, (snap) => {
        if (snap.exists()) {
            onUpdate(snap.data() as Project);
        }
    }, (err) => {
        console.error("subscribeToProject failed:", err);
    });
}

// ─── Collaboration ──────────────────────────────────────────────

export interface CollaborationRequest {
    id: string;
    type: 'team_up' | 'project_invite';
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    projectId?: string;
    projectName?: string;
    role?: 'viewer' | 'editor';
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: number;
}

/** Send a team-up request */
export async function sendTeamUpRequest(fromUser: AuthUser, toUser: AuthUser) {
    const id = `teamup_${fromUser.id}_${toUser.id}`;
    const reqRef = doc(db, REQUESTS_COLLECTION, id);
    const request: CollaborationRequest = {
        id,
        type: 'team_up',
        fromUserId: fromUser.id,
        fromUsername: fromUser.username || fromUser.displayName || 'Anonymous',
        toUserId: toUser.id,
        status: 'pending',
        createdAt: Date.now()
    };
    await setDoc(reqRef, request);
    return request;
}

/** Send a project invite */
export async function sendProjectInvite(fromUser: AuthUser, toUser: AuthUser, project: Project, role: 'viewer' | 'editor' = 'viewer') {
    const id = `invite_${project.id}_${toUser.id}`;
    const reqRef = doc(db, REQUESTS_COLLECTION, id);
    const request: CollaborationRequest = {
        id,
        type: 'project_invite',
        fromUserId: fromUser.id,
        fromUsername: fromUser.username || fromUser.displayName || 'Anonymous',
        toUserId: toUser.id,
        projectId: project.id,
        projectName: project.title,
        role,
        status: 'pending',
        createdAt: Date.now()
    };
    await setDoc(reqRef, request);
    return request;
}

/** Listen for requests SENT TO this user */
export function subscribeToRequests(userId: string, callback: (reqs: CollaborationRequest[]) => void) {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where("toUserId", "==", userId),
        where("status", "in", ["pending", "accepted"])
    );
    return onSnapshot(q, (snap) => {
        const reqs = snap.docs.map(d => d.data() as CollaborationRequest);
        reqs.sort((a, b) => b.createdAt - a.createdAt);
        callback(reqs);
    }, (err) => {
        console.error("subscribeToRequests listener failed:", err);
    });
}

/** Listen for requests SENT BY this user */
export function subscribeToSentRequests(userId: string, callback: (reqs: CollaborationRequest[]) => void) {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where("fromUserId", "==", userId),
        where("status", "==", "accepted")
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => d.data() as CollaborationRequest));
    }, (err) => {
        console.error("subscribeToSentRequests listener failed:", err);
    });
}

/** Listen for pending invites for a specific project */
export function subscribeToProjectInvites(projectId: string, callback: (reqs: CollaborationRequest[]) => void) {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where("projectId", "==", projectId),
        where("status", "==", "pending")
    );
    return onSnapshot(q, (snap) => {
        callback(snap.docs.map(d => d.data() as CollaborationRequest));
    }, (err) => {
        console.error("subscribeToProjectInvites listener failed:", err);
    });
}

/** Respond to a request */
export async function respondToRequest(requestId: string, status: 'accepted' | 'rejected') {
    const ref = doc(db, REQUESTS_COLLECTION, requestId);
    await updateDoc(ref, { status });
}

/** Accept team up (Recipient side) */
export async function acceptTeamUp(requestId: string, fromUserId: string, toUserId: string) {
    await respondToRequest(requestId, 'accepted');
    const now = Date.now();
    await setDoc(doc(db, USERS_COLLECTION, toUserId, 'teams', fromUserId), { userId: fromUserId, since: now });
}

/** Handshake (Sender side) */
export async function finalizeTeamUp(fromUserId: string, toUserId: string) {
    const now = Date.now();
    await setDoc(doc(db, USERS_COLLECTION, fromUserId, 'teams', toUserId), { userId: toUserId, since: now });
}

/** Listen for real-time team members */
export function subscribeToTeamMembers(userId: string, onUpdate: (members: AuthUser[]) => void) {
    const q = collection(db, USERS_COLLECTION, userId, 'teams');
    return onSnapshot(q, async (snap) => {
        const ids = snap.docs.map(d => d.id);
        const profiles = await Promise.all(ids.map(id => getUserProfile(id)));
        onUpdate(profiles.filter(Boolean) as AuthUser[]);
    }, (err) => {
        console.error("subscribeToTeamMembers listener failed:", err);
    });
}

export async function isTeamedUp(userId1: string, userId2: string): Promise<boolean> {
    const snap = await getDoc(doc(db, USERS_COLLECTION, userId1, 'teams', userId2));
    return snap.exists();
}

/** Mark notifications as seen by updating the timestamp */
export async function markNotificationsAsSeen(userId: string) {
    const ref = doc(db, USERS_COLLECTION, userId);
    await updateDoc(ref, { lastViewedNotifications: Date.now() });
}

/** Check if there's a pending team-up request between two users */
export async function hasPendingTeamUp(fromId: string, toId: string): Promise<boolean> {
    try {
        const id1 = `teamup_${fromId}_${toId}`;
        const id2 = `teamup_${toId}_${fromId}`;
        const [s1, s2] = await Promise.all([
            getDoc(doc(db, REQUESTS_COLLECTION, id1)),
            getDoc(doc(db, REQUESTS_COLLECTION, id2)),
        ]);
        return (s1.exists() && s1.data()?.status === 'pending') || (s2.exists() && s2.data()?.status === 'pending');
    } catch { return false; }
}
