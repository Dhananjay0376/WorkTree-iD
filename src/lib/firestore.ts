import { db } from './firebase';
import type { User as FirebaseUser } from 'firebase/auth';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    where,
    updateDoc
} from 'firebase/firestore';
import { normalizeProject } from './storage';
import type { Project, AuthUser } from './storage';

const PROJECTS_COLLECTION = 'projects';
const USERS_COLLECTION = 'users';
const REQUESTS_COLLECTION = 'requests';

export interface CollaborationRequest {
    id: string;
    type: 'project_invite' | 'team_up';
    projectId?: string;
    projectName?: string;
    fromUserId: string;
    fromUsername: string;
    toUserId: string;
    role?: 'editor' | 'viewer';
    status: 'pending' | 'accepted' | 'declined' | 'rejected';
    createdAt: number;
}

/**
 * Synchronizes Firebase Auth state with Firestore user profile.
 */
export async function syncUserProfile(user: FirebaseUser, extraData: Partial<AuthUser> = {}) {
    try {
        const userRef = doc(db, USERS_COLLECTION, user.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
            const newUser: AuthUser = {
                id: user.uid,
                email: user.email || '',
                displayName: user.displayName || user.email?.split('@')[0] || 'Unknown User',
                username: '',
                createdAt: Date.now(),
                visibility: 'public',
                lastViewedNotifications: 0,
                ...extraData
            };
            await setDoc(userRef, newUser);
            return newUser;
        } else {
            if (Object.keys(extraData).length > 0) {
                await updateDoc(userRef, { ...extraData, updatedAt: Date.now() });
            }
            return { ...(snap.data() as AuthUser), ...extraData };
        }
    } catch (err) {
        console.error("syncUserProfile failed:", err);
        return null;
    }
}

/**
 * Saves a user profile to Firestore.
 */
export async function saveUserProfile(user: AuthUser) {
    const userRef = doc(db, USERS_COLLECTION, user.id);
    await setDoc(userRef, {
        ...user,
        updatedAt: Date.now()
    }, { merge: true });
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

/**
 * Fetches multiple user profiles by ID from Firestore.
 */
export async function getUserProfiles(userIds: string[]): Promise<(AuthUser | null)[]> {
    if (userIds.length === 0) return [];
    try {
        return Promise.all(userIds.map(id => getUserProfile(id)));
    } catch (err) {
        console.error("getUserProfiles failed:", err);
        return userIds.map(() => null);
    }
}

/**
 * Saves a project to Firestore.
 */
export async function saveProjectToFirestore(project: Project) {
    const normalized = normalizeProject(project);
    const projectRef = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(projectRef, {
        ...normalized,
    });
}

/**
 * Subscribes to project updates in real-time.
 */
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

/**
 * Sends a project invitation (collaboration request).
 */
export async function sendProjectInvite(fromUser: AuthUser, toUser: AuthUser, project: Project, role: 'editor' | 'viewer' = 'editor') {
    const id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const request: CollaborationRequest = {
        id,
        type: 'project_invite',
        projectId: project.id,
        projectName: project.title,
        fromUserId: fromUser.id,
        fromUsername: fromUser.username || fromUser.displayName || 'Someone',
        toUserId: toUser.id,
        role,
        status: 'pending',
        createdAt: Date.now()
    };
    await setDoc(doc(db, REQUESTS_COLLECTION, id), request);
    return id;
}

/**
 * Subscribes to real-time pending requests for a user.
 */
export function subscribeToRequests(userId: string, onUpdate: (reqs: CollaborationRequest[]) => void) {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where("toUserId", "==", userId),
        where("status", "==", "pending")
    );
    return onSnapshot(q, (snap) => {
        const reqs = snap.docs.map(d => d.data() as CollaborationRequest);
        onUpdate(reqs);
    }, (err) => {
        console.error("subscribeToRequests failed:", err);
    });
}

/**
 * Listens for pending invites for a specific project (Owner view).
 */
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

/**
 * Accepts or declines an invite.
 */
export async function respondToRequest(requestId: string, status: 'accepted' | 'declined' | 'rejected') {
    const ref = doc(db, REQUESTS_COLLECTION, requestId);
    await updateDoc(ref, { status });
}

export async function acceptTeamUp(requestId: string, _fromUserId: string, _toUserId: string) {
    await respondToRequest(requestId, 'accepted');
}

export async function finalizeTeamUp(_fromUserId: string, _toUserId: string) {
    // Placeholder
}

export async function markNotificationsAsSeen(userId: string) {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { lastViewedNotifications: Date.now() });
}

/**
 * Searches for users by username prefix.
 */
export async function searchUsersByUsername(usernameQuery: string): Promise<AuthUser[]> {
    const q = query(
        collection(db, USERS_COLLECTION),
        where("username", ">=", usernameQuery.toLowerCase()),
        where("username", "<=", usernameQuery.toLowerCase() + '\uf8ff')
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as AuthUser);
}

/**
 * Fetches all public projects.
 */
export async function getPublicProjects(): Promise<Project[]> {
    const q = query(collection(db, PROJECTS_COLLECTION), where("visibility", "==", "public"));
    const snap = await getDocs(q);
    return snap.docs.map(d => d.data() as Project);
}

/**
 * Subscribes to SENT requests that were accepted.
 */
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

/**
 * Sends a team-up request.
 */
export async function sendTeamUpRequest(fromUser: AuthUser, toUser: AuthUser) {
    const id = `team_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const request: CollaborationRequest = {
        id,
        type: 'team_up',
        fromUserId: fromUser.id,
        fromUsername: fromUser.username || fromUser.displayName || 'Someone',
        toUserId: toUser.id,
        status: 'pending',
        createdAt: Date.now()
    };
    await setDoc(doc(db, REQUESTS_COLLECTION, id), request);
}

export async function isTeamedUp(userId1: string, userId2: string): Promise<boolean> {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where("type", "==", "team_up"),
        where("status", "==", "accepted")
    );
    const snap = await getDocs(q);
    return snap.docs.some(d => {
        const data = d.data();
        return (data.fromUserId === userId1 && data.toUserId === userId2) ||
            (data.fromUserId === userId2 && data.toUserId === userId1);
    });
}

export async function hasPendingTeamUp(fromUserId: string, toUserId: string): Promise<boolean> {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where("type", "==", "team_up"),
        where("status", "==", "pending"),
        where("fromUserId", "==", fromUserId),
        where("toUserId", "==", toUserId)
    );
    const snap = await getDocs(q);
    return !snap.empty;
}

export function subscribeToTeamMembers(userId: string, callback: (users: AuthUser[]) => void) {
    const q = query(
        collection(db, REQUESTS_COLLECTION),
        where("type", "==", "team_up"),
        where("status", "==", "accepted")
    );

    return onSnapshot(q, async (snap) => {
        const memberIds = new Set<string>();
        snap.docs.forEach(d => {
            const data = d.data();
            if (data.fromUserId === userId) memberIds.add(data.toUserId);
            if (data.toUserId === userId) memberIds.add(data.fromUserId);
        });

        const profiles = await getUserProfiles(Array.from(memberIds));
        callback(profiles.filter(Boolean) as AuthUser[]);
    });
}

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
