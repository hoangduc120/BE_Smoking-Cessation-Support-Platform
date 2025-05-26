const express = require("express");
const router = express.Router();
const surveyController = require("../controllers/survey.controller");
const { authMiddleware, restrictTo } = require('../middlewares/authMiddleware');

router.get("/", authMiddleware, restrictTo("admin"), surveyController.getAllSurveys);
router.get("/me/surveys", authMiddleware, restrictTo("user"), surveyController.getSurveysByUserId);
router.get("/user/:userId", authMiddleware, surveyController.getSurveysByUserId);


router.post("/", authMiddleware, restrictTo("user"), surveyController.createSurvey);
router.put("/:surveyId", authMiddleware, restrictTo("user"), surveyController.updateSurvey);
router.get("/:surveyId", authMiddleware, restrictTo("user"), surveyController.getSurveyById);
router.delete("/:surveyId", authMiddleware, restrictTo("user", "admin"), surveyController.deleteSurvey);

module.exports = router;