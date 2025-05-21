const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

router.get('/', blogController.getAllBlogs);
router.get('/:slug', blogController.getBlogBySlug);

router.use(authMiddleware);
router.post("/", restrictTo("user", "coach", "admin"), blogController.createBlog)
router.put("/:id", restrictTo("user", "coach", "admin"), blogController.updateBlog)
router.delete("/:id", restrictTo("user", "coach", "admin"), blogController.deleteBlog)
router.post("/:bid/like", restrictTo("user", "coach", "admin"), blogController.likeBlog)
router.post("/:id/comment", restrictTo("user", "coach", "admin"), blogController.addComment)

module.exports = router;
