// Message Controller
const Message = require('../models/Message');

exports.sendMessage = async (req, res) => {
  try {
    const { sender, receiver, content } = req.body;

    // Validate input
    if (!sender || !receiver || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (content.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }

    const message = new Message({
      sender,
      receiver,
      content
    });
    await message.save();

    // Populate sender and receiver details
    await message.populate('sender', 'username email profilePicture');
    await message.populate('receiver', 'username email profilePicture');

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

exports.deleteMessage = async (req, res) => {
  try {
    const { senderId, receiverId } = req.query;

    // If query parameters are provided, delete all messages between two users
    if (senderId && receiverId) {
      const result = await Message.deleteMany({
        $or: [
          { sender: senderId, receiver: receiverId },
          { sender: receiverId, receiver: senderId }
        ]
      });
      return res.json({ message: `${result.deletedCount} messages deleted` });
    }

    // Otherwise, delete a single message by ID
    const message = await Message.findByIdAndDelete(req.params.id);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json({ message: 'Message deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
