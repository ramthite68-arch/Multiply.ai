"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setErr(error.message);
      return;
    }
    router.push("/inbox");
    router.refresh();
  }

  return (
    <main style={{ fontFamily: "sans-serif", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <form onSubmit={handleLogin} style={{ width: 340, border: "1px solid #E2E8F0", borderRadius: 12, padding: 28 }}>
        <h1 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Multiply.ai</h1>
        <p style={{ fontSize: 12.5, color: "#64748B", marginBottom: 18 }}>Sign in to your distributor account</p>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10, border: "1px solid #E2E8F0", borderRadius: 8 }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 14, border: "1px solid #E2E8F0", borderRadius: 8 }}
        />
        {err && <p style={{ color: "red", fontSize: 12, marginBottom: 10 }}>{err}</p>}
        <button
          type="submit"
          style={{ width: "100%", padding: 11, background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
        >
          Sign in
        </button>
        <p style={{ fontSize: 11.5, color: "#94A3B8", marginTop: 14 }}>
          First time? Create this user in Supabase → Authentication → Users, then add a matching row in the
          <code> team_users</code> table (see README).
        </p>
      </form>
    </main>
  );
}
