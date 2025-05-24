const express = require('express');
const router = express.Router();
const controller = require('../controllers/quitPlan.controller');
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Quản lý kế hoạch cai thuốc
 */

/**
 * @swagger
 * /plans:
 *   post:
 *     summary: Tạo kế hoạch mẫu
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               expectedQuitDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Kế hoạch đã được tạo
 */
router.post('/', authMiddleware, restrictTo('coach'), controller.createPlan);

/**
 * @swagger
 * /plans/coach/{coachId}:
 *   get:
 *     summary: Lấy danh sách kế hoạch mẫu của huấn luyện viên
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: coachId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Danh sách kế hoạch
 */
router.get('/coach/:coachId', controller.getCoachPlans);

/**
 * @swagger
 * /plans/{id}:
 *   get:
 *     summary: Lấy chi tiết kế hoạch
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết kế hoạch
 */
router.get('/:id', controller.getPlan);

/**
 * @swagger
 * /plans/{id}:
 *   put:
 *     summary: Cập nhật kế hoạch mẫu
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Kế hoạch đã được cập nhật
 */
router.put('/:id', authMiddleware, restrictTo('coach'), controller.updatePlan);

/**
 * @swagger
 * /plans/{id}:
 *   delete:
 *     summary: Xoá kế hoạch mẫu
 *     tags: [Plans]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kế hoạch đã bị xoá
 */
router.delete('/:id', authMiddleware, restrictTo('coach'), controller.deletePlan);

// User apply plan mẫu
router.post('/:planId/apply', authMiddleware, restrictTo('user'), controller.applyPlan);

// User hoàn thành plan
router.post('/:planId/complete', authMiddleware, restrictTo('user'), controller.completePlan);

// Thêm stage vào plan
router.post('/:planId/stages', authMiddleware, restrictTo('coach'), controller.addStage);

// Lấy danh sách stages của plan
router.get('/:planId/stages', authMiddleware, controller.getStages);

// Cập nhật 1 stage
router.put('/stages/:stageId', authMiddleware, restrictTo('coach'), controller.updateStage);

// Xoá 1 stage
router.delete('/stages/:stageId', authMiddleware, restrictTo('coach'), controller.deleteStage);

module.exports = router;
