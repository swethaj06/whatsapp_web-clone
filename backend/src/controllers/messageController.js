const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const Message = require('../models/Message');

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit for MongoDB document size
  }
});

const normalizeMessagePayload = async (req, body, file = null) => {
  const {
    sender,
    receiver,
    content,
    messageType = 'text',
    fileUrl = null,
    fileName = null,
    fileSize = null,
    fileDuration = null
  } = body;

  if (!sender || !receiver) {
    return { error: 'Missing required fields', status: 400 };
  }

  const isAttachmentUpload = Boolean(file);
  const resolvedMessageType = isAttachmentUpload
    ? (messageType && messageType !== 'text' ? messageType : 'document')
    : messageType;
  
  // WhatsApp-style: Check if recipient is online to set initial delivery status
  let isDelivered = false;
  if (req.io && receiver) {
    const receiverRoom = req.io.sockets.adapter.rooms.get(receiver.toString());
    if (receiverRoom && receiverRoom.size > 0) {
      isDelivered = true;
    }
  }

  const isTextMessage = resolvedMessageType === 'text';

  if (isTextMessage) {
    if (!content || content.trim() === '') {
      return { error: 'Message cannot be empty', status: 400 };
    }

    return {
      data: {
        sender,
        receiver,
        content: content.trim(),
        messageType: resolvedMessageType,
        isDelivered,
        fileUrl,
        fileName,
        fileSize,
        fileDuration
      }
    };
  }

  if (isAttachmentUpload) {
    const base64Data = file.buffer.toString('base64');
    const directFileUrl = `data:${file.mimetype};base64,${base64Data}`;

    return {
      data: {
        sender,
        receiver,
        content: content && content.trim() ? content.trim() : (file.originalname || resolvedMessageType),
        messageType: resolvedMessageType,
        isDelivered,
        fileUrl: directFileUrl,
        fileName: file.originalname || fileName,
        fileSize: file.size,
        fileDuration: fileDuration ? Number(fileDuration) : null,
        fileMimeType: file.mimetype || null
      }
    };
  }

  if (!fileUrl) {
    return { error: 'Attachment URL is required for media messages', status: 400 };
  }

  return {
    data: {
      sender,
      receiver,
      content: content && content.trim() ? content.trim() : (fileName || resolvedMessageType),
      messageType: resolvedMessageType,
      isDelivered,
      fileUrl,
      fileName,
      fileSize,
      fileDuration
    }
  };
};

const saveAndPopulateMessage = async (messageData) => {
  const message = await Message.create(messageData);

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'username email profilePicture')
    .populate('receiver', 'username email profilePicture');

  return populatedMessage || message;
};

exports.uploadAttachment = upload.single('attachment');

exports.sendMessage = async (req, res) => {
  try {
    const normalizedPayload = await normalizeMessagePayload(req, req.body, req.file);

    if (normalizedPayload.error) {
      return res.status(normalizedPayload.status).json({ error: normalizedPayload.error });
    }

    const message = await saveAndPopulateMessage(normalizedPayload.data);

    res.status(201).json(message);
  } catch (error) {

    console.error('sendMessage error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'Missing senderId or receiverId' });
    }

    const messages = await Message.find({
      $or: [
        { sender: senderId, receiver: receiverId },
        { sender: receiverId, receiver: senderId }
      ]
    })
      .populate('sender', 'username email profilePicture')
      .populate('receiver', 'username email profilePicture')
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getConversationSummaries = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    const objectUserId = new mongoose.Types.ObjectId(userId);

    const summaries = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: objectUserId }, { receiver: objectUserId }]
        }
      },
      {
        $sort: {
          timestamp: -1
        }
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', objectUserId] }, '$receiver', '$sender']
          },
          lastMessage: { $first: '$content' },
          lastMessageType: { $first: '$messageType' },
          lastMessageFileName: { $first: '$fileName' },
          lastMessageTime: { $first: '$timestamp' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', objectUserId] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    res.json(summaries);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.markConversationAsRead = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    if (!senderId || !receiverId) {
      return res.status(400).json({ error: 'Missing senderId or receiverId' });
    }

    const unreadMessages = await Message.find(
      {
        sender: receiverId,
        receiver: senderId,
        isRead: false
      },
      {
        _id: 1
      }
    );

    const readMessageIds = unreadMessages.map((message) => message._id);

    const result = await Message.updateMany(
      {
        _id: { $in: readMessageIds }
      },
      {
        $set: { isRead: true }
      }
    );

    if (result.modifiedCount > 0 && req.io) {
      req.io.to(receiverId.toString()).emit('messages_read', {
        senderId,
        receiverId,
        messageIds: readMessageIds
      });
    }

    res.json({
      message: 'Conversation marked as read',
      modifiedCount: result.modifiedCount,
      messageIds: readMessageIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    if (senderId && receiverId) {
      const result = await Message.deleteMany({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId }
        ]
      });

      return res.json({ message: `${result.deletedCount} messages deleted` });
    }

    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
