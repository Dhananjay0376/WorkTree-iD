import { db } from './firebase';
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
import type { Project, AuthUser } from './storage';

const PROJECTS_COLLECTION = 'projects';
const USERS_COLLECTION = 'users';
const REQUESTS_COLLECTION = 'requests';

export interface CollaborationRequest {
    id: string;
    type: 'project_invite' | 'team_up';
    projectId?: string;
    projectName?: string; // instead of projectTitle
    fromUserId: string;
    fromUsername: string; // instead of fromUserName
    toUserId: string;
    role?: 'editor' | 'viewer';
    status: 'pending' | 'accepted' | 'declined' | 'rejected';
    createdAt: number;
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
        // We use Promise.all for simplicity. Firestore doesn't have a better native batch 'get' 
        // for individual documents without a complex 'where property in [ids]' query.
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
    const projectRef = doc(db, PROJECTS_COLLECTION, project.id);
    await setDoc(projectRef, {
        ...project,
        updatedAt: Date.now()
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
 * Subscribes to real-time pending invites for a user.
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
    // Add logic to handle team up acceptance if needed (e.g., adding to a teams collection)
    await respondToRequest(requestId, 'accepted');
}

export async function finalizeTeamUp(_fromUserId: string, _toUserId: string) {
    // Placeholder for finalizing team state
}

export async function markNotificationsAsSeen(userId: string) {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, { lastViewedNotifications: Date.now() });
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
 * Subscribes to SENT requests that were accepted (for the Handshake).
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
