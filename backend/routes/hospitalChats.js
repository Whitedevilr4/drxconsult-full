const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const HospitalChat = require('../models/HospitalChat');
const HospitalQuery = require('../models/HospitalQuery');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const { createNotification } = require('../utils/notificationHelper');

// Get chat messages for a query
router.get('/:queryId', auth, async (req, res) => {
  try {
    const { queryId } = req.params;

    const query = await HospitalQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    // Verify user has access to this chat
    const hospital = await Hospital.findOne({ userId: req.user.userId });
    const isUser = query.userId.toString() === req.user.userId;
    const isHospital = hospital && query.acceptedByHospitalId && query.acceptedByHospitalId.toString() === hospital._id.toString();

    if (!isUser && !isHospital) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const messages = await HospitalChat.find({ queryId })
      .populate('senderId', 'name email')
      .sort({ createdAt: 1 });

    // Mark messages as read
    await HospitalChat.updateMany(
      {
        queryId,
        senderId: { $ne: req.user.userId },
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.json(messages);
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send chat message
router.post('/:queryId', auth, async (req, res) => {
  try {
    const { queryId } = req.params;
    const { message } = req.body;

    const query = await HospitalQuery.findById(queryId);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    if (query.status !== 'accepted') {
      return res.status(400).json({ message: 'Chat only available for accepted queries' });
    }

    // Determine sender type
    const hospital = await Hospital.findOne({ userId: req.user.userId });
    const isUser = query.userId.toString() === req.user.userId;
    const isHospital = hospital && query.acceptedByHospitalId && query.acceptedByHospitalId.toString() === hospital._id.toString();

    if (!isUser && !isHospital) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const senderType = isHospital ? 'hospital' : 'user';

    const chatMessage = await HospitalChat.create({
      queryId,
      senderId: req.user.userId,
      senderType,
      message
    });

    // Populate sender info
    await chatMessage.populate('senderId', 'name email');

    // Send in-app notification to recipient
    let recipientId, senderName;
    
    if (isHospital) {
      // Hospital is sending, notify patient
      recipientId = query.userId;
      senderName = hospital.hospitalName;
    } else {
      // Patient is sending, notify hospital
      const acceptedHospital = await Hospital.findById(query.acceptedByHospitalId);
      if (acceptedHospital) {
        recipientId = acceptedHospital.userId;
        senderName = query.userId.name || 'Patient';
      }
    }

    if (recipientId) {
      await createNotification({
        userId: recipientId,
        type: 'hospital_chat_message',
        title: 'New Message',
        message: `${senderName}: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`
      });
    }

    // Send real-time Socket.IO message to OTHER users (not sender)
    const io = req.app.get('io');
    if (io) {
      const messageData = {
        _id: chatMessage._id.toString(),
        queryId: queryId.toString(),
        senderId: chatMessage.senderId._id || chatMessage.senderId,
        senderType: chatMessage.senderType,
        message: chatMessage.message,
        createdAt: chatMessage.createdAt
      };
      
      console.log('📤 Broadcasting new-message to room (excluding sender):', `query:${queryId}`);
      console.log('Message data:', messageData);
      
      // Get all sockets in the room
      const room = io.sockets.adapter.rooms.get(`query:${queryId}`);
      if (room) {
        console.log('Room has', room.size, 'members');
        
        // Emit to all sockets in room EXCEPT the sender
        room.forEach(socketId => {
          const socket = io.sockets.sockets.get(socketId);
          // Only emit if this socket doesn't belong to the sender
          if (socket && socket.userId !== req.user.userId) {
            socket.emit('new-message', messageData);
            console.log('✅ Message sent to socket:', socketId);
          } else if (socket && socket.userId === req.user.userId) {
            console.log('⏭️ Skipping sender socket:', socketId);
          }
        });
      } else {
        console.log('⚠️ No members in room');
      }
    } else {
      console.error('❌ Socket.IO not available');
    }

    res.status(201).json(chatMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get unread message count
router.get('/:queryId/unread-count', auth, async (req, res) => {
  try {
    const { queryId } = req.params;

    const count = await HospitalChat.countDocuments({
      queryId,
      senderId: { $ne: req.user.userId },
      isRead: false
    });

    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
