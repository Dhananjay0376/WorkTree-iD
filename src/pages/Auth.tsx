import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Input, Label, Pill } from '../components/ui';
import { generateUniqueUsername, loadDB, saveDB, setSessionUserId } from '../lib/storage';
import type { AppDB, AuthUser } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../lib/firestore';

export default function Auth({ onDB }: { onDB: (next: AppDB) => void }) {
  const { signup, login, googleLogin } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Specific handler for Google Login
  async function handleGoogleLogin() {
    setError(null);
    setLoading(true);
    try {
      await googleLogin();
      // Sync logic is shared
      await syncUserToDB();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate with Google');
      setLoading(false);
    }
  }

  async function syncUserToDB() {
    // On success, we sync with local DB
    // We need to retrieve the user ID. 
    // Since `signup`/`login` returns, `auth.currentUser` should be set.
    import('../lib/firebase').then(async ({ auth }) => {
      const user = auth.currentUser;
      if (user) {
        const db = loadDB();
        const userId = user.uid;

        // Try fetching from Firestore first (for cross-device sync)
        const remoteProfile = await getUserProfile(userId);

        if (remoteProfile) {
          // Restore profile from Firestore
          db.users[userId] = remoteProfile;
          if (remoteProfile.email) {
            db.emailToId[remoteProfile.email.toLowerCase()] = userId;
          }
          if (remoteProfile.username) {
            db.usernames[remoteProfile.username.toLowerCase()] = userId;
          }
          saveDB(db);
        } else if (!db.users[userId]) {
          // Create user profile if it doesn't exist (new signup)
          const newUser: AuthUser = {
            id: userId,
            email: user.email || `google_${userId}@example.com`,
            visibility: 'public',
            lastViewedNotifications: Date.now(),
            createdAt: Date.now(),
            displayName: user.displayName || 'User',
            bio: 'New here — building my first work tree.',
            username: undefined,
          };

          db.users[userId] = newUser;
          if (user.email) {
            db.emailToId[user.email.toLowerCase()] = userId;
          }

          // best-effort unique username
          const username = generateUniqueUsername(newUser.displayName ?? 'user', (u: string) => !!db.usernames[u]);
          db.usernames[username] = userId;
          db.users[userId].username = username;
          saveDB(db);
        }

        setSessionUserId(userId);
        onDB(db);
        navigate(`/u/${userId}`);
      }
    });
  }

  async function submit() {
    setError(null);
    setLoading(true);
    const e = email.trim().toLowerCase();

    if (!e || !e.includes('@')) {
      setError('Enter a valid email.');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      if (mode === 'signup') {
        await signup(e, password);
      } else {
        await login(e, password);
      }

      await syncUserToDB();

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to authenticate');
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10">
      <Card className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xl font-semibold text-white">Authenticate</div>
            <div className="mt-1 text-sm text-white/70">
              {mode === 'signin' ? 'Sign in to your account' : 'Create a new account'}
            </div>
          </div>
          <Pill className="border-indigo-500/20 bg-indigo-500/10 text-indigo-200">Firebase</Pill>
        </div>

        <div className="mt-6 mb-6">
          <Button variant="secondary" className="w-full relative" onClick={handleGoogleLogin} disabled={loading}>
            <div className="absolute left-4 top-1/2 -translate-y-1/2">
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true"><path d="M12.0003 20.45c4.6667 0 7.8752-3.2306 7.8752-8.0461 0-.6733-.0672-1.35-.1835-2.0039H12.0003v3.7022h4.5026c-.1988 1.1345-1.1217 2.923-4.5026 2.923-2.7303 0-4.9604-2.2227-4.9604-4.9926s2.2301-4.9926 4.9604-4.9926c1.2618 0 2.3855.459 3.2758 1.299l2.6789-2.6789c-1.6875-1.575-3.8732-2.5201-5.9547-2.5201-4.8967 0-8.8997 3.965-8.8997 8.8926 0 4.9378 4.003 8.9026 8.8997 8.9026z" fill="currentColor" /></svg>
            </div>
            <span>Continue with Google</span>
          </Button>
          <div className="mt-4 flex items-center gap-2">
            <div className="h-px flex-1 bg-white/10"></div>
            <div className="text-xs text-white/40 uppercase">Or continue with email</div>
            <div className="h-px flex-1 bg-white/10"></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === 'signin' ? 'primary' : 'secondary'} onClick={() => setMode('signin')}>
            Sign in
          </Button>
          <Button variant={mode === 'signup' ? 'primary' : 'secondary'} onClick={() => setMode('signup')}>
            Create account
          </Button>
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@domain.com" />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (min 6 chars)" />
          </div>

          {error ? <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}

          <Button className="w-full" onClick={submit} disabled={loading}>
            {loading ? 'Processing...' : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
