"use client"

import { useState, useEffect, useRef } from "react"
import { Mic, MicOff, Video, VideoOff, PhoneOff, Share, X, UserPlus, Users } from "lucide-react"
import { io } from "socket.io-client"
import axios from "axios"

const VideoCall = ({ callerId, receiverId, roomId, onEndCall }) => {
  // State for UI controls
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOn, setIsVideoOn] = useState(true)
  const [isFullScreen, setIsFullScreen] = useState(false)
  const [callDuration, setCallDuration] = useState("00:00")
  const [connectionStatus, setConnectionStatus] = useState("Connecting...")
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [showUsersList, setShowUsersList] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)

  // WebRTC state
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)

  // User data state
  const [availableUsers, setAvailableUsers] = useState([])
  const [participants, setParticipants] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [receiverUser, setReceiverUser] = useState(null)

  // Socket.io reference
  const socketRef = useRef(null)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://chat-application-backendend.onrender.com"

  // Refs
  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const peerConnectionRef = useRef(null)
  const callTimerRef = useRef(null)
  const callStartTimeRef = useRef(null)

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Get current user data
        const currentUserResponse = await axios.get(`${apiUrl}/api/auths/user/${callerId}`)
        setCurrentUser(currentUserResponse.data)

        // Get receiver user data
        const receiverUserResponse = await axios.get(`${apiUrl}/api/auths/user/${receiverId}`)
        setReceiverUser(receiverUserResponse.data)

        // Initialize participants with current user and receiver
        const initialParticipants = [
          {
            id: callerId,
            name: currentUserResponse.data.username + " (You)",
            isHost: true,
            isMuted: false,
            isVideoOn: true,
            avatar: getAvatarInitials(currentUserResponse.data),
          },
        ]

        if (receiverUserResponse.data) {
          initialParticipants.push({
            id: receiverId,
            name: receiverUserResponse.data.username,
            isHost: false,
            isMuted: false,
            isVideoOn: true,
            avatar: getAvatarInitials(receiverUserResponse.data),
          })
        }

        setParticipants(initialParticipants)

        // Get all other users for the available users list
        const allUsersResponse = await axios.get(`${apiUrl}/api/auths/getAllUsers/${callerId}`)
        // Filter out the receiver who is already in the call
        const filteredUsers = allUsersResponse.data.filter((user) => user._id !== receiverId)
        setAvailableUsers(filteredUsers)
      } catch (error) {
        console.error("Error fetching users:", error)
      }
    }

    fetchUsers()
  }, [callerId, receiverId, apiUrl])

  // Helper function to get avatar initials
  const getAvatarInitials = (user) => {
    if (user.avatarImage && user.avatarImage.initials) {
      return user.avatarImage.initials
    }
    // Fallback to first letter of username
    return user.username.charAt(0).toUpperCase()
  }

  // Initialize WebRTC connection
  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io(apiUrl)

    const socket = socketRef.current

    const initializeCall = async () => {
      try {
        // Get local media stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        })

        setLocalStream(stream)
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        // Create RTCPeerConnection
        const configuration = {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:stun1.l.google.com:19302" }],
        }

        const peerConnection = new RTCPeerConnection(configuration)
        peerConnectionRef.current = peerConnection

        // Add local tracks to the connection
        stream.getTracks().forEach((track) => {
          peerConnection.addTrack(track, stream)
        })

        // Handle incoming tracks (remote stream)
        peerConnection.ontrack = (event) => {
          setRemoteStream(event.streams[0])
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
          }
          setConnectionStatus("Connected")
        }

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            // Send ICE candidate to the other peer via signaling server
            socket.emit("ice-candidate", {
              roomId,
              candidate: event.candidate,
            })
          }
        }

        // Connection state changes
        peerConnection.onconnectionstatechange = () => {
          console.log("Connection state:", peerConnection.connectionState)
          if (peerConnection.connectionState === "connected") {
            setConnectionStatus("Connected")
            startCallTimer()
          } else if (peerConnection.connectionState === "disconnected" || peerConnection.connectionState === "failed") {
            setConnectionStatus("Disconnected")
          }
        }

        // Join the room
        socket.emit("join-room", roomId, callerId)

        // Create and send offer (if you're the caller)
        if (callerId) {
          const offer = await peerConnection.createOffer()
          await peerConnection.setLocalDescription(offer)

          // Send offer to the other peer via signaling server
          socket.emit("offer", {
            roomId,
            offer,
          })
        }

        // Listen for remote user connected
        socket.on("user-connected", (userId) => {
          console.log("User connected to room:", userId)
          setConnectionStatus("User joined")
        })

        // Listen for remote user disconnected
        socket.on("user-disconnected", (userId) => {
          console.log("User disconnected from room:", userId)
          setConnectionStatus("User left")

          // Remove user from participants
          setParticipants((prev) => prev.filter((p) => p.id !== userId))
        })

        // Listen for offers from the other peer
        socket.on("offer", async (offer) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
            const answer = await peerConnectionRef.current.createAnswer()
            await peerConnectionRef.current.setLocalDescription(answer)

            // Send answer back to the caller
            socket.emit("answer", {
              roomId,
              answer,
            })
          }
        })

        // Listen for answers from the other peer
        socket.on("answer", async (answer) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          }
        })

        // Listen for ICE candidates from the other peer
        socket.on("ice-candidate", async (candidate) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
          }
        })
      } catch (error) {
        console.error("Error initializing call:", error)
        setConnectionStatus("Failed to connect")
      }
    }

    initializeCall()

    // Cleanup function
    return () => {
      stopScreenSharing()

      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop())
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }

      if (callTimerRef.current) {
        clearInterval(callTimerRef.current)
      }

      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [callerId, receiverId, roomId, apiUrl])

  // Start call timer
  const startCallTimer = () => {
    callStartTimeRef.current = Date.now()
    callTimerRef.current = setInterval(() => {
      const elapsedTime = Date.now() - (callStartTimeRef.current || 0)
      const minutes = Math.floor(elapsedTime / 60000)
      const seconds = Math.floor((elapsedTime % 60000) / 1000)
      setCallDuration(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`)
    }, 1000)
  }

  // Toggle mute
  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled
        setIsMuted(!track.enabled)
      })

      // Update participant status
      setParticipants(participants.map((p) => (p.id === callerId ? { ...p, isMuted: !p.isMuted } : p)))
    }
  }

  // Toggle video
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled
      })
      setIsVideoOn(!isVideoOn)

      // Update participant status
      setParticipants(participants.map((p) => (p.id === callerId ? { ...p, isVideoOn: !isVideoOn } : p)))
    }
  }

  // Toggle fullscreen
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      const videoContainer = document.querySelector(".video-container")
      if (videoContainer) {
        videoContainer.requestFullscreen().catch((err) => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`)
        })
      }
      setIsFullScreen(true)
    } else {
      document.exitFullscreen()
      setIsFullScreen(false)
    }
  }

  // Start screen sharing
  const startScreenSharing = async () => {
    try {
      // Get screen sharing stream
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      })

      setScreenStream(stream)

      // Replace video track with screen sharing track
      if (peerConnectionRef.current) {
        const videoSender = peerConnectionRef.current.getSenders().find((sender) => sender.track?.kind === "video")

        if (videoSender && stream.getVideoTracks()[0]) {
          videoSender.replaceTrack(stream.getVideoTracks()[0])
        }
      }

      // Update local video preview to show screen
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      // Listen for the end of screen sharing
      stream.getVideoTracks()[0].onended = () => {
        stopScreenSharing()
      }

      setIsScreenSharing(true)
    } catch (error) {
      console.error("Error starting screen sharing:", error)
    }
  }

  // Stop screen sharing
  const stopScreenSharing = () => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop())

      // Replace screen track with camera track
      if (peerConnectionRef.current && localStream) {
        const videoSender = peerConnectionRef.current.getSenders().find((sender) => sender.track?.kind === "video")

        if (videoSender && localStream.getVideoTracks().length > 0) {
          videoSender.replaceTrack(localStream.getVideoTracks()[0])
        }
      }

      // Restore local video preview
      if (localVideoRef.current && localStream) {
        localVideoRef.current.srcObject = localStream
      }

      setScreenStream(null)
      setIsScreenSharing(false)
    }
  }

  // Toggle screen sharing
  const toggleScreenSharing = () => {
    if (isScreenSharing) {
      stopScreenSharing()
    } else {
      startScreenSharing()
    }
  }

  // Add user to call
  const addUserToCall = async (user) => {
    try {
      // Check if user is already in participants
      if (!participants.some((p) => p.id === user._id)) {
        // Create a new participant from the user
        const newParticipant = {
          id: user._id,
          name: user.username,
          isHost: false,
          isMuted: false,
          isVideoOn: true,
          avatar: getAvatarInitials(user),
        }

        setParticipants((prev) => [...prev, newParticipant])

        // Remove from available users
        setAvailableUsers((prev) => prev.filter((u) => u._id !== user._id))

        // In a real implementation, you would send an invitation via the signaling server
        if (socketRef.current) {
          // Notify the user about the call invitation
          socketRef.current.emit("send-notification", {
            email: user.email,
            message: `${currentUser?.username || "Someone"} is inviting you to a video call`,
          })

          // This is a placeholder - actual implementation would depend on your backend
          console.log(`Inviting user ${user._id} to join room ${roomId}`)
        }
      }
    } catch (error) {
      console.error("Error adding user to call:", error)
    }
  }

  // End call
  const handleEndCall = async () => {
    try {
      // Log call details to database
      await axios.post(`${apiUrl}/api/videoCall/log`, {
        from: callerId,
        to: receiverId,
        duration: callDuration,
        status: "ended",
      })
    } catch (error) {
      console.error("Error logging call:", error)
    }

    // Stop all tracks
    stopScreenSharing()

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }

    // Clear timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current)
    }

    // Disconnect from signaling server
    if (socketRef.current) {
      socketRef.current.disconnect()
    }

    // Notify parent component
    if (onEndCall) {
      onEndCall()
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 overflow-hidden text-white">
      {/* Header */}
      <header className="bg-gray-800 shadow-sm p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="font-semibold">Video Call</div>
          <div className="text-sm text-gray-300">{callDuration}</div>
          <div className="text-sm px-2 py-1 rounded-full bg-gray-700">{connectionStatus}</div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main content */}
        <div className="flex-1 flex flex-col">
          {/* Video container */}
          <div className="flex-1 p-4 video-container">
            <div className="relative h-full rounded-lg overflow-hidden bg-black">
              {/* Remote video (main) */}
              <video
                ref={remoteVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                style={{ height: "calc(100vh - 160px)" }}
              />

              {/* Connection status overlay (shown when not connected) */}
              {connectionStatus !== "Connected" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white text-xl">
                  {connectionStatus}
                </div>
              )}

              {/* Screen sharing indicator */}
              {isScreenSharing && (
                <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
                  Screen sharing
                </div>
              )}

              {/* Participants grid (Teams style) */}
              <div className="absolute top-4 right-4 flex flex-wrap gap-2 max-w-[200px]">
                {participants
                  .filter((p) => p.id !== callerId)
                  .map((participant) => (
                    <div
                      key={participant.id}
                      className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium border-2 border-blue-500"
                    >
                      {participant.avatar}
                    </div>
                  ))}
              </div>

              {/* Local video (picture-in-picture) */}
              <div className="absolute bottom-4 right-4 w-1/4 max-w-[200px] h-[120px] rounded-lg overflow-hidden border-2 border-white shadow-lg">
                <video ref={localVideoRef} className="w-full h-full object-cover" autoPlay playsInline muted />

                {/* Muted indicator */}
                {isMuted && (
                  <div className="absolute bottom-2 left-2 bg-red-500 rounded-full p-1">
                    <MicOff size={16} className="text-white" />
                  </div>
                )}

                {/* Video off indicator */}
                {!isVideoOn && (
                  <div className="absolute bottom-2 right-2 bg-red-500 rounded-full p-1">
                    <VideoOff size={16} className="text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls - Teams style */}
          <div className="bg-gray-800 p-4 shadow-lg">
            <div className="flex justify-center space-x-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${isMuted ? "bg-red-500 text-white" : "bg-gray-700 hover:bg-gray-600"}`}
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              </button>

              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${!isVideoOn ? "bg-red-500 text-white" : "bg-gray-700 hover:bg-gray-600"}`}
                title={isVideoOn ? "Turn off camera" : "Turn on camera"}
              >
                {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
              </button>

              <button
                onClick={toggleScreenSharing}
                className={`p-3 rounded-full ${isScreenSharing ? "bg-blue-500 text-white" : "bg-gray-700 hover:bg-gray-600"}`}
                title={isScreenSharing ? "Stop sharing" : "Share screen"}
              >
                <Share size={24} />
              </button>

              <button
                onClick={() => setShowUsersList(!showUsersList)}
                className={`p-3 rounded-full ${showUsersList ? "bg-blue-500 text-white" : "bg-gray-700 hover:bg-gray-600"}`}
                title="Add participants"
              >
                <UserPlus size={24} />
              </button>

              <button
                onClick={() => setShowParticipants(!showParticipants)}
                className={`p-3 rounded-full ${showParticipants ? "bg-blue-500 text-white" : "bg-gray-700 hover:bg-gray-600"}`}
                title="Show participants"
              >
                <Users size={24} />
              </button>

              <button
                onClick={handleEndCall}
                className="p-3 rounded-full bg-red-500 text-white hover:bg-red-600"
                title="End call"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Participants sidebar (conditionally rendered) */}
        {showParticipants && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium">Participants ({participants.length})</h3>
              <button onClick={() => setShowParticipants(false)} className="p-1 rounded-full hover:bg-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-2">
              {participants.map((participant) => (
                <div key={participant.id} className="p-3 hover:bg-gray-700 rounded-lg flex items-center">
                  <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 text-sm">
                    {participant.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span>{participant.name}</span>
                      {participant.isHost && <span className="ml-2 text-xs bg-gray-600 px-2 py-0.5 rounded">Host</span>}
                    </div>
                    <div className="flex mt-1">
                      {participant.isMuted && <MicOff size={14} className="text-gray-400 mr-1" />}
                      {!participant.isVideoOn && <VideoOff size={14} className="text-gray-400" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users list sidebar (conditionally rendered) */}
        {showUsersList && (
          <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
              <h3 className="font-medium">Add People</h3>
              <button onClick={() => setShowUsersList(false)} className="p-1 rounded-full hover:bg-gray-700">
                <X size={18} />
              </button>
            </div>
            <div className="p-2">
              {availableUsers.length > 0 ? (
                availableUsers.map((user) => (
                  <div key={user._id} className="p-3 hover:bg-gray-700 rounded-lg flex items-center">
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3 text-sm">
                      {getAvatarInitials(user)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span>{user.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => addUserToCall(user)}
                      className="ml-2 px-2 py-1 bg-blue-500 hover:bg-blue-600 rounded text-xs"
                    >
                      Add
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400">No more users available to add</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCall

