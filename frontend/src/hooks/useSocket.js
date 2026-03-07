import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

// Remove /api from socket URL - Socket.IO connects to root, not /api
const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL).replace('/api', '');

export const useSocket = () => {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return;
    }

    // Initialize socket connection
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: false,
      multiplex: true
    });

    // Make socket globally accessible
    if (typeof window !== 'undefined') {
      window.io = socketRef.current;
    }

    socketRef.current.on('connect', () => {
      console.log('✅ Socket connected');
      setIsConnected(true);
    });

    socketRef.current.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setIsConnected(false);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (typeof window !== 'undefined') {
        window.io = null;
      }
    };
  }, []);

  const joinQueryChat = (queryId) => {
    if (socketRef.current) {
      console.log('🔌 Joining query chat:', queryId);
      console.log('Socket connected:', socketRef.current.connected);
      socketRef.current.emit('join-query-chat', queryId);
      console.log('✅ Join event emitted');
    } else {
      console.error('❌ Socket not available for joining');
    }
  };

  const leaveQueryChat = (queryId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-query-chat', queryId);
    }
  };

  const sendMessage = (queryId, message, senderType) => {
    if (socketRef.current) {
      socketRef.current.emit('send-message', {
        queryId,
        message,
        senderType
      });
    }
  };

  const onNewMessage = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('new-message', callback);
    }
  };

  const onNewQuery = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('new-query', callback);
    }
  };

  const onQueryAccepted = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('query-accepted', callback);
    }
  };

  const onQueryRejected = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('query-rejected', callback);
    }
  };

  const onBookingCreated = (callback) => {
    if (socketRef.current) {
      console.log('📝 Registering booking-created listener');
      socketRef.current.on('booking-created', (data) => {
        console.log('🔔 booking-created event received:', data);
        callback(data);
      });
    }
  };

  const onBookingConfirmed = (callback) => {
    if (socketRef.current) {
      console.log('📝 Registering booking-confirmed listener');
      socketRef.current.on('booking-confirmed', (data) => {
        console.log('🔔 booking-confirmed event received:', data);
        callback(data);
      });
    }
  };

  const onUserTyping = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('user-typing', callback);
    }
  };

  const emitTyping = (queryId, isTyping) => {
    if (socketRef.current) {
      socketRef.current.emit('typing', { queryId, isTyping });
    }
  };

  const offNewMessage = () => {
    if (socketRef.current) {
      socketRef.current.off('new-message');
    }
  };

  const offNewQuery = () => {
    if (socketRef.current) {
      socketRef.current.off('new-query');
    }
  };

  const offQueryAccepted = () => {
    if (socketRef.current) {
      socketRef.current.off('query-accepted');
    }
  };

  const offQueryRejected = () => {
    if (socketRef.current) {
      socketRef.current.off('query-rejected');
    }
  };

  const offBookingCreated = () => {
    if (socketRef.current) {
      socketRef.current.off('booking-created');
    }
  };

  const offBookingConfirmed = () => {
    if (socketRef.current) {
      socketRef.current.off('booking-confirmed');
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinQueryChat,
    leaveQueryChat,
    sendMessage,
    onNewMessage,
    onNewQuery,
    onQueryAccepted,
    onQueryRejected,
    onBookingCreated,
    onBookingConfirmed,
    onUserTyping,
    emitTyping,
    offNewMessage,
    offNewQuery,
    offQueryAccepted,
    offQueryRejected,
    offBookingCreated,
    offBookingConfirmed
  };
};

