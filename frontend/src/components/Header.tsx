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
    <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-bold">🎲</div>
          <h1 className="text-3xl font-bold">Baengo</h1>
        </div>

        {username && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white bg-opacity-20 hover:bg-opacity-30 transition"
            >
              <span>{username}</span>
              <span className="text-lg">▼</span>
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white text-gray-800 rounded-lg shadow-xl z-50">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-lg transition"
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
