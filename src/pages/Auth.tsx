import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Layers, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate("/");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm your account.");
    }

    setLoading(false);
  };

  return (
    <div
      className="w-screen h-screen flex items-center justify-center"
      style={{ background: "hsl(var(--background))" }}
    >
      <div className="scanline absolute inset-0 pointer-events-none z-10" />

      <div className="glass-panel rounded-2xl p-8 w-full max-w-sm fade-in z-20">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "hsl(var(--cyan) / 0.15)", border: "1px solid hsl(var(--cyan) / 0.4)" }}
          >
            <Layers size={16} style={{ color: "hsl(var(--cyan))" }} />
          </div>
          <div>
            <div className="font-mono text-xs font-bold tracking-widest uppercase" style={{ color: "hsl(var(--foreground))" }}>
              AR Model Viewer
            </div>
            <div className="font-mono text-xs" style={{ color: "hsl(var(--muted-foreground))" }}>
              {mode === "login" ? "Sign in to your account" : "Create an account"}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs tracking-wider uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
              Email
            </label>
            <div className="relative">
              <Mail size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-transparent border rounded-lg pl-8 pr-3 py-2.5 font-mono text-sm outline-none transition-colors"
                style={{
                  borderColor: "hsl(var(--glass-border))",
                  color: "hsl(var(--foreground))",
                  fontSize: 12,
                }}
                onFocus={(e) => (e.target.style.borderColor = "hsl(var(--cyan))")}
                onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs tracking-wider uppercase" style={{ color: "hsl(var(--muted-foreground))" }}>
              Password
            </label>
            <div className="relative">
              <Lock size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "hsl(var(--muted-foreground))" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-transparent border rounded-lg pl-8 pr-9 py-2.5 font-mono text-sm outline-none transition-colors"
                style={{
                  borderColor: "hsl(var(--glass-border))",
                  color: "hsl(var(--foreground))",
                  fontSize: 12,
                }}
                onFocus={(e) => (e.target.style.borderColor = "hsl(var(--cyan))")}
                onBlur={(e) => (e.target.style.borderColor = "hsl(var(--glass-border))")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "hsl(var(--muted-foreground))" }}
              >
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="font-mono text-xs rounded-lg px-3 py-2 fade-in" style={{ background: "hsl(var(--destructive) / 0.1)", color: "hsl(var(--destructive))", border: "1px solid hsl(var(--destructive) / 0.3)" }}>
              {error}
            </div>
          )}

          {message && (
            <div className="font-mono text-xs rounded-lg px-3 py-2 fade-in" style={{ background: "hsl(var(--cyan) / 0.1)", color: "hsl(var(--cyan))", border: "1px solid hsl(var(--cyan) / 0.3)" }}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-cyan w-full py-2.5 rounded-lg mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setMessage(null); }}
            className="font-mono text-xs transition-colors"
            style={{ color: "hsl(var(--muted-foreground))" }}
            onMouseOver={(e) => (e.currentTarget.style.color = "hsl(var(--cyan))")}
            onMouseOut={(e) => (e.currentTarget.style.color = "hsl(var(--muted-foreground))")}
          >
            {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
