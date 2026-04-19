import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { useState, useEffect } from "react";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is authenticated from localStorage
    const token = localStorage.getItem("accessToken");
    setIsAuthenticated(!!token);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0b0d10]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-8 py-6 text-lg font-semibold tracking-wide text-[#ff8a2a] shadow-[0_18px_50px_rgba(0,0,0,0.35)]">
          Loading Baengo...
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" />
            ) : (
              <LoginPage onLoginSuccess={() => setIsAuthenticated(true)} />
            )
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
