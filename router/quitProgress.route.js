const express = require("express")
const router = express.Router()
const quitProgressController = require("../controllers/quitProgress.controller")
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

router.post('/', authMiddleware, restrictTo('user'), quitProgressController.createQuitProgress)
router.get('/', authMiddleware, restrictTo('user'), quitProgressController.getQuitProgressById)
router.get('/:id', authMiddleware, restrictTo('user'), quitProgressController.getQuitProgress)
router.put('/:id', authMiddleware, restrictTo('user'), quitProgressController.updateQuitProgress)
router.delete('/:id', authMiddleware, restrictTo('user'), quitProgressController.deleteQuitProgress)

module.exports = router;
