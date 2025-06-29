const QuitPlan = require("../models/quitPlan.model");
const QuitPlanStage = require("../models/quitPlanStage.model");
const QuitProgress = require("../models/quitProgress.model");
const User = require("../models/user.models");
const quitPlanService = require("./quitPlan.service");
const sendMail = require("../utils/sendMail");


class QuitProgressService {
    async createQuitProgress(quitProgressData) {
        const { userId, stageId, date, cigarettesSmoked, healthStatus, notes } = quitProgressData

        const stage = await QuitPlanStage.findById(stageId)
        if (!stage) {
            throw new Error("Stage not found")
        }
        const quitPlan = await QuitPlan.findById(stage.quitPlanId);
        if (!quitPlan || !quitPlan.userId || quitPlan.userId.toString() !== userId.toString()) {
            throw new Error('User is not associated with this quit plan');
        }

        const existingProgress = await QuitProgress.findOne({
            userId,
            stageId,
            date: {
                $gte: new Date(date).setHours(0, 0, 0, 0),
                $lt: new Date(date).setHours(23, 59, 59, 999)
            }
        });

        if (existingProgress) {
            throw new Error('Progress for this date already exists');
        }

        const quitProgress = new QuitProgress({
            userId,
            stageId,
            date,
            cigarettesSmoked,
            healthStatus,
            notes,
        });

        const savedProgress = await quitProgress.save();

        await this.checkAndCompleteStage(stageId, userId);

        return savedProgress;
    }
    async getQuitProgressById(id) {
        const quitProgress = await QuitProgress.findById(id)
            .populate('userId', 'userName email')
            .populate('stageId', 'name description')

        if (!quitProgress) {
            throw new Error("Quit progress not found")
        }

        return quitProgress
    }
    async updateQuitProgress(id, updateData) {
        const quitProgress = await QuitProgress.findById(id)
        if (!quitProgress) {
            throw new Error("Quit progress not found")
        }

        Object.assign(quitProgress, updateData)
        return await quitProgress.save()
    }
    async deleteQuitProgress(id) {
        const quitProgress = await QuitProgress.findById(id)
        if (!quitProgress) {
            throw new Error("Quit progress not found")
        }
        await quitProgress.remove()
    }

    async checkAndCompleteStage(stageId, userId) {
        try {
            const stage = await QuitPlanStage.findById(stageId);
            if (!stage || stage.completed) {
                return;
            }

            const totalDays = stage.duration;

            const checkInCount = await QuitProgress.countDocuments({
                userId,
                stageId
            });

            const completionPercentage = (checkInCount / totalDays) * 100;

            if (completionPercentage >= 75) {
                await quitPlanService.completeStage(stageId, userId);
            } else {
            }
        } catch (error) {
        }
    }

    async checkFailedPlans() {
        try {
            const ongoingPlans = await QuitPlan.find({ status: "ongoing" });

            for (const plan of ongoingPlans) {
                await this.checkPlanForFailure(plan._id, plan.userId);
            }
        } catch (error) {
        }
    }

    async checkPlanForFailure(planId, userId) {
        try {
            const stages = await QuitPlanStage.find({
                quitPlanId: planId
            }).sort({ order_index: 1 });

            for (const stage of stages) {
                if (stage.completed) continue;

                const totalDays = stage.duration;

                const checkInCount = await QuitProgress.countDocuments({
                    userId,
                    stageId: stage._id
                });

                const completionPercentage = (checkInCount / totalDays) * 100;

                if (completionPercentage >= 75) {
                    await quitPlanService.completeStage(stage._id, userId);
                }
            }

            return false;
        } catch (error) {
            return false;
        }
    }

    async getStageProgressStats(stageId, userId) {
        try {
            const stage = await QuitPlanStage.findById(stageId);
            if (!stage) {
                throw new Error('Stage not found');
            }

            const totalDays = stage.duration;

            const checkInCount = await QuitProgress.countDocuments({
                userId,
                stageId
            });

            const progressEntries = await QuitProgress.find({
                userId,
                stageId
            }).sort({ date: 1 });

            const completionPercentage = Math.round((checkInCount / totalDays) * 100);

            const checkInsRequiredForCompletion = Math.ceil(totalDays * 0.75);

            const checkInsUntilCanComplete = Math.max(0, checkInsRequiredForCompletion - checkInCount);

            let stageStatus = 'not_started';
            if (stage.completed) {
                stageStatus = 'completed';
            } else if (checkInCount > 0) {
                stageStatus = 'in_progress';
            }

            return {
                stage: stage,
                totalDays,
                checkInCount: checkInCount,
                remainingCheckIns: Math.max(0, totalDays - checkInCount),
                completionPercentage: completionPercentage,
                isCompleted: stage.completed,
                stageStatus: stageStatus,
                canComplete: completionPercentage >= 75,
                checkInsRequiredForCompletion: checkInsRequiredForCompletion,
                checkInsUntilCanComplete: checkInsUntilCanComplete,
                progressEntries,
                checkInRate: `${checkInCount}/${totalDays}`,
                successThreshold: '75%',
                isEligibleForCompletion: checkInCount >= checkInsRequiredForCompletion
            };
        } catch (error) {
            throw new Error(`Error getting stage progress stats: ${error.message}`);
        }
    }

    async moveToNextStage(quitPlanId, userId) {
        try {
            const stages = await QuitPlanStage.find({
                quitPlanId: quitPlanId
            }).sort({ order_index: 1 });

            const completedStages = stages.filter(stage => stage.completed);
            const incompleteStages = stages.filter(stage => !stage.completed);

            if (incompleteStages.length === 0 && stages.length > 0) {
                await quitPlanService.completePlan(quitPlanId, userId);
            } else if (incompleteStages.length > 0) {
                const nextStage = incompleteStages[0];
            }
        } catch (error) {
        }
    }

    async checkAndAutoCompleteStages(userId) {
        try {
            const ongoingPlans = await QuitPlan.find({
                userId: userId,
                status: "ongoing"
            });

            for (const plan of ongoingPlans) {
                const incompleteStages = await QuitPlanStage.find({
                    quitPlanId: plan._id,
                    completed: false
                });

                for (const stage of incompleteStages) {
                    await this.checkAndCompleteStage(stage._id, userId);
                }
            }
        } catch (error) {
        }
    }

    async sendDailyReminders() {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            const ongoingPlans = await QuitPlan.find({
                status: "ongoing"
            }).populate('userId', 'userName email');

            for (const plan of ongoingPlans) {
                try {
                    const currentStage = await QuitPlanStage.findOne({
                        quitPlanId: plan._id,
                        completed: false,
                        start_date: { $exists: true, $ne: null }
                    }).sort({ order_index: 1 });

                    if (!currentStage) continue;

                    const todayProgress = await QuitProgress.findOne({
                        userId: plan.userId._id,
                        stageId: currentStage._id,
                        date: {
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    });

                    if (!todayProgress && plan.userId.email) {
                        await this.sendReminderEmail(plan.userId, currentStage);
                    }
                } catch (error) {
                    console.error(`Error processing plan ${plan._id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error in sendDailyReminders:', error);
        }
    }

    async sendReminderEmail(user, stage) {
        try {
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">🌟 Nhắc nhở cập nhật sức khỏe</h1>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                        <h2 style="color: #333; margin-top: 0;">Xin chào ${user.userName}!</h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            Chúng tôi nhận thấy bạn chưa cập nhật tình trạng sức khỏe hôm nay. 
                            Việc theo dõi tiến trình hằng ngày là rất quan trọng để đạt được mục tiêu bỏ thuốc lá của bạn.
                        </p>

                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
                            <h3 style="color: #333; margin-top: 0;">📋 Stage hiện tại: ${stage.stage_name}</h3>
                            <p style="color: #666; margin-bottom: 0;">${stage.description || 'Tiếp tục hành trình bỏ thuốc lá của bạn!'}</p>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:5000'}/progress" 
                               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                                💪 Cập nhật ngay
                            </a>
                        </div>

                        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <h4 style="color: #1976d2; margin-top: 0;">💡 Lời khuyên:</h4>
                            <ul style="color: #666; margin-bottom: 0;">
                                <li>Hãy dành 2-3 phút mỗi ngày để cập nhật tình trạng sức khỏe</li>
                                <li>Ghi chú lại cảm xúc và những thay đổi tích cực bạn nhận thấy</li>
                                <li>Nhớ rằng mỗi ngày không hút thuốc là một chiến thắng!</li>
                            </ul>
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
                        <p>Đội ngũ hỗ trợ bỏ thuốc lá luôn đồng hành cùng bạn! 🚭✨</p>
                        <p>Email này được gửi tự động vào 20:00 hằng ngày.</p>
                    </div>
                </div>
            `;

            await sendMail({
                email: user.email,
                subject: "🌟 Nhắc nhở cập nhật sức khỏe - Hành trình bỏ thuốc lá",
                html: emailHtml
            });
        } catch (error) {
            console.error('Error sending reminder email:', error);
        }
    }

    async canCompleteStageManually(stageId, userId) {
        try {
            const stage = await QuitPlanStage.findById(stageId);
            if (!stage) {
                throw new Error('Stage not found');
            }

            if (stage.completed) {
                return { canComplete: false, reason: 'Stage already completed' };
            }

            const totalDays = stage.duration;
            const checkInCount = await QuitProgress.countDocuments({
                userId,
                stageId
            });

            const completionPercentage = (checkInCount / totalDays) * 100;
            const requiredPercentage = 75;

            return {
                canComplete: completionPercentage >= requiredPercentage,
                checkInCount,
                totalDays,
                completionPercentage: Math.round(completionPercentage * 10) / 10,
                requiredPercentage,
                checkInsNeeded: Math.max(0, Math.ceil(totalDays * 0.75) - checkInCount),
                reason: completionPercentage >= requiredPercentage
                    ? 'Eligible for completion'
                    : `Need ${Math.ceil(totalDays * 0.75) - checkInCount} more check-ins`
            };
        } catch (error) {
            throw new Error(`Error checking stage completion eligibility: ${error.message}`);
        }
    }
}

module.exports = new QuitProgressService()