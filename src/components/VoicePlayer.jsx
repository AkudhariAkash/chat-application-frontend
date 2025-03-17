import React, { useState, useRef, useEffect } from "react";

const VoicePlayer = ({ audioUrl }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio(audioUrl)); // ✅ Initialize once

  useEffect(() => {
    audioRef.current.src = audioUrl; // ✅ Update source when `audioUrl` changes

    audioRef.current.onended = () => {
      setIsPlaying(false);
    };

    return () => {
      audioRef.current.pause(); // ✅ Pause when component unmounts
      audioRef.current.currentTime = 0;
    };
  }, [audioUrl]);

  const playAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }

    setIsPlaying(!isPlaying);
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-gray-200 rounded-lg shadow-md w-fit max-w-xs">
      <span className="text-sm font-medium text-gray-700">Voice Message</span>
      <button
        onClick={playAudio}
        className={`px-4 py-2 rounded-lg text-white font-semibold shadow-md transition duration-300 ${
          isPlaying ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {isPlaying ? "⏸️ Pause" : "▶️ Play"}
      </button>
    </div>
  );
};

export default VoicePlayer;
