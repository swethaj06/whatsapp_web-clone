const express = require('express');
const messageController = require('../controllers/messageController');

const router = express.Router();

router.post('/send', messageController.sendMessage);
router.get('/', messageController.getMessages);
router.delete('/:id', messageController.deleteMessage);

module.exports = router;
