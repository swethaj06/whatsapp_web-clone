const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const multer = require('multer');
const Message = require('../models/Message');

const uploadsDirectory = path.join(__dirname, '../../uploads/messages');

if (!fs.existsSync(uploadsDirectory)) {
  fs.mkdirSync(uploadsDirectory, { recursive: true });
}

const sanitizeFileName = (fileName = 'file') => {
  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);

  return `${baseName}`
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60) + extension.toLowerCase();
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDirectory);
  },
  filename: (req, file, cb) => {
    const safeName = sanitizeFileName(file.originalname || 'attachment');
    const extension = path.extname(safeName);
    const nameWithoutExtension = path.basename(safeName, extension) || 'attachment';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${nameWithoutExtension}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

const buildAbsoluteFileUrl = (req, storedFileName) => {
  return `${req.protocol}://${req.get('host')}/uploads/messages/${storedFileName}`;
};

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
        fileUrl,
        fileName,
        fileSize,
        fileDuration
      }
    };
  }

  if (isAttachmentUpload) {
    const directFileUrl = buildAbsoluteFileUrl(req, file.filename);

    return {
      data: {
        sender,
        receiver,
        content: content && content.trim() ? content.trim() : (file.originalname || resolvedMessageType),
        messageType: resolvedMessageType,
        fileUrl: directFileUrl,
        fileName: file.originalname || fileName || file.filename,
        fileSize: file.size,
        fileDuration: fileDuration ? Number(fileDuration) : null,
        fileMimeType: file.mimetype || null,
        storedFileName: file.filename
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
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return res.status(normalizedPayload.status).json({ error: normalizedPayload.error });
    }

    const message = await saveAndPopulateMessage(normalizedPayload.data);

    res.status(201).json(message);
  } catch (error) {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

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

    await Message.updateMany(
      {
        sender: receiverId,
        receiver: senderId,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

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

    const result = await Message.updateMany(
      {
        sender: receiverId,
        receiver: senderId,
        isRead: false
      },
      {
        $set: { isRead: true }
      }
    );

    res.json({
      message: 'Conversation marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    if (senderId && receiverId) {
      const messages = await Message.find({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId }
        ]
      });

      for (const message of messages) {
        if (message.storedFileName) {
          const storedFilePath = path.join(uploadsDirectory, message.storedFileName);
          if (fs.existsSync(storedFilePath)) {
            fs.unlinkSync(storedFilePath);
          }
        }
      }

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

    if (message.storedFileName) {
      const storedFilePath = path.join(uploadsDirectory, message.storedFileName);
      if (fs.existsSync(storedFilePath)) {
        fs.unlinkSync(storedFilePath);
      }
    }

    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
