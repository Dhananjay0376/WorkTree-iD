import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Auth from './pages/Auth';
import Profile from './pages/Profile';
import ProjectPage from './pages/Project';
import Explore from './pages/Explore';
import About from './pages/About';
import TreeView from './pages/TreeView';
import { loadDB, saveDB, setSessionUserId } from './lib/storage';
import type { AppDB } from './lib/storage';
import { ensureSeed } from './lib/sample';
import React, { useEffect, useState } from 'react';
import { Button, Card } from './components/ui';
import AuroraBackground from './components/AuroraBackground';
import { useAuth } from './contexts/AuthContext';
import { UserSearchInput } from './components/UserSearchInput';
import { NotificationBell } from './components/NotificationBell';

function AppShell() {
  const [db, setDB] = useState<AppDB>(() => {
    const loaded = loadDB();
    const seeded = ensureSeed(loaded);
    saveDB(seeded);
    return seeded;
  });

  const updateDB = (next: AppDB) => {
    saveDB(next);
    setDB(next);
  };

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (e.key.includes('design-arena:worktree-db')) setDB(loadDB());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <div className="min-h-screen text-white">
      <AuroraBackground />
      <TopNav db={db} onDB={updateDB} />
      <Routes>
        <Route path="/" element={<Home db={db} />} />
        <Route path="/auth" element={<Auth onDB={updateDB} />} />
        <Route path="/explore" element={<Explore db={db} />} />
        <Route path="/about" element={<About />} />
        <Route path="/u/:userId" element={<Profile db={db} onDB={updateDB} />} />
        <Route path="/p/:projectId" element={<ProjectPage db={db} onDB={updateDB} />} />
        <Route path="/p/:projectId/tree" element={<TreeView db={db} onDB={updateDB} />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </div>
  );
}

function TopNav({ db, onDB }: { db: AppDB; onDB: (next: AppDB) => void }) {
  const { currentUser, logout } = useAuth();
  const viewerId = currentUser ? currentUser.uid : null;
  const me = viewerId ? db.users[viewerId] : null;
  const navigate = useNavigate();
  const location = useLocation();

  const showSearch = location.pathname !== '/';

  return (
    <div className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="group flex items-center gap-2">
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/25 via-emerald-500/20 to-pink-500/20 blur opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative h-9 w-9 overflow-hidden rounded-2xl border border-white/10 bg-transparent shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
              <img
                src="/brand/logo-icon.png"
                alt="WorkTree ID"
                className="h-full w-full object-contain p-0 drop-shadow-[0_10px_22px_rgba(0,0,0,0.35)]"
                draggable={false}
              />
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold leading-none text-white">WorkTree ID</div>
            <div className="text-xs text-white/50">profiles • projects • progress</div>
          </div>
        </Link>

        {showSearch ? (
          <div className="hidden w-full max-w-md md:block">
            <UserSearchInput placeholder="Search users…" autoNavigate />
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <NotificationBell userId={me?.id ?? null} />
          <Link to="/explore" className="hidden sm:block">
            <Button variant="secondary">Explore</Button>
          </Link>
          {me ? (
            <Link to={`/u/${me.id}`}>
              <Button>{me.username ? `@${me.username}` : 'My profile'}</Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button>Sign in</Button>
            </Link>
          )}
          {me ? (
            <Button
              variant="ghost"
              onClick={async () => {
                await logout();
                setSessionUserId(null); // Clear local session just in case
                onDB(loadDB());
                navigate('/');
              }}
            >
              Sign out
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <Card className="p-6">
        <div className="text-lg font-semibold text-white">Page not found</div>
        <div className="mt-2 text-white/70">The link may be wrong or the content may have been removed.</div>
        <div className="mt-4">
          <Link to="/">
            <Button>Home</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

function Footer() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      <div className="border-t border-white/10 pt-6 text-xs text-white/50">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex items-center gap-4">
            <Link to="/about" className="text-white/60 hover:text-white">
              About
            </Link>
            <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white">
              Deployed on Vercel
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

import { AuthProvider } from './contexts/AuthContext';

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'white', background: '#333' }}>
          <h1>Something went wrong.</h1>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
