"use client"

import { useState, useEffect } from "react"
import { useRef } from "react"
import { useNavigate } from "react-router-dom"
import io from "socket.io-client"
import axios from "axios"
import Calendar from "react-calendar"
import VideoCall from "../components/videoCall"
import "react-calendar/dist/Calendar.css"
import { ReactMediaRecorder } from "react-media-recorder"
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  BellIcon,
  CalendarDaysIcon,
  PhotoIcon,
  MicrophoneIcon,
  FaceSmileIcon,
  PlusIcon,
  PaperAirplaneIcon,
  VideoCameraIcon,
  PhoneIcon,
  UserPlusIcon,
  EllipsisVerticalIcon,
  InboxArrowDownIcon,
  SunIcon,
  MoonIcon,
  ArrowUpOnSquareIcon,
  CogIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/solid"
import Picker from "emoji-picker-react" // Using emoji-picker-react

const chatURL = "https://chat-app-backend-2ph1.onrender.com/api"
// Socket connection
const socket = io("https://chat-app-backend-2ph1.onrender.com/api", {
  withCredentials: true,
})

const generateAvatar = (username) => {
  if (!username) return { initial: "?", backgroundColor: "#cccccc" } // Fallback for invalid username
  const avatarKey = `userAvatarImage_${username}`
  const existingAvatar = localStorage.getItem(avatarKey)

  if (existingAvatar) {
    return JSON.parse(existingAvatar)
  }

  const colors = [
    "#FFD700",
    "#FFA07A",
    "#87CEEB",
    "#98FB98",
    "#DDA0DD",
    "#FFB6C1",
    "#FFC0CB",
    "#20B2AA",
    "#FF6347",
    "#708090",
    "#9370DB",
    "#90EE90",
    "#B0E0E6",
  ]
  const backgroundColor = colors[Math.floor(Math.random() * colors.length)]
  const initial = username.charAt(0).toUpperCase()

  const avatarImage = { initial, backgroundColor }
  localStorage.setItem(avatarKey, JSON.stringify(avatarImage))
  return avatarImage
}

const ChatApp = (receiver) => {
  const navigate = useNavigate()
  const [user, setUser] = useState([])
  const [channels, setChannels] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [search, setSearch] = useState("")
  const [darkMode, setDarkMode] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false) // State to show emoji picker
  const [emoji, setEmoji] = useState("") // State to store the selected emoji
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const messagesContainerRef = useRef(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [hoveredMessage, setHoveredMessage] = useState(null)
  const [dropdownMessage, setDropdownMessage] = useState(null)
  const [editMessageId, setEditMessageId] = useState(null)
  const [editText, setEditText] = useState("")
  const [voiceMessages, setVoiceMessages] = useState([])
  const [userId, setUserId] = useState(null)
  const [recording, setRecording] = useState(false)
  const [recordTime, setRecordTime] = useState("0:00")
  const timerRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const intervalRef = useRef(null)
  const [mediaBlobUrl, setMediaBlobUrl] = useState(null)
  const [isInCall, setIsInCall] = useState(false)

  const userEmail = localStorage.getItem("userEmail")

  const handleEmojiPickerHideShow = () => {
    setShowEmojiPicker(!showEmojiPicker)
  }

  // Updated startCall function to pass the correct IDs
  const startCall = () => {
    if (!selectedChannel || !userId) {
      alert("Please select a user to call")
      return
    }

    // Notify the other user about the incoming call via socket
    socket.emit("initiate-call", {
      from: userId,
      to: selectedChannel._id,
      username: user.username || "User",
    })

    setIsInCall(true)
  }

  const endCall = () => {
    // Notify the other user that the call has ended
    if (selectedChannel && userId) {
      socket.emit("end-call", {
        from: userId,
        to: selectedChannel._id,
      })
    }

    setIsInCall(false)
  }

  // Handle incoming calls
  useEffect(() => {
    socket.on("incoming-call", (data) => {
      const { from, username } = data

      // Show confirmation dialog
      const confirmCall = window.confirm(`Incoming video call from ${username}. Accept?`)

      if (confirmCall) {
        // Find the channel/user that matches the caller ID
        const callerChannel = channels.find((channel) => channel._id === from)
        if (callerChannel) {
          setSelectedChannel(callerChannel)
          setIsInCall(true)

          // Notify the caller that the call was accepted
          socket.emit("call-accepted", {
            from: userId,
            to: from,
          })
        }
      } else {
        // Notify the caller that the call was rejected
        socket.emit("call-rejected", {
          from: userId,
          to: from,
        })
      }
    })

    socket.on("call-ended", () => {
      setIsInCall(false)
    })

    return () => {
      socket.off("incoming-call")
      socket.off("call-ended")
    }
  }, [channels, userId])

  useEffect(() => {
    const fetchUserId = async () => {
      const id = localStorage.getItem("userId")
      setUserId(id)
    }
    fetchUserId()
  }, [])

  useEffect(() => {
    if (userEmail) {
      socket.emit("add-user", userEmail)
    }

    // Listen for notifications
    socket.on("new-notification", (notification) => {
      alert(notification.message) // You can handle notifications however you like
    })

    return () => {
      socket.off("new-notification")
    }
  }, [userEmail])

  // Fetch notifications from the backend
  useEffect(() => {
    if (userEmail) {
      fetch(`${chatURL}/notification/notifications/${userEmail}`)
        .then((res) => res.json())
        .then((data) => setNotifications(data.notifications))
        .catch((err) => console.error("Error fetching notifications:", err))
    }
  }, [userEmail])

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen)

    if (!isNotificationsOpen) {
      markNotificationsAsRead()
    }
  }

  const markNotificationsAsRead = async () => {
    try {
      await axios.put(`${chatURL}/notification/notifications/read/${userEmail}`)

      // Update the local state to mark all notifications as read
      setNotifications((prevNotifications) => prevNotifications.map((notif) => ({ ...notif, read: true })))

      setUnreadNotifications(0) // Reset unread count
    } catch (err) {
      console.error("Error marking notifications as read:", err)
    }
  }

  // Fetch available channels dynamically
  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const userId = localStorage.getItem("userId") // If you're going to use this userId
        const response = await fetch(
          `${chatURL}/auths/getAllUsers/${userId}`, // Fixed template literal
        )

        if (!response.ok) {
          console.error("Error fetching channels:", response.statusText)
          return
        }

        const data = await response.json() // Parse JSON response
        setChannels(data) // Update channel list
      } catch (error) {
        console.error("Error fetching channels:", error.message)
      }
    }

    fetchChannels()
  }, [])

  // Fetch messages dynamically when a channel is selected
  useEffect(() => {
    if (!userId || !selectedChannel) return

    const fetchMessages = async () => {
      try {
        const response = await axios.post(`${chatURL}/messages/getmsg`, {
          from: userId,
          to: selectedChannel._id,
        })
        setMessages(response.data)
      } catch (error) {
        console.error("Error fetching messages:", error.response?.data || error.message)
      }
    }

    const fetchVoiceMessages = async () => {
      try {
        const response = await axios.get(`${chatURL}/messages/${userId}/${selectedChannel._id}`)
        setVoiceMessages(response.data)
      } catch (error) {
        console.error("Error fetching voice messages:", error.response?.data || error.message)
      }
    }

    fetchMessages()
    fetchVoiceMessages()

    const intervalId = setInterval(() => {
      fetchMessages()
      fetchVoiceMessages()
    }, 1000)

    return () => clearInterval(intervalId)
  }, [userId, selectedChannel])

  // Listen for real-time updates (Text & Voice Messages)
  useEffect(() => {
    socket.emit("join-chat", { userId })

    socket.on("msg-receive", ({ msg }) => {
      setMessages((prev) => [...prev, { fromSelf: false, message: msg }])
    })

    socket.on("receive-voice-msg", ({ audioUrl, from }) => {
      const isFromSelf = from === userId
      console.log(`Voice message from ${from}, Current User ID: ${userId}, fromSelf: ${isFromSelf}`)
      setVoiceMessages((prev) => [...prev, { fromSelf: isFromSelf, audioUrl }])
    })

    return () => {
      socket.off("msg-receive")
      socket.off("receive-voice-msg")
    }
  }, [userId])

  const startRecording = () => {
    setRecording(true)
    setRecordTime("0:00")

    let seconds = 0
    timerRef.current = setInterval(() => {
      seconds++
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      setRecordTime(`${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`)
    }, 1000)
  }

  const stopRecording = async (mediaBlobUrl) => {
    if (!mediaBlobUrl) {
      console.error("No audio recorded!")
      return
    }

    try {
      const response = await fetch(mediaBlobUrl)
      const blob = await response.blob()

      // Upload and send the audio file
      await uploadAudio(blob)

      // Reset the mediaBlobUrl to clear the input bar
      setMediaBlobUrl(null)
    } catch (error) {
      console.error("Error processing recorded audio:", error)
    }
  }

  const uploadAudio = async (blob) => {
    if (!blob || !(blob instanceof Blob)) {
      console.error("Invalid audio blob!")
      return
    }

    try {
      const formData = new FormData()
      formData.append("file", blob, "voice_note.mp3")
      formData.append("from", userId)
      formData.append("to", selectedChannel._id)

      const uploadResponse = await axios.post(`${chatURL}/messages/addvoice`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })

      // Emit the voice message with the sender's ID
      socket.emit("send-voice-msg", {
        to: selectedChannel._id,
        audioUrl: uploadResponse.data.audioUrl,
        from: userId,
      })

      // Mark as sent by the current user
      setVoiceMessages((prev) => [...prev, { fromSelf: true, audioUrl: uploadResponse.data.audioUrl }])
    } catch (error) {
      console.error("Error uploading audio:", error.response?.data || error.message)
    }
  }

  // Filter channels based on search input
  const filteredChannels = channels.filter((channel) => channel.username.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => {
    const messagesContainer = messagesContainerRef.current
    if (!messagesContainer) return

    const handleScroll = () => {
      // Check if user has scrolled near the bottom
      const isUserAtBottom =
        messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50 // 50px threshold

      setIsAtBottom(isUserAtBottom)
    }

    messagesContainer.addEventListener("scroll", handleScroll)

    return () => messagesContainer.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    if (isAtBottom && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }, [messages]) // Runs when messages update

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(!darkMode)
  }

  // Send a new message
  const sendMessage = async () => {
    // Ensure that we have either text or an emoji to send
    if (!newMessage.trim() && !emoji) return

    // Combine the emoji (if any) with the new message text
    const finalMessage = newMessage.trim() + emoji

    // Emit the message immediately via socket.io for real-time update
    socket.emit("send-msg", {
      to: selectedChannel._id,
      msg: finalMessage,
      from: localStorage.getItem("userId"),
    })

    // Update the local messages state for the current user
    setMessages((prev) => [...prev, { fromSelf: true, message: finalMessage }])

    // Clear the message input fields
    setNewMessage("")
    setEmoji("") // Reset the emoji state after sending the message

    // Now store the message asynchronously in the database
    try {
      const messageData = {
        from: localStorage.getItem("userId"),
        to: selectedChannel._id,
        message: finalMessage,
      }

      await fetch(`${chatURL}/messages/addmsg`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(messageData),
      })

      console.log("Message stored in DB")
    } catch (error) {
      console.error("Error storing message:", error)
    }
  }

  // Handle emoji selection
  const handleEmojiclick = (emojiObject) => {
    console.log("Selected emoji object:", emojiObject)
    if (emojiObject && emojiObject.emoji) {
      setNewMessage((prevMessage) => prevMessage + emojiObject.emoji)
      setShowEmojiPicker(false) // Hide the emoji picker after selecting an emoji
    } else {
      console.error("Invalid emoji object:", emojiObject)
    }
  }

  const toggleCalendar = () => setIsCalendarOpen(!isCalendarOpen)

  const handleDateChange = (date) => {
    setSelectedDate(date)
    setIsCalendarOpen(false) // Close the calendar modal after selecting a date
    console.log("Selected Date:", date) // For debugging
  } // Call this when the user comes online or changes channel

  const handleEditMessage = async (messageId) => {
    try {
      if (!editText.trim()) {
        console.error("Edit text cannot be empty")
        return
      }

      const response = await axios.put(`${chatURL}/messages/${messageId}`, {
        text: editText.trim(),
      })

      if (response.data) {
        // Update the messages state with the edited message
        setMessages((prevMessages) =>
          prevMessages.map((msg) => (msg._id === messageId ? { ...msg, message: editText.trim() } : msg)),
        )

        // Reset edit states
        setEditMessageId(null)
        setEditText("")
        setDropdownMessage(null)
      }
    } catch (error) {
      console.error("Error updating message:", error)
      alert("Failed to update message. Please try again.")
    }
  }

  // Delete a message
  const handleDeleteMessage = async (messageId) => {
    try {
      await axios.delete(`${chatURL}/messages/${messageId}`)
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId))
      setDropdownMessage(null)
    } catch (error) {
      console.error("Error deleting message:", error)
    }
  }

  const combinedMessages = [...messages, ...voiceMessages].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

  const handleDeleteVoiceMessage = async (voiceMessageId) => {
    try {
      await axios.delete(`${chatURL}/messages/deletevoice/${voiceMessageId}`)

      // Remove from UI
      setVoiceMessages((prev) => prev.filter((msg) => msg._id !== voiceMessageId))
    } catch (error) {
      console.error("Error deleting voice message:", error.response?.data || error.message)
    }
  }

  return (
    <div className={`flex h-screen ${darkMode ? "dark" : ""}`}>
      {/* Sidebar */}
      <aside className="w-20 bg-gradient-to-br from-blue-300 to-gray-500 dark:from-gray-800 dark:to-gray-900 flex flex-col py-6 space-y-6 items-center">
        {/* Logged-in User Avatar */}
        <div
          className="h-16 w-16 rounded-full border-2 border-white shadow-lg mb-8 flex items-center justify-center text-white font-bold text-xl"
          style={{
            backgroundColor: generateAvatar(user.username).backgroundColor,
          }}
        >
          {generateAvatar(user.username).initial}
        </div>
        <div className="space-y-6">
          <ChatBubbleLeftRightIcon className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer" />
          <UserGroupIcon className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer" />
          <BellIcon className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer" onClick={toggleNotifications} />
          <CalendarDaysIcon
            className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer"
            onClick={toggleCalendar}
          />
          <InboxArrowDownIcon className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer" />
          <ArrowUpOnSquareIcon className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer" />
        </div>
        <div className="flex-1"></div>
        <button className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer" onClick={toggleDarkMode}>
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>
        <button className="h-8 w-8 text-white hover:text-gray-300 cursor-pointer" onClick={() => navigate("/settings")}>
          <CogIcon />
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1">
        {/* Channel List */}
        <section className="w-1/4 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-800 dark:to-gray-700 p-4 flex flex-col h-full">
          <div className="border-b border-gray-400 dark:border-gray-600 pb-4">
            <h2 className="text-lg font-bold text-gray-700 dark:text-gray-200">Chats</h2>
            <input
              type="text"
              placeholder="Search channels..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mt-2 w-full px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded focus:outline-none"
            />
          </div>
          {/* Chat List */}
          <div className="flex-1 overflow-y-auto mt-4 space-y-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 overflow-hidden">
            <ul className="space-y-2">
              {filteredChannels.map((channel) => (
                <li
                  key={channel._id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`cursor-pointer p-3 rounded-lg flex items-center shadow-md transition-transform duration-200 transform border w-full ${
                    selectedChannel?._id === channel._id
                      ? "bg-blue-500 text-white scale-105 shadow-lg"
                      : "bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-500 hover:scale-105"
                  }`}
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }} // Prevents horizontal scrolling
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm"
                    style={{
                      backgroundColor: generateAvatar(channel.username).backgroundColor,
                    }}
                  >
                    {generateAvatar(channel.username).initial}
                  </div>
                  <span className="ml-3 font-medium truncate w-full">{channel.username}</span>{" "}
                  {/* Ensures text doesn't overflow */}
                </li>
              ))}
            </ul>
          </div>

          {/* Invite Button */}
          <button className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 w-full shadow-md mt-2 sticky bottom-0">
            Invite
          </button>
        </section>

        {isNotificationsOpen && (
          <div className="absolute inset-y-0 right-0 w-[calc(100%-80px)] bg-white dark:bg-gray-900 flex flex-col p-6 z-50">
            <div className="flex justify-between items-center border-b pb-4 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Notifications</h3>
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                onClick={toggleNotifications}
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {notifications.length === 0 ? (
                <p className="text-gray-600 dark:text-gray-400">No notifications yet!</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif._id}
                    className={`py-2 px-4 rounded-md ${notif.read ? "bg-gray-100" : "bg-yellow-100"}`}
                  >
                    <p className="text-gray-800 dark:text-gray-200">{notif.message}</p>
                    <small className="text-gray-500">{new Date(notif.timestamp).toLocaleString()}</small>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat Section */}
        <div className="flex-1 flex flex-col bg-gradient-to-br from-white to-gray-200 dark:from-gray-900 dark:to-gray-800">
          <header className="px-6 py-4 flex items-center justify-between border-b border-gray-400 dark:border-gray-600">
            {selectedChannel ? (
              <div className="flex items-center space-x-4">
                <div
                  className="h-12 w-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{
                    backgroundColor: generateAvatar(selectedChannel.username).backgroundColor,
                  }}
                >
                  {generateAvatar(selectedChannel.username).initial}
                </div>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{selectedChannel.username}</h1>
              </div>
            ) : (
              <h1 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Select a Channel</h1>
            )}
            {selectedChannel && (
              <div className="flex items-center space-x-3">
                <button className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">
                  <PhoneIcon className="h-6 w-6 text-blue-500 cursor-pointer" />
                </button>
                <button
                  onClick={startCall}
                  className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100"
                >
                  <VideoCameraIcon className="h-6 w-6 text-blue-500 cursor-pointer" />
                </button>

                <button className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">
                  <UserPlusIcon className="h-6 w-6 text-blue-500 cursor-pointer" />
                </button>
                <button className="text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100">
                  <EllipsisVerticalIcon className="h-6 w-6 text-blue-500 cursor-pointer" />
                </button>
              </div>
            )}
          </header>

          {/* Video Call Component (Shown When Call is Active) */}
          {isInCall && (
            <div className="fixed inset-0 z-50 bg-black">
              <VideoCall callerId={userId} receiverId={selectedChannel?._id} onEndCall={endCall} />
            </div>
          )}

          {isCalendarOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-1/3 p-6">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Select a Date</h3>
                <Calendar onChange={handleDateChange} value={selectedDate} className="react-calendar" />
                <button
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  onClick={toggleCalendar}
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 p-6 overflow-y-auto">
            {selectedChannel ? (
              <div className="space-y-4">
                {combinedMessages.map((msg, index) => {
                  const isHovered = hoveredMessage === msg._id
                  const isEditing = editMessageId === msg._id
                  const isVoiceMessage = !!msg.audioUrl

                  return (
                    <div
                      key={msg._id || index}
                      className={`flex ${msg.fromSelf ? "justify-end" : "justify-start"} mb-4 relative`}
                      onMouseEnter={() => setHoveredMessage(msg._id)}
                      onMouseLeave={() => setHoveredMessage(null)}
                    >
                      <div
                        className={`p-3 rounded-lg shadow-md ${
                          msg.fromSelf ? "bg-blue-400 text-white" : "bg-white dark:bg-gray-700"
                        } ${isVoiceMessage ? "max-w-[350px] min-w-[250px] w-[30vw]" : "max-w-xs"}`} // Voice message container size adjusted
                      >
                        {isVoiceMessage ? (
                          <div className="flex items-center space-x-2 p-2 rounded-lg">
                            {/* Voice Message Audio */}
                            <audio controls src={msg.audioUrl} className="w-[250px] md:w-[320px] h-10 rounded-md" />

                            {/* Delete Icon for Voice Messages */}
                            {msg.fromSelf && (
                              <button
                                onClick={() => handleDeleteVoiceMessage(msg._id)}
                                className="p-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500"
                              >
                                <TrashIcon className="h-6 w-6 text-red-500" />
                              </button>
                            )}
                          </div>
                        ) : isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault()
                              handleEditMessage(msg._id)
                            }}
                            className="w-full"
                          >
                            <input
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full p-2 text-black rounded"
                              autoFocus
                            />
                            <div className="flex justify-end mt-2 space-x-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditMessageId(null)
                                  setEditText("")
                                }}
                                className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={!editText.trim()}
                                className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
                              >
                                Save
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p>{msg.message}</p>
                        )}

                        {/* Hover Edit & Delete for Normal Messages */}
                        {isHovered && msg.fromSelf && !isEditing && !isVoiceMessage && (
                          <div className="absolute bottom-1 right-1">
                            <button
                              className="ml-2 p-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDropdownMessage(dropdownMessage === msg._id ? null : msg._id)
                              }}
                            >
                              <ChevronUpIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            </button>

                            {dropdownMessage === msg._id && (
                              <div className="absolute -top-12 right-0 bg-gray-200 dark:bg-gray-600 p-2 rounded-md shadow-md z-50">
                                <button
                                  className="flex items-center space-x-1 p-1 hover:bg-gray-300 dark:hover:bg-gray-500 rounded w-full"
                                  onClick={() => {
                                    setEditMessageId(msg._id)
                                    setEditText(msg.message)
                                    setDropdownMessage(null)
                                  }}
                                >
                                  <PencilIcon className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                                  <span className="text-sm">Edit</span>
                                </button>
                                <button
                                  className="flex items-center space-x-1 p-1 hover:bg-gray-300 dark:hover:bg-gray-500 rounded w-full"
                                  onClick={() => handleDeleteMessage(msg._id)}
                                >
                                  <TrashIcon className="h-4 w-4 text-red-500" />
                                  <span className="text-sm">Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No messages available.</p>
            )}
          </div>

          {/* Input Section */}
          {selectedChannel && (
            <footer className="relative p-4 bg-gray-100 dark:bg-gray-700 border-t border-gray-400 dark:border-gray-600">
              <div className="flex items-center space-x-3">
                <PhotoIcon className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer" />
                <ReactMediaRecorder
                  audio
                  onStop={stopRecording} // Automatically call stopRecording when recording stops
                  render={({ startRecording, stopRecording }) => (
                    <>
                      <button
                        onClick={() => {
                          if (isRecording) {
                            stopRecording() // Stop recording
                            clearInterval(intervalRef.current)
                            setRecordTime("0:00")
                          } else {
                            startRecording() // Start recording
                            let sec = 0
                            intervalRef.current = setInterval(() => {
                              sec++
                              setRecordTime(`${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`)
                            }, 1000)
                          }
                          setIsRecording(!isRecording)
                        }}
                        className={` h-6 w-6 ${isRecording ? "bg-red-500 rounded-full" : " text-gray-400"}`}
                      >
                        <MicrophoneIcon className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer" />
                      </button>

                      {recordTime !== "0:00" && <span className="ml-2">{recordTime}</span>}
                    </>
                  )}
                />

                <FaceSmileIcon
                  className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer"
                  onClick={handleEmojiPickerHideShow}
                />
                <PlusIcon className="h-6 w-6 text-gray-400 hover:text-gray-600 cursor-pointer" />
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-200 dark:bg-gray-600 px-4 py-2 rounded-full focus:outline-none"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 px-4 py-2 text-white rounded-full hover:bg-blue-500"
                >
                  <PaperAirplaneIcon className="h-5 w-5" />
                </button>
              </div>
              {showEmojiPicker && (
                <div className="absolute bottom-14 left-10 z-10">
                  <Picker onEmojiClick={handleEmojiclick} />
                </div>
              )}
            </footer>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatApp

