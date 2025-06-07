const planMonitorService = require('../services/planMonitor.service');
const { OK, BAD_REQUEST } = require("../configs/response.config");

class PlanMonitorController {
    async getUserPlanStatus(req, res) {
        try {
            if (!req.user) {
                return BAD_REQUEST(res, 'User authentication required');
            }

            const userId = req.user._id;
            const status = await planMonitorService.getUserPlanStatus(userId);

            return OK(res, 'User plan status retrieved successfully', status);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }

    async getUserAlerts(req, res) {
        try {
            if (!req.user) {
                return BAD_REQUEST(res, 'User authentication required');
            }

            const userId = req.user._id;
            const alerts = await planMonitorService.getUserAlerts(userId);

            return OK(res, 'User alerts retrieved successfully', alerts);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }

    async getPlansAtRisk(req, res) {
        try {
            const plansAtRisk = await planMonitorService.getPlansAtRisk();

            return OK(res, 'Plans at risk retrieved successfully', plansAtRisk);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }

    async getOverallStats(req, res) {
        try {
            const stats = await planMonitorService.getOverallStats();

            return OK(res, 'Overall statistics retrieved successfully', stats);
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }

    async triggerFailedPlansCheck(req, res) {
        try {
            const quitProgressService = require('../services/quitProgress.service');
            await quitProgressService.checkFailedPlans();

            return OK(res, 'Failed plans check completed successfully', {
                checkedAt: new Date(),
                message: 'Manual check for failed plans has been executed'
            });
        } catch (error) {
            return BAD_REQUEST(res, error.message);
        }
    }
}

module.exports = new PlanMonitorController(); 