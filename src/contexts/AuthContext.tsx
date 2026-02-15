import React, { createContext, useContext, useEffect, useState } from "react";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    type User
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { syncUserProfile } from "../lib/firestore";

interface AuthContextType {
    currentUser: User | null;
    signup: (email: string, password: string) => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    googleLogin: () => Promise<void>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Sign Up function
    async function signup(email: string, password: string) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await syncUserProfile(cred.user);
    }

    // Login function
    async function login(email: string, password: string) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        await syncUserProfile(cred.user);
    }

    // Google Login function
    async function googleLogin() {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        await syncUserProfile(cred.user);
    }

    // Logout function
    async function logout() {
        await signOut(auth);
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        signup,
        login,
        logout,
        googleLogin,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}
