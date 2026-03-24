const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log('🔐 [Auth] Checking token for path:', req.path);
    console.log('🔐 [Auth] Token present:', !!token);

    if (!token) {
      console.log('🔐 [Auth] No token found');
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized to access this route' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    console.log('🔐 [Auth] Token decoded, userId:', decoded.userId);
    
    const user = await User.findById(decoded.userId);

    if (!user) {
      console.log('🔐 [Auth] User not found for userId:', decoded.userId);
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log('🔐 [Auth] User authenticated:', user.username);
    req.user = user;
    next();
  } catch (error) {
    console.log('🔐 [Auth] Error:', error.message);
    return res.status(401).json({ 
      success: false, 
      message: 'Not authorized to access this route',
      error: error.message 
    });
  }
};
