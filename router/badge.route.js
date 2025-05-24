const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/authMiddleware');
const Badge = require('../models/badge.model');
const UserBadge = require('../models/userBadge.model');

// Lấy danh sách huy hiệu của người dùng
router.get('/my', authMiddleware, async (req, res) => {
  const userId = req.id;
  try {
    const badges = await UserBadge.find({ userId }).populate('badgeId');
    res.status(200).json({
      success: true,
      data: badges.map(b => ({
        name: b.badgeId.name,
        description: b.badgeId.description,
        icon: b.badgeId.icon_url,
        awardedAt: b.awardedAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user badges', error: error.message });
  }
});

module.exports = router;
