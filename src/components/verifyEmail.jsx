import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const chatURL="https://chat-app-backend-2ph1.onrender.com/api"

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const verifyEmailToken = async () => {
      try {
        const response = await fetch(`${chatURL}/auths/verify-email/${token}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setMessage("Email verified successfully!");
          setTimeout(() => navigate("/login"), 3000); // Redirect to login after 3 seconds
        } else {
          setError(data.message || "Failed to verify email.");
        }
      } catch (err) {
        console.error("Error verifying email:", err);
        setError("Something went wrong. Please try again later.");
      }
    };

    verifyEmailToken();
  }, [token, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Verify Email</h2>
        {message && <p className="text-green-500">{message}</p>}
        {error && <p className="text-red-500">{error}</p>}
        <p className="text-gray-600 dark:text-gray-400 mt-4">
          Redirecting to login page...
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;
