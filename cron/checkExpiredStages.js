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
            console.log('Expired stages check is already running, skipping...');
            return;
        }

        this.isRunning = true;
        console.log('🔍 Starting expired stages check...', new Date().toISOString());

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
                            console.log(`⏰ Found expired stage: ${stage.stage_name} for user ${plan.userId}`);

                            // Gọi checkAndCompleteStage
                            await quitProgressService.checkAndCompleteStage(stage._id, plan.userId);
                            completedStagesCount++;
                        }
                    }

                    processedCount++;
                } catch (error) {
                    console.error(`❌ Error processing plan ${plan._id}:`, error.message);
                }
            }

            console.log(`✅ Expired stages check completed:`, {
                plansProcessed: processedCount,
                stagesCompleted: completedStagesCount,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            console.error('❌ Error in expired stages check:', error);
        } finally {
            this.isRunning = false;
        }
    }

    startScheduler() {
        // Chạy mỗi ngày lúc 00:01 để kiểm tra stages của ngày hôm trước
        cron.schedule('1 0 * * *', () => {
            console.log('🌅 Daily expired stages check at midnight...');
            this.checkExpiredStages();
        });

        // Backup check lúc 00:30 để đảm bảo không miss
        cron.schedule('30 0 * * *', () => {
            console.log('🔄 Backup expired stages check...');
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