import { supabase } from '@/lib/supabaseClient';
import type { AuthUser, LoginInput, SignupInput, UserRole } from '@/types';

const SESSION_STORAGE_KEY = 'vtu-smartprep.current-user';

const mockUsers: AuthUser[] = [
  {
    id: '1',
    email: 'student@example.com',
    full_name: 'John Doe',
    role: 'student',
  },
  {
    id: '2',
    email: 'admin@example.com',
    full_name: 'Admin User',
    role: 'admin',
  },
];

let currentUser: AuthUser | null = null;

type AuthChangeCallback = (user: AuthUser | null) => void;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isSupabaseAuthEnabled(): boolean {
  return Boolean(supabase) && isBrowser();
}

export function isUsingSupabaseAuth(): boolean {
  return isSupabaseAuthEnabled();
}

function getSupabaseAuthClient() {
  if (!supabase) {
    throw new Error('Supabase auth is not configured.');
  }

  return supabase;
}

function persistCurrentUser(user: AuthUser | null): void {
  currentUser = user;

  if (!isBrowser()) {
    return;
  }

  if (user) {
    window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

function restoreMockUser(): AuthUser | null {
  if (currentUser) {
    return currentUser;
  }

  if (!isBrowser()) {
    return null;
  }

  const storedUser = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!storedUser) {
    return null;
  }

  try {
    const parsedUser = JSON.parse(storedUser) as AuthUser;
    currentUser = parsedUser;
    return parsedUser;
  } catch (error) {
    console.error('Failed to restore stored user session:', error);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

async function mapSupabaseUser(): Promise<AuthUser | null> {
  if (!supabase) {
    return null;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, role, avatar_url')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    throw new Error(profileError.message);
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email ?? '',
    full_name:
      profile?.full_name ??
      ((user.user_metadata?.full_name as string | undefined) || user.email?.split('@')[0] || 'Student'),
    role:
      (profile?.role as UserRole | undefined) ??
      ((user.user_metadata?.role as UserRole | undefined) || 'student'),
    avatar_url:
      (profile?.avatar_url as string | undefined) ??
      (user.user_metadata?.avatar_url as string | undefined),
  };

  persistCurrentUser(authUser);
  return authUser;
}

async function upsertSupabaseProfile(user: AuthUser): Promise<void> {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      avatar_url: user.avatar_url ?? null,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('Failed to upsert profile:', error.message);
  }
}

async function loginWithMockAuth(input: LoginInput): Promise<AuthUser> {
  const user = mockUsers.find((item) => item.email === input.email);
  if (!user || input.password !== 'password') {
    throw new Error('Invalid credentials');
  }

  persistCurrentUser(user);
  return user;
}

async function signupWithMockAuth(input: SignupInput): Promise<AuthUser> {
  const existingUser = mockUsers.find((item) => item.email === input.email);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const newUser: AuthUser = {
    id: Date.now().toString(),
    email: input.email,
    full_name: input.full_name,
    role: 'student',
  };

  mockUsers.push(newUser);
  persistCurrentUser(newUser);
  return newUser;
}

export async function login(input: LoginInput): Promise<AuthUser> {
  if (!isSupabaseAuthEnabled()) {
    return loginWithMockAuth(input);
  }

  const authClient = getSupabaseAuthClient();

  const { error } = await authClient.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const user = await mapSupabaseUser();
  if (!user) {
    throw new Error('Unable to load signed-in user.');
  }

  return user;
}

export async function signup(input: SignupInput): Promise<AuthUser> {
  if (!isSupabaseAuthEnabled()) {
    return signupWithMockAuth(input);
  }

  const authClient = getSupabaseAuthClient();

  const { data, error } = await authClient.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        full_name: input.full_name,
        role: 'student',
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  const signedUpUser = data.user;
  if (!signedUpUser) {
    throw new Error('Unable to create account.');
  }

  const authUser: AuthUser = {
    id: signedUpUser.id,
    email: signedUpUser.email ?? input.email,
    full_name: input.full_name,
    role: 'student',
  };

  persistCurrentUser(authUser);
  await upsertSupabaseProfile(authUser);

  return authUser;
}

export async function resendSignupConfirmation(email: string): Promise<void> {
  if (!isSupabaseAuthEnabled()) {
    throw new Error('Confirmation emails are only available when Supabase auth is configured.');
  }

  const authClient = getSupabaseAuthClient();
  const { error } = await authClient.auth.resend({
    type: 'signup',
    email,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!isSupabaseAuthEnabled()) {
    throw new Error('Password reset is only available when Supabase auth is configured.');
  }

  const authClient = getSupabaseAuthClient();
  const redirectTo = isBrowser()
    ? `${window.location.origin}/reset-password`
    : undefined;
  const { error } = await authClient.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(newPassword: string): Promise<void> {
  if (!isSupabaseAuthEnabled()) {
    throw new Error('Password reset is only available when Supabase auth is configured.');
  }

  const authClient = getSupabaseAuthClient();
  const { error } = await authClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function logout(): Promise<void> {
  if (isSupabaseAuthEnabled()) {
    const authClient = getSupabaseAuthClient();
    const { error } = await authClient.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }

  persistCurrentUser(null);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!isSupabaseAuthEnabled()) {
    return restoreMockUser();
  }

  return mapSupabaseUser();
}

export function isAuthenticated(): boolean {
  return restoreMockUser() !== null;
}

export function hasRole(role: UserRole): boolean {
  return restoreMockUser()?.role === role;
}

export function subscribeToAuthChanges(callback: AuthChangeCallback): () => void {
  if (!isBrowser()) {
    return () => {};
  }

  if (!supabase) {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_STORAGE_KEY) {
        return;
      }

      callback(restoreMockUser());
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) {
      persistCurrentUser(null);
      callback(null);
      return;
    }

    void mapSupabaseUser()
      .then((user) => {
        callback(user);
      })
      .catch((error) => {
        console.error('Failed to sync auth state:', error);
        persistCurrentUser(null);
        callback(null);
      });
  });

  return () => {
    subscription.unsubscribe();
  };
}

export async function getProtectedRouteState(requiredRole?: UserRole): Promise<{
  user: AuthUser | null;
  redirectTo: string | null;
}> {
  const user = await getCurrentUser();

  if (!user) {
    return { user: null, redirectTo: '/login' };
  }

  if (requiredRole === 'admin' && user.role !== 'admin') {
    return { user, redirectTo: '/dashboard' };
  }

  if (requiredRole === 'student' && user.role !== 'student') {
    return { user, redirectTo: '/admin' };
  }

  return { user, redirectTo: null };
}
