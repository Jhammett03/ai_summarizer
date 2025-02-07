import { useState, useEffect } from "react";
import axios from "axios";
import LoginPage from "./components/Login";
import MainApp from "./components/MainApp";

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // ✅ Check session on load
    axios
      .get("http://localhost:5000/me", { withCredentials: true })
      .then((response) => setUser(response.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const handleLogout = async () => {
    try {
      const response = await axios.post("http://localhost:5000/logout", {}, { withCredentials: true });
      console.log("✅ Logout Response:", response.data);
      setUser(null);
      localStorage.removeItem("user");
    } catch (err) {
      console.error("❌ Logout Error:", err.response?.data?.error || err.message);
    }
  };
  

  if (loading) return <p>Loading...</p>;

  return user ? (
    <MainApp user={user} onLogout={handleLogout} />  // ✅ Pass onLogout as a prop
  ) : (
    <LoginPage handleLogin={handleLogin} />
  );
  
}
