import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useLogout from "./logout";

const generateAvatar = (username) => {
  if (!username) return { initial: "?", backgroundColor: "#cccccc" };

  const storedColor = localStorage.getItem(`avatarColor_${username}`);
  if (storedColor) {
    return { initial: username.charAt(0).toUpperCase(), backgroundColor: storedColor };
  }

  const colors = ["#FFD700", "#FFA07A", "#87CEEB", "#98FB98", "#DDA0DD", "#FFB6C1", "#20B2AA", "#FF6347", "#708090", "#9370DB"];
  const color = colors[Math.floor(Math.random() * colors.length)];

  localStorage.setItem(`avatarColor_${username}`, color);
  return { initial: username.charAt(0).toUpperCase(), backgroundColor: color };
};

const Settings = () => {
  const [avatar, setAvatar] = useState({ initial: "?", backgroundColor: "#cccccc" });
  const [username, setUsername] = useState("");

  const { handleLogout, error } = useLogout(); // ✅ Fix: Extract both handleLogout and error

  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
      const avatarData = generateAvatar(storedUsername);
      setAvatar(avatarData);
    }
  }, []);

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        {/* Avatar */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white mr-4"
          style={{ backgroundColor: avatar.backgroundColor }}
        >
          {avatar.initial}
        </div>

        {/* Display Logged-in Username */}
        <h2 className="text-2xl font-semibold">{username || "Guest"}</h2>

        {/* Logout Button */}
        <button
          onClick={handleLogout} // ✅ Fix: Call the function correctly
          className="ml-auto bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>

      {/* Display Logout Error Message */}
      {error && <p className="text-red-500 text-sm mt-2">{error}</p>} {/* ✅ Fix: Display logout errors if any */}

      {/* Settings Options */}
      <div className="space-y-4">
        <Link to="/account" className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50">
          <span className="text-2xl mr-4">🔑</span>
          <span className="text-lg">Account</span>
        </Link>

        <Link to="/privacy" className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50">
          <span className="text-2xl mr-4">🔒</span>
          <span className="text-lg">Privacy</span>
        </Link>

        <Link to="/help" className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50">
          <span className="text-2xl mr-4">❓</span>
          <span className="text-lg">Help</span>
        </Link>

        <Link to="/invite" className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50">
          <span className="text-2xl mr-4">👥</span>
          <span className="text-lg">Invite Friends</span>
        </Link>

        <Link to="/storage" className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md hover:bg-gray-50">
          <span className="text-2xl mr-4">📁</span>
          <span className="text-lg">Storage</span>
        </Link>

        <div className="flex items-center p-4 bg-red-50 dark:bg-red-900 rounded-lg shadow-md hover:bg-red-100 cursor-pointer">
          <span className="text-2xl mr-4 text-red-600">🗑️</span>
          <span className="text-lg text-red-600">Delete Account</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
