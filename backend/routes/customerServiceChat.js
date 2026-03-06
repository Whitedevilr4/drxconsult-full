const express = require('express');
const router = express.Router();
const CustomerServiceChat = require('../models/CustomerServiceChat');
const { auth } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create or get chat session
router.post('/session', async (req, res) => {
  try {
    const { userName, userEmail, sessionId } = req.body;
    
    // If sessionId provided, try to find existing session
    if (sessionId) {
      const existingChat = await CustomerServiceChat.findOne({ sessionId });
      if (existingChat) {
        return res.json(existingChat);
      }
    }
    
    // Create new session
    const newSessionId = sessionId || uuidv4();
    const chat = await CustomerServiceChat.create({
      sessionId: newSessionId,
      userId: req.user?.userId || null,
      userName: userName || 'Guest',
      userEmail: userEmail || null,
      messages: [],
      status: 'waiting'
    });
    
    res.status(201).json(chat);
  } catch (error) {
    console.error('Error creating chat session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get chat session
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const chat = await CustomerServiceChat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    res.json(chat);
  } catch (error) {
    console.error('Error fetching chat session:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message
router.post('/session/:sessionId/message', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message, sender } = req.body;
    
    const chat = await CustomerServiceChat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat session not found' });
    }
    
    const newMessage = {
      sender: sender || 'user',
      message,
      timestamp: new Date(),
      isRead: false
    };
    
    chat.messages.push(newMessage);
    chat.lastMessageAt = new Date();
    
    // Update status if first message
    if (chat.messages.length === 1) {
      chat.status = 'waiting';
    }
    
    await chat.save();
    
    // Emit Socket.IO event
    const io = req.app.get('io');
    if (io) {
      // Notify admins of new message
      io.to('admins').emit('customer-service-message', {
        sessionId,
        message: newMessage,
        chatStatus: chat.status
      });
      
      // Notify user in their session room
      io.to(`cs-session:${sessionId}`).emit('new-cs-message', newMessage);
    }
    
    res.json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all active chats (admin only)
router.get('/admin/chats', auth, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const chats = await CustomerServiceChat.find({
      status: { $in: ['active', 'waiting'] }
    }).sort({ lastMessageAt: -1 });
    
    res.json(chats);
  } catch (error) {
    console.error('Error fetching chats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Assign chat to admin
router.post('/admin/chats/:sessionId/assign', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { sessionId } = req.params;
    
    const chat = await CustomerServiceChat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    chat.assignedTo = req.user.userId;
    chat.status = 'active';
    await chat.save();
    
    // Notify user that admin joined
    const io = req.app.get('io');
    if (io) {
      io.to(`cs-session:${sessionId}`).emit('admin-joined', {
        adminName: req.user.name || 'Support Agent'
      });
    }
    
    res.json(chat);
  } catch (error) {
    console.error('Error assigning chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Close chat
router.post('/admin/chats/:sessionId/close', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const { sessionId } = req.params;
    
    const chat = await CustomerServiceChat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    chat.status = 'closed';
    chat.closedAt = new Date();
    await chat.save();
    
    // Notify user that chat is closed
    const io = req.app.get('io');
    if (io) {
      io.to(`cs-session:${sessionId}`).emit('chat-closed');
    }
    
    res.json(chat);
  } catch (error) {
    console.error('Error closing chat:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark messages as read
router.post('/session/:sessionId/read', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { sender } = req.body; // 'user' or 'admin'
    
    const chat = await CustomerServiceChat.findOne({ sessionId });
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Mark messages from the other sender as read
    const otherSender = sender === 'user' ? 'admin' : 'user';
    chat.messages.forEach(msg => {
      if (msg.sender === otherSender && !msg.isRead) {
        msg.isRead = true;
      }
    });
    
    await chat.save();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
