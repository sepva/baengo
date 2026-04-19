import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/client";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = isLogin ? authApi.login : authApi.register;
      await endpoint(username, password);

      onLoginSuccess();
      navigate("/");
    } catch (err) {
      const message =
        (err as any)?.response?.data?.message ||
        (err instanceof Error ? err.message : "An error occurred");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0d10] px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-white/[0.02] p-8 shadow-[0_28px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm">
        <h1 className="mb-8 text-center text-4xl font-extrabold tracking-tight text-[#ff8a2a]">
          Baengo
        </h1>
        <h2 className="mb-6 text-center text-2xl font-bold text-[#f3f5f8]">
          {isLogin ? "Welcome Back" : "Join the Game"}
        </h2>

        {error && (
          <div className="mb-4 rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold tracking-wide text-[#a9b1bc]">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#141920] px-4 py-2 text-[#eef2f7] placeholder:text-[#7f8894] focus:border-[#ff8a2a] focus:outline-none focus:ring-2 focus:ring-[#ff8a2a]/35"
              placeholder="Enter your username"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold tracking-wide text-[#a9b1bc]">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/15 bg-[#141920] px-4 py-2 text-[#eef2f7] placeholder:text-[#7f8894] focus:border-[#ff8a2a] focus:outline-none focus:ring-2 focus:ring-[#ff8a2a]/35"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-[#ff7c24] to-[#ff4f2a] px-4 py-2 font-bold text-white shadow-[0_10px_28px_rgba(255,92,31,0.35)] transition hover:brightness-110 disabled:opacity-50"
          >
            {loading ? "Loading..." : isLogin ? "Login" : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#aab1bd]">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="font-bold text-[#ff8a2a] hover:text-[#ff9f4d]"
            >
              {isLogin ? "Register" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
