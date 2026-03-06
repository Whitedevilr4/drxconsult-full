import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api', '');

export default function LiveChat({ onClose }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [status, setStatus] = useState('waiting'); // waiting, active, closed
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Load session from localStorage
    const savedSessionId = localStorage.getItem('cs_session_id');
    if (savedSessionId) {
      loadSession(savedSessionId);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      });
    }
  };

  const loadSession = async (sid) => {
    try {
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/session/${sid}`);
      setSessionId(res.data.sessionId);
      setMessages(res.data.messages);
      setStatus(res.data.status);
      setIsStarted(true);
      connectSocket(res.data.sessionId);
    } catch (error) {
      console.error('Error loading session:', error);
      localStorage.removeItem('cs_session_id');
    }
  };

  const connectSocket = (sid) => {
    if (socketRef.current) return;

    socketRef.current = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('✅ CS Socket connected');
      socketRef.current.emit('join-cs-session', sid);
    });

    socketRef.current.on('new-cs-message', (message) => {
      console.log('📨 New CS message:', message);
      setMessages(prev => [...prev, message]);
      
      // Mark as read if from admin
      if (message.sender === 'admin') {
        markAsRead(sid);
      }
    });

    socketRef.current.on('admin-joined', (data) => {
      console.log('👨‍💼 Admin joined');
      setStatus('active');
      // Add system message
      setMessages(prev => [...prev, {
        sender: 'system',
        message: `${data.adminName} has joined the chat`,
        timestamp: new Date()
      }]);
    });

    socketRef.current.on('chat-closed', () => {
      console.log('🔒 Chat closed');
      setStatus('closed');
      setMessages(prev => [...prev, {
        sender: 'system',
        message: 'This chat has been closed by support',
        timestamp: new Date()
      }]);
    });
  };

  const startChat = async () => {
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/session`, {
        userName,
        userEmail
      });

      setSessionId(res.data.sessionId);
      setMessages(res.data.messages);
      setStatus(res.data.status);
      setIsStarted(true);
      localStorage.setItem('cs_session_id', res.data.sessionId);
      connectSocket(res.data.sessionId);
    } catch (error) {
      console.error('Error starting chat:', error);
      alert('Failed to start chat. Please try again.');
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage;
    setNewMessage('');

    // Optimistic UI
    const tempMessage = {
      sender: 'user',
      message: messageText,
      timestamp: new Date(),
      sending: true
    };
    setMessages(prev => [...prev, tempMessage]);

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/session/${sessionId}/message`,
        { message: messageText, sender: 'user' }
      );
      
      // Remove temp message and let Socket.IO add the real one
      setMessages(prev => prev.filter(m => !m.sending));
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.filter(m => !m.sending));
      setNewMessage(messageText);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (sid) => {
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/customer-service-chat/session/${sid}/read`,
        { sender: 'user' }
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition-all z-50 flex items-center space-x-2"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="font-medium">Live Chat</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col z-50 border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Live Support</h3>
              <p className="text-xs text-blue-100">
                {status === 'waiting' && 'Waiting for agent...'}
                {status === 'active' && 'Connected'}
                {status === 'closed' && 'Chat Closed'}
              </p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {!isStarted ? (
            <div className="flex-1 p-6 flex flex-col justify-center">
              <h4 className="text-lg font-semibold mb-4 text-gray-900">Start a conversation</h4>
              <input
                type="text"
                placeholder="Your Name *"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="email"
                placeholder="Your Email (optional)"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={startChat}
                className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors font-medium"
              >
                Start Chat
              </button>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>Send a message to start the conversation</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.sender === 'system' ? (
                        <div className="text-center w-full">
                          <p className="text-xs text-gray-500 bg-gray-200 inline-block px-3 py-1 rounded-full">
                            {msg.message}
                          </p>
                        </div>
                      ) : (
                        <div
                          className={`max-w-[75%] px-4 py-2 rounded-lg ${
                            msg.sender === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200'
                          } ${msg.sending ? 'opacity-60' : ''}`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              {status !== 'closed' ? (
                <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={sending}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t border-gray-200 bg-red-50 rounded-b-lg text-center">
                  <p className="text-sm text-red-700">This chat has been closed</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
