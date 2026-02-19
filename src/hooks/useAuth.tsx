import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
  refreshAuth: async () => {},
});

async function fetchIsAdmin(userId: string): Promise<boolean> {
  try {
    const timeout = new Promise<false>((resolve) =>
      setTimeout(() => resolve(false), 8000)
    );
    // Use the has_role RPC (SECURITY DEFINER) to bypass any RLS timing issues
    const query = supabase
      .rpc("has_role", { _user_id: userId, _role: "admin" })
      .then(({ data, error }) => {
        if (error) return false;
        return !!data;
      });

    return await Promise.race([query, timeout]);
  } catch {
    return false;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1. Immediately resolve the initial session to unblock the UI.
    //    getSession() reads from localStorage — no network round-trip.
    //    We set loading:false BEFORE the admin check so the app renders
    //    instantly; admin privileges update a moment later.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (!cancelled) setLoading(false); // unblock UI immediately
      if (session?.user) {
        const admin = await fetchIsAdmin(session.user.id);
        if (!cancelled) setIsAdmin(admin);
      }
    });

    // 2. Keep listening for sign-in / sign-out / token refresh events.
    //    We skip INITIAL_SESSION here because getSession() already handled it.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (cancelled) return;
        if (event === "INITIAL_SESSION") return; // handled above
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const admin = await fetchIsAdmin(session.user.id);
          if (!cancelled) setIsAdmin(admin);
        } else {
          setIsAdmin(false);
        }
        if (!cancelled) setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const refreshAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    setUser(session?.user ?? null);
    if (session?.user) {
      const admin = await fetchIsAdmin(session.user.id);
      setIsAdmin(admin);
    } else {
      setIsAdmin(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signOut, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
