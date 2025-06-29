const surveyService = require("../services/survey.service");
const { OK, BAD_REQUEST } = require("../configs/response.config");
const mongoose = require("mongoose");

class SurveyController {
    async createSurvey(req, res) {
        try {
            const survey = await surveyService.createSurvey(req.body);
            return OK(res, "Survey created successfully", survey);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }
    async updateSurvey(req, res) {
        try {
            const { surveyId } = req.params
            const survey = await surveyService.updateSurvey(surveyId, req.body);
            return OK(res, "Survey updated successfully", survey);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }
    async getSurveyById(req, res) {
        try {
            const { surveyId } = req.params;
            if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) {
                return BAD_REQUEST(res, "Invalid survey ID format");
            }

            const survey = await surveyService.getSurveyById(surveyId);
            return OK(res, "Survey fetched successfully", survey);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }

    async getAllSurveys(req, res) {
        try {
            const surveys = await surveyService.getAllSurveys();
            return OK(res, "All surveys fetched successfully", surveys);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }

    async getSurveysByUserId(req, res) {
        try {
            const userId = req.params.userId || req.user._id;
            const surveys = await surveyService.getSurveysByUserId(userId);
            return OK(res, "User surveys fetched successfully", surveys);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }

    async deleteSurvey(req, res) {
        try {
            const { surveyId } = req.params;
            const result = await surveyService.deleteSurvey(surveyId);
            return OK(res, "Survey deleted successfully", result);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }
}

module.exports = new SurveyController();    