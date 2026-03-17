const express = require('express');
const userController = require('../controllers/userController');

const router = express.Router();

router.get('/:id', userController.getUser);
router.get('/', userController.getAllUsers);
router.put('/:id', userController.updateUser);

module.exports = router;
