import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../api/client";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await authApi.resetPassword(token, newPassword);
      setSuccess(true);
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
          Reset Password
        </h2>

        {!token && (
          <div className="mb-4 rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-red-200">
            Missing reset token. Ask for a new reset link.
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-red-400/35 bg-red-500/10 p-3 text-red-200">
            {error}
          </div>
        )}

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-400/35 bg-emerald-500/10 p-3 text-emerald-200">
              Password reset successfully. You can now log in.
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full rounded-lg bg-gradient-to-r from-[#ff7c24] to-[#ff4f2a] px-4 py-2 font-bold text-white shadow-[0_10px_28px_rgba(255,92,31,0.35)] transition hover:brightness-110"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold tracking-wide text-[#a9b1bc]">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-[#141920] px-4 py-2 text-[#eef2f7] placeholder:text-[#7f8894] focus:border-[#ff8a2a] focus:outline-none focus:ring-2 focus:ring-[#ff8a2a]/35"
                placeholder="Enter your new password"
                required
                disabled={!token}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="w-full rounded-lg bg-gradient-to-r from-[#ff7c24] to-[#ff4f2a] px-4 py-2 font-bold text-white shadow-[0_10px_28px_rgba(255,92,31,0.35)] transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
