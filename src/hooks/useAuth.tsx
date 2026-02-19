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
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // 1. Immediately resolve the initial session to avoid spinner stall.
    //    getSession() reads from localStorage synchronously on the JS side
    //    and returns quickly — no network round-trip needed.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const admin = await fetchIsAdmin(session.user.id);
        if (!cancelled) setIsAdmin(admin);
      }
      if (!cancelled) setLoading(false);
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
