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

            // Check if user meets check-in requirement (75%)
            const meetsCheckInRequirement = completionPercentage >= 75;

            if (!meetsCheckInRequirement) {
                return; // Don't complete if check-in requirement not met
            }

            // Check cigarettes target - get latest progress entry
            const latestProgress = await QuitProgress.findOne({
                userId,
                stageId
            }).sort({ date: -1 });

            let meetsCigaretteTarget = true;

            // If there's a target and latest progress exists, check if cigarettes smoked meets target
            if (stage.targetCigarettesPerDay !== undefined && latestProgress) {
                meetsCigaretteTarget = latestProgress.cigarettesSmoked <= stage.targetCigarettesPerDay;
            }

            // Complete stage only if both conditions are met
            if (meetsCheckInRequirement && meetsCigaretteTarget) {
                await quitPlanService.completeStage(stageId, userId);
                console.log(`Stage ${stageId} completed: Check-in: ${completionPercentage.toFixed(1)}%, Cigarettes: ${latestProgress?.cigarettesSmoked || 0}/${stage.targetCigarettesPerDay}`);
            } else {
                console.log(`Stage ${stageId} not completed: Check-in: ${completionPercentage.toFixed(1)}% (${meetsCheckInRequirement ? 'OK' : 'NOT OK'}), Cigarettes: ${latestProgress?.cigarettesSmoked || 0}/${stage.targetCigarettesPerDay} (${meetsCigaretteTarget ? 'OK' : 'NOT OK'})`);
            }
        } catch (error) {
            console.error('Error in checkAndCompleteStage:', error);
        }
    }

    async checkFailedPlans() {
        try {
            const ongoingPlans = await QuitPlan.find({ status: "ongoing" });

            let processedCount = 0;
            let failedPlanCount = 0;
            let completedStageCount = 0;

            for (const plan of ongoingPlans) {
                try {
                    const result = await this.checkPlanForFailure(plan._id, plan.userId);
                    if (result.planFailed) {
                        failedPlanCount++;
                    }
                    if (result.stagesCompleted > 0) {
                        completedStageCount += result.stagesCompleted;
                    }
                    processedCount++;
                } catch (error) {
                    console.error(`Error checking plan ${plan._id}:`, error.message);
                }
            }
        } catch (error) {
            console.error('Error in checkFailedPlans:', error);
        }
    }

    async checkPlanForFailure(planId, userId) {
        try {
            const stages = await QuitPlanStage.find({
                quitPlanId: planId
            }).sort({ order_index: 1 });

            const currentDate = new Date();
            let stagesCompleted = 0;
            let planShouldFail = false;
            let failReason = '';

            // Kiểm tra từng stage
            for (const stage of stages) {
                if (stage.completed) continue;

                const totalDays = stage.duration;
                const checkInCount = await QuitProgress.countDocuments({
                    userId,
                    stageId: stage._id
                });

                const completionPercentage = (checkInCount / totalDays) * 100;

                const latestProgress = await QuitProgress.findOne({
                    userId,
                    stageId: stage._id
                }).sort({ date: -1 });

                const isStageExpired = stage.end_date && currentDate > new Date(stage.end_date);

                const meetsCheckInRequirement = completionPercentage >= 75;
                let meetsCigaretteTarget = true;

                if (stage.targetCigarettesPerDay !== undefined && latestProgress) {
                    meetsCigaretteTarget = latestProgress.cigarettesSmoked <= stage.targetCigarettesPerDay;
                }

                if (meetsCheckInRequirement && meetsCigaretteTarget) {
                    await quitPlanService.completeStage(stage._id, userId);
                    stagesCompleted++;
                    continue;
                }

                if (isStageExpired) {
                    const daysPastExpiry = Math.floor((currentDate - new Date(stage.end_date)) / (1000 * 60 * 60 * 24));

                    // Fail nếu stage hết hạn > 3 ngày mà check-in < 50%
                    if (daysPastExpiry > 3 && completionPercentage < 50) {
                        planShouldFail = true;
                        failReason = `Stage "${stage.stage_name}" expired ${daysPastExpiry} days ago with only ${completionPercentage.toFixed(1)}% check-in rate (minimum 50% required)`;
                        break;
                    }

                    // Fail nếu stage hết hạn > 7 ngày mà check-in < 75%
                    if (daysPastExpiry > 7 && completionPercentage < 75) {
                        planShouldFail = true;
                        failReason = `Stage "${stage.stage_name}" expired ${daysPastExpiry} days ago with only ${completionPercentage.toFixed(1)}% check-in rate (75% required for completion)`;
                        break;
                    }
                }

                // 2. Kiểm tra cigarette target failure
                if (latestProgress && stage.targetCigarettesPerDay !== undefined) {
                    // Đếm số ngày liên tiếp vượt target trong 7 ngày gần nhất
                    const last7DaysProgress = await QuitProgress.find({
                        userId,
                        stageId: stage._id,
                        date: {
                            $gte: new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000)
                        }
                    }).sort({ date: -1 });

                    const exceededTargetDays = last7DaysProgress.filter(p =>
                        p.cigarettesSmoked > stage.targetCigarettesPerDay
                    ).length;

                    // Fail nếu vượt target > 5 ngày trong 7 ngày gần nhất
                    if (exceededTargetDays > 5) {
                        planShouldFail = true;
                        failReason = `Exceeded cigarette target (${stage.targetCigarettesPerDay}/day) for ${exceededTargetDays} out of last 7 days in stage "${stage.stage_name}"`;
                        break;
                    }
                }

                // 3. Kiểm tra không có progress entry quá lâu
                const lastProgressDate = latestProgress ? new Date(latestProgress.date) : null;
                if (lastProgressDate) {
                    const daysSinceLastProgress = Math.floor((currentDate - lastProgressDate) / (1000 * 60 * 60 * 24));

                    // Fail nếu không có progress > 10 ngày
                    if (daysSinceLastProgress > 10) {
                        planShouldFail = true;
                        failReason = `No progress updates for ${daysSinceLastProgress} days (maximum 10 days allowed without updates)`;
                        break;
                    }
                } else {
                    // Nếu stage đã bắt đầu > 5 ngày mà chưa có progress nào
                    if (stage.start_date) {
                        const daysSinceStageStart = Math.floor((currentDate - new Date(stage.start_date)) / (1000 * 60 * 60 * 24));
                        if (daysSinceStageStart > 5) {
                            planShouldFail = true;
                            failReason = `No progress entries for ${daysSinceStageStart} days since stage "${stage.stage_name}" started`;
                            break;
                        }
                    }
                }
            }

            // Thực hiện fail plan nếu cần
            if (planShouldFail) {
                await quitPlanService.failQuitPlan(planId, userId);
                try {
                    await this.sendPlanFailureNotification(userId, planId, failReason);
                } catch (emailError) {
                    console.error('Failed to send plan failure notification:', emailError.message);
                }
                return { planFailed: true, stagesCompleted, failReason };
            }
            return { planFailed: false, stagesCompleted };
        } catch (error) {
            return { planFailed: false, stagesCompleted: 0 };
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

            // Check cigarette target compliance
            const latestProgress = await QuitProgress.findOne({
                userId,
                stageId
            }).sort({ date: -1 });

            const meetsCheckInRequirement = completionPercentage >= 75;
            let meetsCigaretteTarget = true;

            if (stage.targetCigarettesPerDay !== undefined && latestProgress) {
                meetsCigaretteTarget = latestProgress.cigarettesSmoked <= stage.targetCigarettesPerDay;
            }

            const canCompleteStage = meetsCheckInRequirement && meetsCigaretteTarget;

            return {
                stage: stage,
                totalDays,
                checkInCount: checkInCount,
                remainingCheckIns: Math.max(0, totalDays - checkInCount),
                completionPercentage: completionPercentage,
                isCompleted: stage.completed,
                stageStatus: stageStatus,
                canComplete: canCompleteStage,
                checkInsRequiredForCompletion: checkInsRequiredForCompletion,
                checkInsUntilCanComplete: checkInsUntilCanComplete,
                progressEntries,
                checkInRate: `${checkInCount}/${totalDays}`,
                successThreshold: '75%',
                isEligibleForCompletion: checkInCount >= checkInsRequiredForCompletion,
                cigaretteTargetInfo: {
                    targetCigarettesPerDay: stage.targetCigarettesPerDay,
                    latestCigarettesSmoked: latestProgress?.cigarettesSmoked || null,
                    meetsCigaretteTarget: meetsCigaretteTarget,
                    hasProgressEntries: !!latestProgress
                },
                completionRequirements: {
                    checkInRequirement: {
                        met: meetsCheckInRequirement,
                        current: completionPercentage,
                        required: 75
                    },
                    cigaretteRequirement: {
                        met: meetsCigaretteTarget,
                        current: latestProgress?.cigarettesSmoked || null,
                        target: stage.targetCigarettesPerDay
                    }
                }
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
                            <a href="${process.env.FRONTEND_URL || 'https://smoking-cessation-support-platform-liart.vercel.app'}/progress" 
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

    async sendPlanFailureNotification(userId, planId, failReason) {
        try {
            const user = await User.findById(userId);
            const plan = await QuitPlan.findById(planId)
                .populate('coachId', 'userName email');

            if (!user || !user.email || !plan) {
                console.log('Cannot send failure notification: missing user email or plan data');
                return;
            }

            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a5a 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">😔 Kế hoạch bỏ thuốc đã bị tạm dừng</h1>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-top: 20px;">
                        <h2 style="color: #333; margin-top: 0;">Xin chào ${user.userName}!</h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.6;">
                            Chúng tôi rất tiếc phải thông báo rằng kế hoạch bỏ thuốc "<strong>${plan.title}</strong>" của bạn đã bị tạm dừng do không đạt được các yêu cầu cần thiết.
                        </p>

                        <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f44336;">
                            <h3 style="color: #d32f2f; margin-top: 0;">📋 Lý do tạm dừng:</h3>
                            <p style="color: #666; margin-bottom: 0; font-style: italic;">${failReason}</p>
                        </div>

                        <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <h3 style="color: #1976d2; margin-top: 0;">💪 Đừng nản chí!</h3>
                            <p style="color: #666; margin-bottom: 10px;">Bỏ thuốc lá là một hành trình không dễ dàng. Việc này không có nghĩa là bạn đã thất bại hoàn toàn:</p>
                            <ul style="color: #666; margin-bottom: 0;">
                                <li>Bạn có thể bắt đầu lại với một kế hoạch mới</li>
                                <li>Hãy xem xét lại các thói quen và điều chỉnh kế hoạch</li>
                                <li>Tìm kiếm sự hỗ trợ từ coach hoặc cộng đồng</li>
                                <li>Mỗi lần thử lại đều giúp bạn học hỏi và mạnh mẽ hơn</li>
                            </ul>
                        </div>

                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'https://smoking-cessation-support-platform-liart.vercel.app'}/quit-plans" 
                               style="background: linear-gradient(135deg, #4caf50 0%, #45a049 100%); 
                                      color: white; 
                                      padding: 15px 30px; 
                                      text-decoration: none; 
                                      border-radius: 25px; 
                                      font-weight: bold; 
                                      display: inline-block;
                                      box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);">
                                🔄 Bắt đầu kế hoạch mới
                            </a>
                        </div>

                        ${plan.coachId ? `
                            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <h4 style="color: #333; margin-top: 0;">👨‍⚕️ Liên hệ Coach:</h4>
                                <p style="color: #666; margin-bottom: 0;">
                                    Coach <strong>${plan.coachId.userName}</strong> sẵn sàng hỗ trợ bạn lên kế hoạch mới phù hợp hơn.
                                    <br>Email: <a href="mailto:${plan.coachId.email}">${plan.coachId.email}</a>
                                </p>
                            </div>
                        ` : ''}
                    </div>

                    <div style="text-align: center; margin-top: 30px; color: #888; font-size: 14px;">
                        <p>Hãy nhớ rằng: "Thất bại là cơ hội để bắt đầu lại một cách thông minh hơn" 💪</p>
                        <p>Đội ngũ hỗ trợ bỏ thuốc lá</p>
                    </div>
                </div>
            `;

            await sendMail({
                email: user.email,
                subject: "😔 Kế hoạch bỏ thuốc đã bị tạm dừng - Hãy bắt đầu lại!",
                html: emailHtml
            });

            console.log(`✉️ Plan failure notification sent to ${user.email} for plan ${plan.title}`);
        } catch (error) {
            console.error('Error sending plan failure notification:', error);
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

            // Check cigarette target compliance
            const latestProgress = await QuitProgress.findOne({
                userId,
                stageId
            }).sort({ date: -1 });

            const meetsCheckInRequirement = completionPercentage >= requiredPercentage;
            let meetsCigaretteTarget = true;

            if (stage.targetCigarettesPerDay !== undefined && latestProgress) {
                meetsCigaretteTarget = latestProgress.cigarettesSmoked <= stage.targetCigarettesPerDay;
            }

            const canComplete = meetsCheckInRequirement && meetsCigaretteTarget;

            let reason;
            if (canComplete) {
                reason = 'Eligible for completion';
            } else {
                const reasons = [];
                if (!meetsCheckInRequirement) {
                    reasons.push(`Need ${Math.ceil(totalDays * 0.75) - checkInCount} more check-ins`);
                }
                if (!meetsCigaretteTarget) {
                    reasons.push(`Latest cigarettes smoked (${latestProgress?.cigarettesSmoked || 0}) exceeds target (${stage.targetCigarettesPerDay})`);
                }
                reason = reasons.join(' and ');
            }

            return {
                canComplete,
                checkInCount,
                totalDays,
                completionPercentage: Math.round(completionPercentage * 10) / 10,
                requiredPercentage,
                checkInsNeeded: Math.max(0, Math.ceil(totalDays * 0.75) - checkInCount),
                reason,
                requirements: {
                    checkIn: {
                        met: meetsCheckInRequirement,
                        current: completionPercentage,
                        required: requiredPercentage
                    },
                    cigarettes: {
                        met: meetsCigaretteTarget,
                        current: latestProgress?.cigarettesSmoked || null,
                        target: stage.targetCigarettesPerDay,
                        hasData: !!latestProgress
                    }
                }
            };
        } catch (error) {
            throw new Error(`Error checking stage completion eligibility: ${error.message}`);
        }
    }

    async getQuitProgressList(filters = {}, page = 1, limit = 10) {
        const query = {};

        if (filters.userId) {
            query.userId = filters.userId;
        }

        if (filters.stageId) {
            query.stageId = filters.stageId;
        }

        if (filters.date) {
            const startDate = new Date(filters.date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(filters.date);
            endDate.setHours(23, 59, 59, 999);

            query.date = {
                $gte: startDate,
                $lte: endDate
            };
        }

        const skip = (page - 1) * limit;

        const progresses = await QuitProgress.find(query)
            .populate('userId', 'userName email')
            .populate('stageId', 'stage_name description duration')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        const total = await QuitProgress.countDocuments(query);

        return {
            progresses,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        };
    }

    async getQuitProgressByStage(stageId, userId) {
        const progresses = await QuitProgress.find({
            stageId,
            userId
        })
            .populate('userId', 'userName email')
            .populate('stageId', 'stage_name description duration')
            .sort({ date: 1 }); // Sắp xếp theo ngày tăng dần

        const stage = await QuitPlanStage.findById(stageId);
        if (!stage) {
            throw new Error("Stage not found");
        }

        const totalDays = stage.duration;
        const checkInCount = progresses.length;
        const completionPercentage = (checkInCount / totalDays) * 100;

        // Check cigarette target compliance
        const latestProgress = progresses.length > 0 ? progresses[progresses.length - 1] : null;
        const meetsCheckInRequirement = completionPercentage >= 75;
        let meetsCigaretteTarget = true;

        if (stage.targetCigarettesPerDay !== undefined && latestProgress) {
            meetsCigaretteTarget = latestProgress.cigarettesSmoked <= stage.targetCigarettesPerDay;
        }

        const canCompleteStage = meetsCheckInRequirement && meetsCigaretteTarget;

        return {
            stage: {
                _id: stage._id,
                stage_name: stage.stage_name,
                description: stage.description,
                goal: stage.goal,
                targetCigarettesPerDay: stage.targetCigarettesPerDay,
                duration: stage.duration,
                completed: stage.completed
            },
            progresses,
            statistics: {
                totalDays,
                checkInCount,
                completionPercentage: Math.round(completionPercentage * 10) / 10,
                remainingCheckIns: Math.max(0, totalDays - checkInCount),
                canComplete: canCompleteStage,
                checkInsNeeded: Math.max(0, Math.ceil(totalDays * 0.75) - checkInCount),
                cigaretteTargetInfo: {
                    targetCigarettesPerDay: stage.targetCigarettesPerDay,
                    latestCigarettesSmoked: latestProgress?.cigarettesSmoked || null,
                    meetsCigaretteTarget: meetsCigaretteTarget,
                    hasProgressEntries: progresses.length > 0
                },
                completionRequirements: {
                    checkInRequirement: {
                        met: meetsCheckInRequirement,
                        current: completionPercentage,
                        required: 75
                    },
                    cigaretteRequirement: {
                        met: meetsCigaretteTarget,
                        current: latestProgress?.cigarettesSmoked || null,
                        target: stage.targetCigarettesPerDay
                    }
                }
            }
        };
    }
}

module.exports = new QuitProgressService()