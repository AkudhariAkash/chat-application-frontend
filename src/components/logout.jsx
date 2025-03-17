import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const useLogout = () => {
  const [error, setError] = useState(""); // State for handling errors
  const navigate = useNavigate();

  const handleLogout = async () => {
    setError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        setError("No authentication token found. Please log in.");
        return;
      }

      const response = await fetch(`https://chat-app-backend-2ph1.onrender.com/api/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // ✅ Log full response details for debugging
      console.log("Logout Response Status:", response.status);
      console.log("Logout Response Headers:", response.headers);

      let data;
      const contentType = response.headers.get("Content-Type");

      // ✅ Check if response contains JSON before parsing
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text(); // Read response as plain text
        console.warn("Server returned non-JSON response:", text);
        throw new Error("Invalid response from server.");
      }

      // ✅ Handle failed responses
      if (!response.ok) {
        console.error("Logout failed:", data);
        setError(data?.msg || `Logout failed: ${response.statusText}`);
        return;
      }

      // ✅ Logout successful, clear storage and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      alert("Logout successful!");
      navigate("/login"); // Redirect to login page
    } catch (err) {
      console.error("Error during logout:", err);
      setError("An error occurred while logging out. Please try again later.");
    }
  };

  return { handleLogout, error };
};

export default useLogout;
