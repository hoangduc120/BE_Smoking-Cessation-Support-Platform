const { StatusCodes } = require('http-status-codes');
const { verifyToken } = require('./jwt');
const User = require('../models/user.models');

const extractToken = (req) => {
  const cookieToken = req.cookies?.accessToken;
  const authHeader = req.headers.authorization;
  const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  return cookieToken || headerToken || req.query.token || null;
};

const authMiddleware = async (req, res, next) => {
  const accessToken = extractToken(req);

  if (!accessToken) {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'Authentication required. Please log in or refresh your token.',
    });
  }

  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not defined in environment variables');
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Server configuration error',
    });
  }

  try {
    const accessTokenDecoded = await verifyToken(accessToken, process.env.JWT_SECRET);
    req.jwtDecoded = accessTokenDecoded;
    req.id = accessTokenDecoded.userId || accessTokenDecoded.id;
    req.role = accessTokenDecoded.role;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'Invalid or expired token. Please refresh your token or log in again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        message: 'No role information available',
      });
    }

    if (!roles.includes(req.role)) {
      return res.status(StatusCodes.FORBIDDEN).json({
        message: 'You do not have permission to perform this action',
        requiredRoles: roles,
      });
    }
    next();
  };
};

module.exports = { authMiddleware, restrictTo };