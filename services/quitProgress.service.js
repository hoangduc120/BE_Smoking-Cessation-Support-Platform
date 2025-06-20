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
            const stageStartDate = stage.start_date ? new Date(stage.start_date) : null;

            if (stageStartDate) {
                const currentDate = new Date();
                const stageEndDate = new Date(stageStartDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));

                // CHỈ tính số ngày hoàn chỉnh đã trôi qua (không làm tròn lên)
                const daysPassed = Math.floor((currentDate - stageStartDate) / (1000 * 60 * 60 * 24));

                // CHỈ kiểm tra completion khi stage thực sự đã hết hạn (currentDate > stageEndDate)
                if (currentDate >= stageEndDate) {
                    const progressCount = await QuitProgress.countDocuments({
                        userId,
                        stageId,
                        date: {
                            $gte: stageStartDate,
                            $lt: stageEndDate
                        }
                    });

                    const completionPercentage = (progressCount / totalDays) * 100;

                    if (completionPercentage >= 75) {
                        await quitPlanService.completeStage(stageId, userId);
                        await this.moveToNextStage(stage.quitPlanId, userId);
                    } else {
                        await quitPlanService.failQuitPlan(stage.quitPlanId, userId);
                    }
                }
                // Nếu stage chưa hết hạn, không làm gì cả - cho phép user tiếp tục cập nhật
            }
        } catch (error) {
            console.error('Error in checkAndCompleteStage:', error);
        }
    }

    async checkFailedPlans() {
        try {
            const ongoingPlans = await QuitPlan.find({ status: "ongoing" });

            for (const plan of ongoingPlans) {
                await this.checkPlanForFailure(plan._id, plan.userId);
            }
        } catch (error) {
            console.error('Error checking failed plans:', error);
        }
    }

    async checkPlanForFailure(planId, userId) {
        try {
            const stages = await QuitPlanStage.find({
                quitPlanId: planId
            }).sort({ order_index: 1 });

            const currentDate = new Date();

            for (const stage of stages) {
                if (stage.completed) continue;

                const totalDays = stage.duration;

                if (stage.start_date) {
                    const stageStartDate = new Date(stage.start_date);
                    const stageEndDate = new Date(stageStartDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));

                    // CHỈ kiểm tra khi stage thực sự đã hết hạn
                    if (currentDate >= stageEndDate && !stage.completed) {
                        const progressCount = await QuitProgress.countDocuments({
                            userId,
                            stageId: stage._id,
                            date: {
                                $gte: stageStartDate,
                                $lt: stageEndDate
                            }
                        });

                        const completionPercentage = (progressCount / totalDays) * 100;
                        if (completionPercentage < 75) {
                            await quitPlanService.failQuitPlan(planId, userId);
                            return true;
                        } else {
                            await quitPlanService.completeStage(stage._id, userId);
                            await this.moveToNextStage(planId, userId);
                        }
                    }
                }
            }

            return false;
        } catch (error) {
            console.error('Error checking plan for failure:', error);
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
            const currentDate = new Date();

            let progressCount = 0;
            let progressEntries = [];
            let daysPassed = 0;
            let daysRemaining = totalDays;
            let stageStatus = 'not_started';

            if (stage.start_date) {
                const startDate = new Date(stage.start_date);
                const endDate = new Date(startDate.getTime() + (totalDays * 24 * 60 * 60 * 1000));
                // Tính số ngày hoàn chỉnh đã trôi qua (không làm tròn lên)
                daysPassed = Math.max(0, Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24)));
                daysRemaining = Math.max(0, totalDays - daysPassed);

                progressCount = await QuitProgress.countDocuments({
                    userId,
                    stageId,
                    date: {
                        $gte: startDate,
                        $lt: endDate
                    }
                });

                progressEntries = await QuitProgress.find({
                    userId,
                    stageId,
                    date: {
                        $gte: startDate,
                        $lt: endDate
                    }
                }).sort({ date: 1 });

                // Kiểm tra trạng thái stage dựa trên thời gian thực sự đã hết hạn
                if (currentDate >= endDate) {
                    stageStatus = stage.completed ? 'completed' : 'expired';
                } else if (daysPassed > 0 || progressCount > 0) {
                    stageStatus = 'in_progress';
                }
            } else {
                progressCount = await QuitProgress.countDocuments({
                    userId,
                    stageId
                });

                progressEntries = await QuitProgress.find({
                    userId,
                    stageId
                }).sort({ date: 1 });
            }

            const completionPercentage = Math.round((progressCount / totalDays) * 100);
            const daysRequiredForCompletion = Math.ceil(totalDays * 0.75);

            return {
                stage: stage,
                totalDays,
                completedDays: progressCount,
                daysPassed,
                daysRemaining,
                remainingDays: Math.max(0, totalDays - progressCount), // Số ngày còn lại cần điểm danh
                completionPercentage: completionPercentage,
                isCompleted: stage.completed,
                stageStatus: stageStatus,
                canComplete: completionPercentage >= 75,
                daysRequiredForCompletion: daysRequiredForCompletion,
                daysUntilCanComplete: Math.max(0, daysRequiredForCompletion - progressCount),
                progressEntries
            };
        } catch (error) {
            throw new Error(`Error getting stage progress stats: ${error.message}`);
        }
    }

    // Hàm chuyển sang stage tiếp theo
    async moveToNextStage(quitPlanId, userId) {
        try {
            const stages = await QuitPlanStage.find({
                quitPlanId: quitPlanId
            }).sort({ order_index: 1 });

            const currentStageIndex = stages.findIndex(stage => stage.completed === false);

            if (currentStageIndex !== -1 && currentStageIndex < stages.length - 1) {
                // Có stage tiếp theo
                const nextStage = stages[currentStageIndex + 1];
                const currentDate = new Date();

                // Cập nhật start_date cho stage tiếp theo
                await QuitPlanStage.findByIdAndUpdate(nextStage._id, {
                    start_date: currentDate,
                    end_date: new Date(currentDate.getTime() + (nextStage.duration * 24 * 60 * 60 * 1000))
                });

                console.log(`Moved to next stage: ${nextStage.stage_name} for user ${userId}`);
            } else {
                await quitPlanService.completePlan(quitPlanId, userId);
                console.log(`Completed all stages for plan ${quitPlanId}, user ${userId}`);
            }
        } catch (error) {
            console.error('Error in moveToNextStage:', error);
        }
    }

    // Hàm kiểm tra và auto-complete tất cả các stage đạt ngưỡng 75%
    async checkAndAutoCompleteStages(userId) {
        try {
            const incompleteStages = await QuitPlanStage.find({
                completed: false
            });

            for (const stage of incompleteStages) {
                // Kiểm tra xem stage này có thuộc về user không
                const quitPlan = await QuitPlan.findById(stage.quitPlanId);
                if (quitPlan && quitPlan.userId && quitPlan.userId.toString() === userId.toString()) {
                    await this.checkAndCompleteStage(stage._id, userId);
                }
            }
        } catch (error) {
            console.error('Error in checkAndAutoCompleteStages:', error);
        }
    }

    // Hàm kiểm tra và gửi email nhắc nhở cho user chưa cập nhật sức khỏe
    async sendDailyReminders() {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));
            const endOfDay = new Date(today.setHours(23, 59, 59, 999));

            // Tìm tất cả user có plan đang ongoing
            const ongoingPlans = await QuitPlan.find({
                status: "ongoing"
            }).populate('userId', 'userName email');

            for (const plan of ongoingPlans) {
                try {
                    // Tìm stage hiện tại của user
                    const currentStage = await QuitPlanStage.findOne({
                        quitPlanId: plan._id,
                        completed: false,
                        start_date: { $exists: true, $ne: null }
                    }).sort({ order_index: 1 });

                    if (!currentStage) continue;

                    // Kiểm tra xem user đã cập nhật progress hôm nay chưa
                    const todayProgress = await QuitProgress.findOne({
                        userId: plan.userId._id,
                        stageId: currentStage._id,
                        date: {
                            $gte: startOfDay,
                            $lte: endOfDay
                        }
                    });

                    // Nếu chưa cập nhật thì gửi email nhắc nhở
                    if (!todayProgress && plan.userId.email) {
                        await this.sendReminderEmail(plan.userId, currentStage);
                        console.log(`Sent reminder email to ${plan.userId.email}`);
                    }
                } catch (error) {
                    console.error(`Error processing plan ${plan._id}:`, error);
                }
            }
        } catch (error) {
            console.error('Error in sendDailyReminders:', error);
        }
    }

    // Hàm gửi email nhắc nhở
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
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/progress" 
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
}

module.exports = new QuitProgressService()