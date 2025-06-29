const cron = require('node-cron');
const QuitPlan = require('../models/quitPlan.model');
const QuitPlanStage = require('../models/quitPlanStage.model');
const quitProgressService = require('../services/quitProgress.service');

class ExpiredStagesChecker {
    constructor() {
        this.isRunning = false;
    }

    async checkExpiredStages() {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        try {
            // Lấy tất cả plans đang ongoing
            const ongoingPlans = await QuitPlan.find({ status: 'ongoing' });

            let processedCount = 0;
            let completedStagesCount = 0;

            for (const plan of ongoingPlans) {
                try {
                    // Lấy các stage chưa complete của plan này
                    const incompleteStages = await QuitPlanStage.find({
                        quitPlanId: plan._id,
                        completed: false,
                        end_date: { $exists: true, $ne: null }
                    }).sort({ order_index: 1 });

                    for (const stage of incompleteStages) {
                        const currentDate = new Date();
                        const stageEndDate = new Date(stage.end_date);

                        // Kiểm tra nếu stage đã hết hạn
                        if (currentDate >= stageEndDate) {

                            // Gọi checkAndCompleteStage
                            await quitProgressService.checkAndCompleteStage(stage._id, plan.userId);
                            completedStagesCount++;
                        }
                    }

                    processedCount++;
                } catch (error) {
                }
            }

        } catch (error) {
        } finally {
            this.isRunning = false;
        }
    }

    startScheduler() {
        // Chạy mỗi ngày lúc 00:01 để kiểm tra stages của ngày hôm trước
        cron.schedule('1 0 * * *', () => {
            this.checkExpiredStages();
        });

        // Backup check lúc 00:30 để đảm bảo không miss
        cron.schedule('30 0 * * *', () => {
            this.checkExpiredStages();
        });
    }

    // Method để test thủ công
    async runManualCheck() {
        await this.checkExpiredStages();
    }
}

const expiredStagesChecker = new ExpiredStagesChecker();

module.exports = {
    startExpiredStagesChecker: () => expiredStagesChecker.startScheduler(),
    runManualExpiredStagesCheck: () => expiredStagesChecker.runManualCheck()
}; 