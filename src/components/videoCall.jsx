"use client"

import { useState, useEffect, useRef } from "react"
import { io } from "socket.io-client"

// Icons (you can replace with your preferred icon library)
const Mic = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
const MicOff = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="2" x2="22" y1="2" y2="22"/><path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2"/><path d="M5 10v2a7 7 0 0 0 12 0v-2"/><path d="M12 19v3"/><path d="M8 22h8"/><path d="m15 9-3-3-3 3"/><path d="M12 6v6"/></svg>
const Video = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
const VideoOff = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
const PhoneOff = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>
const Share = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" x2="12" y1="2" y2="15"/></svg>
const X = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
const UserPlus = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
const Users = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const Maximize = (props) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>

const VideoCall = ({ callerId, receiverId, onEndCall }) => {
  // Generate a unique room ID based on caller and receiver IDs
  const [roomId] = useState(() => `room_${callerId}_${receiverId}_${Date.now()}`)

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
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://your-server-url.com"

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
        // Get all users - replace with your API
        const allUsersResponse = await fetch(`${apiUrl}/api/users?excludeId=${callerId}`)
        const users = await allUsersResponse.json()

        // Find receiver user from the response
        const receiverUserData = users.find((user) => user._id === receiverId)
        setReceiverUser(receiverUserData)

        // Get current user data
        const currentUserResponse = await fetch(`${apiUrl}/api/users/${callerId}`)
        const currentUserData = await currentUserResponse.json()
        setCurrentUser(currentUserData)

        // Initialize participants with current user and receiver
        const initialParticipants = [
          {
            id: callerId,
            name: currentUserData.username + " (You)",
            isHost: true,
            isMuted: false,
            isVideoOn: true,
            avatar: getAvatarInitials(currentUserData),
          },
        ]

        if (receiverUserData) {
          initialParticipants.push({
            id: receiverId,
            name: receiverUserData.username,
            isHost: false,
            isMuted: false,
            isVideoOn: true,
            avatar: getAvatarInitials(receiverUserData),
          })
        }

        setParticipants(initialParticipants)

        // Filter out the receiver who is already in the call
        const filteredUsers = users.filter((user) => user._id !== receiverId)
        setAvailableUsers(filteredUsers)

        // Log call to database
        logCallStart()
      } catch (error) {
        console.error("Error fetching users:", error)
        
        // Fallback for demo purposes
        setCurrentUser({ _id: callerId, username: "You" })
        setReceiverUser({ _id: receiverId, username: "Receiver" })
        
        const initialParticipants = [
          {
            id: callerId,
            name: "You",
            isHost: true,
            isMuted: false,
            isVideoOn: true,
            avatar: "Y",
          },
          {
            id: receiverId,
            name: "Receiver",
            isHost: false,
            isMuted: false,
            isVideoOn: true,
            avatar: "R",
          }
        ]
        
        setParticipants(initialParticipants)
      }
    }

    fetchUsers()
  }, [callerId, receiverId, apiUrl])

  // Log call start
  const logCallStart = async () => {
    try {
      await fetch(`${apiUrl}/api/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: callerId,
          to: receiverId,
          type: "video",
          status: "started",
        }),
      })
    } catch (error) {
      console.error("Error logging call start:", error)
    }
  }

  // Helper function to get avatar initials
  const getAvatarInitials = (user) => {
    if (!user || !user.username) return "?"
    return user.username.charAt(0).toUpperCase()
  }

  // Initialize WebRTC connection
  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io(apiUrl)
    const socket = socketRef.current

    // Register user with socket server
    socket.emit("register-user", callerId)

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
          iceServers: [
            { urls: "stun:stun.l.google.com:19302" }, 
            { urls: "stun:stun1.l.google.com:19302" }
          ],
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
              to: receiverId,
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

        // Initiate call to receiver
        socket.emit("call-users", {
          from: callerId,
          toUsers: [receiverId],
          roomId: roomId
        })

        // Listen for incoming call (for receiver)
        socket.on("incoming-call", ({ from, roomId: incomingRoomId }) => {
          console.log(`Incoming call from ${from} in room ${incomingRoomId}`)
          // Auto-accept the call in this implementation
          socket.emit("accept-call", { userId: callerId, roomId: incomingRoomId })
        })

        // Listen for user joined
        socket.on("user-joined", ({ userId }) => {
          console.log(`User ${userId} joined the call`)
          setConnectionStatus("Connected")
          
          // Create and send offer
          createAndSendOffer()
        })
        
        // Function to create and send offer
        const createAndSendOffer = async () => {
          try {
            const offer = await peerConnection.createOffer()
            await peerConnection.setLocalDescription(offer)
            
            // This would be handled by your signaling mechanism
            // For simplicity, we'll assume the server routes this appropriately
            // In a real implementation, you'd send this to the specific user
            socket.emit("offer", { offer, to: receiverId, from: callerId, roomId })
          } catch (err) {
            console.error("Error creating offer:", err)
          }
        }

        // Listen for call rejected
        socket.on("call-rejected", ({ userId }) => {
          console.log(`Call rejected by ${userId}`)
          setConnectionStatus("Call rejected")
          // You might want to end the call here
        })
        
        // Listen for offers
        socket.on("offer", async ({ offer, from }) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer))
            
            // Create answer
            const answer = await peerConnectionRef.current.createAnswer()
            await peerConnectionRef.current.setLocalDescription(answer)
            
            // Send answer back
            socket.emit("answer", { answer, to: from, from: callerId, roomId })
          }
        })
        
        // Listen for answers
        socket.on("answer", async ({ answer }) => {
          if (peerConnectionRef.current) {
            await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
          }
        })

        // Listen for ICE candidates
        socket.on("ice-candidate", (candidate) => {
          if (peerConnectionRef.current) {
            peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
              .catch(err => console.error("Error adding ICE candidate:", err))
          }
        })

        // Listen for screen sharing events
        socket.on("screen-shared", ({ userId }) => {
          console.log(`User ${userId} started screen sharing`)
          // Update UI to indicate remote user is screen sharing
        })

        socket.on("screen-share-stopped", ({ userId }) => {
          console.log(`User ${userId} stopped screen sharing`)
          // Update UI to indicate remote user stopped screen sharing
        })

        // Listen for call ended
        socket.on("call-ended", ({ roomId: endedRoomId }) => {
          if (roomId === endedRoomId) {
            console.log(`Call in room ${endedRoomId} has ended`)
            handleEndCall()
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
        // Emit end-call event before disconnecting
        socketRef.current.emit("end-call", { roomId })
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

      // Notify other participants about screen sharing
      if (socketRef.current) {
        socketRef.current.emit("share-screen", { userId: callerId, roomId })
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

      // Notify other participants about stopping screen sharing
      if (socketRef.current) {
        socketRef.current.emit("stop-screen-share", { userId: callerId, roomId })
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

        // Send call invitation through socket
        if (socketRef.current) {
          socketRef.current.emit("call-users", {
            from: callerId,
            toUsers: [user._id],
            roomId
          })

          // Send notification to the user about the call invitation
          socketRef.current.emit("send-notification", {
            email: user.email,
            message: `${currentUser?.username || "Someone"} is inviting you to a video call`,
          })

          // Log call invitation
          try {
            await fetch(`${apiUrl}/api/calls`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: callerId,
                to: user._id,
                type: "video",
                status: "invited",
              }),
            })
          } catch (error) {
            console.error("Error sending call invitation:", error)
          }
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
      await fetch(`${apiUrl}/api/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: callerId,
          to: receiverId,
          type: "video",
          status: "ended",
          duration: callDuration,
        }),
      })
    } catch (error) {
      console.error("Error logging call end:", error)
    }

    // Notify server about call ending
    if (socketRef.current) {
      socketRef.current.emit("end-call", { roomId })
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
        <div className="text-sm">{receiverUser?.username && `Call with: ${receiverUser.username}`}</div>
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
                onClick={toggleFullScreen}
                className="p-3 rounded-full bg-gray-700 hover:bg-gray-600"
                title="Toggle fullscreen"
              >
                <Maximize size={24} />
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