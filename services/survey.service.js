const Survey = require("../models/survey.model");
const mongoose = require("mongoose");
const QuitProgress = require("../models/quitProgress.model");


class SurveyService {
    async createSurvey(surveyData) {
        try {
            const {
                userId,
                motivation,
                smokingDurationYear,
                peakSmokingTimes,
                quitAttempts,
                supportNeeded,
            } = surveyData;


            if (
                !userId ||
                !motivation ||
                !smokingDurationYear ||
                !peakSmokingTimes ||
                !quitAttempts ||
                !supportNeeded
            ) {
                throw new Error("All fields are required");
            }

            const survey = new Survey({
                userId,
                motivation,
                smokingDurationYear,
                peakSmokingTimes,
                quitAttempts,
                supportNeeded,
            })
            await survey.save();
            return survey;
        } catch (error) {
            console.error("Error creating survey:", error);
            throw error instanceof Error ? error : new Error(error.message || "Error creating survey");
        }
    }
    async updateSurvey(surveyId, updateData) {
        try {
            const { quitPlanId, latestProgressId } = updateData;

            if (!surveyId) {
                throw new Error("Survey ID is required");
            }

            const survey = await Survey.findByIdAndUpdate(
                surveyId,
                { quitPlanId, latestProgressId },
                { new: true }
            )

            if (!survey) {
                throw new Error("Survey not found");
            }
            return survey;
        } catch (error) {
            console.error("Error updating survey:", error);
            throw error instanceof Error ? error : new Error(error.message || "Error updating survey");
        }
    }
    async getSurveyById(surveyId) {
        try {
            if (!surveyId || !mongoose.Types.ObjectId.isValid(surveyId)) {
                throw new Error("Invalid survey ID format");
            }

            const survey = await Survey.findById(surveyId)
                .populate("userId", "username email")
                .populate("quitPlanId")
                .populate("latestProgressId");

            if (!survey) {
                throw new Error("Survey not found");
            }

            return survey;
        } catch (error) {
            console.error("Error getting survey:", error);
            throw error instanceof Error ? error : new Error(error.message || "Error getting survey");
        }
    }

    async getAllSurveys() {
        try {
            const surveys = await Survey.find()
                .populate("userId", "username email")
                .populate("quitPlanId")
                .populate("latestProgressId");
            return surveys;
        } catch (error) {
            console.error("Error getting all surveys:", error);
            throw error instanceof Error ? error : new Error(error.message || "Error getting all surveys");
        }
    }

    async getSurveysByUserId(userId) {
        try {
            if (!userId) {
                throw new Error("User ID is required");
            }

            const surveys = await Survey.find({ userId })
                .populate("quitPlanId")
                .populate("latestProgressId");

            return surveys;
        } catch (error) {
            console.error("Error getting user surveys:", error);
            throw error instanceof Error ? error : new Error(error.message || "Error getting user surveys");
        }
    }

    async deleteSurvey(surveyId) {
        try {
            if (!surveyId) {
                throw new Error("Survey ID is required");
            }

            const survey = await Survey.findByIdAndDelete(surveyId);

            if (!survey) {
                throw new Error("Survey not found");
            }

            return { success: true, message: "Survey deleted successfully" };
        } catch (error) {
            console.error("Error deleting survey:", error);
            throw error instanceof Error ? error : new Error(error.message || "Error deleting survey");
        }
    }
}

module.exports = new SurveyService();