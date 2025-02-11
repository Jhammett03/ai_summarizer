import { useState } from "react";
import axios from "axios";
import Navbar from "./Navbar"; 

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function LoginPage({ handleLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(true); 

  const toggleDarkMode = () => setDarkMode(!darkMode); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    console.log("🛠️ Sending Auth Data:", { username, password, isRegistering });

    try {
      if (isRegistering) {
        // ✅ Register user
        const response = await axios.post(
          `${API_URL}/register`,
          { username, password },
          { withCredentials: true }
        );
        console.log("✅ Registration Successful:", response.data);
        alert("Account created! You can now log in.");
        setIsRegistering(false);
      } else {
        // ✅ Login user
        const response = await axios.post(
          `${API_URL}/login`,
          { username, password },
          { withCredentials: true }
        );

        console.log("✅ Login Successful:", response.data);
        
        // ✅ Fetch session after login to verify it persists
        const sessionResponse = await axios.get(`${API_URL}/me`, { withCredentials: true });

        console.log("🔍 Verified Session:", sessionResponse.data);
        
        // ✅ Set user in state
        handleLogin(sessionResponse.data.user);
      }
    } catch (err) {
      console.error("❌ Auth Error:", err.response?.data || err.message);
      setError(err.response?.data?.error || "Something went wrong.");
    }
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen flex flex-col`}>
      {/* ✅ Navbar with dark mode support */}
      <Navbar darkMode={darkMode} toggleDarkMode={toggleDarkMode} />

      <div className="flex flex-col items-center justify-center flex-grow">
        <div className="bg-gray-800 dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-2xl font-bold text-white">{isRegistering ? "Sign Up" : "Log In"}</h2>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <form onSubmit={handleSubmit} className="mt-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 mt-2 text-gray-800"
              required
            />

            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg mt-4"
            >
              {isRegistering ? "Sign Up" : "Log In"}
            </button>
          </form>

          <button
            className="text-blue-500 mt-4"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? "Already have an account? Log in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
