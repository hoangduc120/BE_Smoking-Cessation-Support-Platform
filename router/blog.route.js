const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');
const { checkBlogPostLimit } = require('../middlewares/membershipMiddleware');

router.get('/', blogController.getAllBlogs);
router.get('/tags', blogController.getAllTags);
router.get('/tag/:tagId', blogController.getBlogsByTag);
router.get('/user/:userId', blogController.getBlogsByUserId);
router.get('/:slug', blogController.getBlogBySlug);

router.post("/", authMiddleware, checkBlogPostLimit, restrictTo("user", "coach", "admin"), blogController.createBlog)

router.put("/:id", authMiddleware, restrictTo("user", "coach", "admin"), blogController.updateBlog)
router.delete("/:id", authMiddleware, restrictTo("user", "coach", "admin"), blogController.deleteBlog)
router.post("/:bid/like", authMiddleware, restrictTo("user", "coach", "admin"), blogController.likeBlog)
router.post("/:id/comment", authMiddleware, restrictTo("user", "coach", "admin"), blogController.addComment)

module.exports = router;
