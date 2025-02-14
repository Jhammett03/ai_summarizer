import React from "react";

export default function Navbar({ darkMode, toggleDarkMode, onLogout, user, showHistory, setShowHistory }) {
  return (
    <nav className="w-full bg-gray-800 text-white p-4 flex justify-between items-center shadow-md">
      <h1 className="text-lg font-bold">AI Summarizer</h1>

      <div className="flex items-center space-x-4">
        {/* Show History Button */}
        {user && (
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="bg-blue-500 px-3 py-1 rounded hover:bg-blue-600 transition"
        >
          {showHistory ? "📂 Close History" : "📂 Show History"}
        </button>)}

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="bg-gray-700 px-3 py-1 rounded hover:bg-gray-600 transition"
        >
          {darkMode ? "🌙 Dark" : "☀️ Light"}
        </button>

        {/* Show Logout Button Only If Logged In */}
        {user && (
          <button
            onClick={onLogout}
            className="bg-red-500 px-3 py-1 rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}
