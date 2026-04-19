import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface HeaderProps {
  username?: string;
}

export default function Header({ username }: HeaderProps) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("username");
    localStorage.removeItem("userId");
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0c10]/85 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg border border-[#ff8a2a]/45 bg-[#ff8a2a]/12 text-lg font-extrabold text-[#ff9a3f]">
            B
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#f3f6fb]">
            Baengo
          </h1>
        </div>

        {username && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/[0.05] px-4 py-2 transition hover:border-[#ff8a2a]/55 hover:bg-[#ff8a2a]/10"
            >
              <span className="font-medium text-[#dde4ee]">{username}</span>
              <span className="text-lg text-[#ff9a3f]">▼</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 z-50 mt-2 w-48 rounded-lg border border-white/15 bg-[#12161d] text-[#dbe2ec] shadow-2xl">
                <button
                  onClick={handleLogout}
                  className="w-full rounded-lg px-4 py-2 text-left font-medium transition hover:bg-[#ff5722]/15 hover:text-[#ffb27c]"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
