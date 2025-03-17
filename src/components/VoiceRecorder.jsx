// import React, { useState, useEffect, useRef, useContext } from 'react';
// import { io } from 'socket.io-client';
// import axios from 'axios';
// import { DarkModeContext } from './DarkMode';
// import Recorder from 'react-mp3-recorder';

// const socket = io('https://mobilechatappbackend.onrender.com');
// const chatURL = 'https://mobilechatappbackend.onrender.com/api';

// const Messages = ({ channel }) => {
//   const [messages, setMessages] = useState([]);
//   const [voiceMessages, setVoiceMessages] = useState([]);
//   const [newMessage, setNewMessage] = useState('');
//   const [userId, setUserId] = useState(null);
//   const { darkMode } = useContext(DarkModeContext);
//   const [recording, setRecording] = useState(false);
//   const [recordTime, setRecordTime] = useState('0:00');
//   const timerRef = useRef(null);

//   useEffect(() => {
//     const fetchUserId = async () => {
//       const id = localStorage.getItem('userId');
//       setUserId(id);
//     };
//     fetchUserId();
//   }, []);

//   useEffect(() => {
//     if (!userId || !channel) return;

//     const fetchMessages = async () => {
//       try {
//         const response = await axios.post(`${chatURL}/messages/getmsg`, {
//           from: userId,
//           to: channel._id,
//         });
//         setMessages(response.data);
//       } catch (error) {
//         console.error('Error fetching messages:', error.response?.data || error.message);
//       }
//     };

//     const fetchVoiceMessages = async () => {
//       try {
//         const response = await axios.get(`${chatURL}/messages/${userId}/${channel._id}`);
//         setVoiceMessages(response.data);
//       } catch (error) {
//         console.error('Error fetching voice messages:', error.response?.data || error.message);
//       }
//     };

//     fetchMessages();
//     fetchVoiceMessages();
//     const intervalId = setInterval(() => {
//       fetchMessages();
//       fetchVoiceMessages();
//     }, 1000);
//     return () => clearInterval(intervalId);
//   }, [userId, channel]);

//   useEffect(() => {
//     socket.emit('join-chat', { userId });

//     socket.on('msg-receive', ({ msg }) => {
//       setMessages(prev => [...prev, { fromSelf: false, message: msg }]);
//     });

//     socket.on('receive-voice-msg', ({ audioUrl }) => {
//       setVoiceMessages(prev => [...prev, { fromSelf: false, audioUrl }]);
//     });

//     return () => {
//       socket.off('msg-receive');
//       socket.off('receive-voice-msg');
//     };
//   }, [userId]);

//   const sendMessage = async () => {
//     if (!newMessage.trim() || !userId) return;

//     socket.emit('send-msg', { to: channel._id, msg: newMessage, from: userId });
//     setMessages(prev => [...prev, { fromSelf: true, message: newMessage }]);
//     setNewMessage('');

//     try {
//       await axios.post(`${chatURL}/messages/addmsg`, {
//         from: userId,
//         to: channel._id,
//         message: newMessage,
//       });
//     } catch (error) {
//       console.error('Error sending message:', error.response?.data || error.message);
//     }
//   };

//   const uploadAudio = async (blob) => {
//     const formData = new FormData();
//     formData.append('file', blob, 'voice_note.mp3');
//     formData.append('from', userId);
//     formData.append('to', channel._id);

//     try {
//       const response = await axios.post(`${chatURL}/messages/addvoice`, formData, {
//         headers: { 'Content-Type': 'multipart/form-data' },
//       });
//       socket.emit('send-voice-msg', { to: channel._id, audioUrl: response.data.audioUrl });
//       setVoiceMessages(prev => [...prev, { fromSelf: true, audioUrl: response.data.audioUrl }]);
//     } catch (error) {
//       console.error('Error uploading audio:', error.response?.data || error.message);
//     }
//   };

//   const startRecording = () => {
//     setRecording(true);
//     setRecordTime('0:00');

//     let seconds = 0;
//     timerRef.current = setInterval(() => {
//       seconds++;
//       let minutes = Math.floor(seconds / 60);
//       let remainingSeconds = seconds % 60;
//       setRecordTime(`${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`);
//     }, 1000);
//   };

//   const stopRecording = async (blob) => {
//     clearInterval(timerRef.current);
//     setRecording(false);
//     setRecordTime('0:00');
//     if (blob) {
//       uploadAudio(blob);
//     }
//   };

//   return (
//     <div className={`chat-container ${darkMode ? 'dark' : ''}`}>
//       <div className="messages-list">
//         {messages.map((msg, index) => (
//           <div key={index} className={msg.fromSelf ? 'sent' : 'received'}>
//             {msg.message}
//           </div>
//         ))}
//         {voiceMessages.map((voice, index) => (
//           <div key={index} className={voice.fromSelf ? 'sent' : 'received'}>
//             <audio controls src={voice.audioUrl} />
//           </div>
//         ))}
//       </div>
//       <div className="input-container">
//         <input
//           type="text"
//           value={newMessage}
//           onChange={e => setNewMessage(e.target.value)}
//           placeholder="Type a message..."
//         />
//         <button onClick={sendMessage}>Send</button>
//         <div className="recording-container">
//           <Recorder
//             onRecordingComplete={stopRecording}
//             render={({ startRecording: recorderStart, stopRecording: recorderStop }) => (
//               <>
//                 <button
//                   onMouseDown={() => {
//                     startRecording();
//                     recorderStart();
//                   }}
//                   onMouseUp={recorderStop}
//                   className={`record-button ${recording ? 'recording' : ''}`}
//                 >
//                   🎙️
//                 </button>
//                 {recording && <span className="record-timer">{recordTime}</span>}
//               </>
//             )}
//           />
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Messages;
