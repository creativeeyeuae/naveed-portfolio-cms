"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/admin");
  };

  return (
    <div className="login-wrap">
      <div className="login-glow" />
      <div className="login-box">
        <div className="login-brand">
          <div className="login-name">Naveed Anjum</div>
          <div className="login-tag">Studio Access</div>
        </div>
        <form onSubmit={handleSubmit} className="login-card">
          <h1>Admin Login</h1>

          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          {error && <p className="login-error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <a href="/" className="login-back">← Back to site</a>
      </div>

      <style jsx>{`
        .login-wrap {
          min-height: 100vh;
          background: #09060e;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          overflow: hidden;
          font-family: var(--font-sans), "Plus Jakarta Sans", sans-serif;
        }
        .login-glow {
          position: absolute;
          top: -260px;
          left: 50%;
          transform: translateX(-50%);
          width: 640px;
          height: 640px;
          background: radial-gradient(circle, rgba(139, 92, 246, 0.16), transparent 70%);
          pointer-events: none;
        }
        .login-box {
          position: relative;
          width: 100%;
          max-width: 400px;
        }
        .login-brand {
          text-align: center;
          margin-bottom: 36px;
        }
        .login-name {
          font-size: 15px;
          letter-spacing: 4px;
          text-transform: uppercase;
          color: #fff;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .login-tag {
          font-size: 11px;
          letter-spacing: 3px;
          text-transform: uppercase;
          color: #a892c6;
        }
        .login-card {
          background: #140d21;
          border: 1px solid #2d1f45;
          border-radius: 4px;
          padding: 40px 32px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
        }
        .login-card h1 {
          font-size: 20px;
          font-weight: 700;
          color: #fff;
          margin: 0 0 28px;
          text-align: center;
        }
        .login-card label {
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #a892c6;
          display: block;
          margin-bottom: 6px;
        }
        .login-card input {
          width: 100%;
          background: #1c1330;
          border: 1px solid #2d1f45;
          border-radius: 2px;
          color: #fff;
          padding: 12px 14px;
          font-size: 14px;
          margin-bottom: 20px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s;
          font-family: inherit;
        }
        .login-card input:focus {
          border-color: #8b5cf6;
        }
        .login-card input::placeholder {
          color: #6b5c87;
        }
        .login-error {
          color: #f87171;
          font-size: 12px;
          margin: -10px 0 16px;
        }
        .login-card button {
          width: 100%;
          background: #8b5cf6;
          border: none;
          border-radius: 2px;
          color: #fff;
          padding: 13px;
          font-size: 12px;
          letter-spacing: 2px;
          text-transform: uppercase;
          font-weight: 700;
          cursor: pointer;
          transition: background 0.2s;
          font-family: inherit;
        }
        .login-card button:hover:not(:disabled) {
          background: #a855f7;
        }
        .login-card button:disabled {
          opacity: 0.65;
          cursor: default;
        }
        .login-back {
          display: block;
          text-align: center;
          margin-top: 24px;
          font-size: 12px;
          color: #6b5c87;
          text-decoration: none;
        }
        .login-back:hover {
          color: #a892c6;
        }
      `}</style>
    </div>
  );
}
