const cron = require('node-cron');
const UserMembership = require('../models/userMemberShip.model');

class MembershipScheduler {

    static async updateExpiredMemberships() {
        try {

            const result = await UserMembership.updateMany(
                {
                    paymentStatus: 'paid',
                    endDate: { $lt: new Date() }
                },
                {
                    paymentStatus: 'expired'
                }
            );

            if (result.modifiedCount > 0) {
            }

            return result;
        } catch (error) {
            console.error('Lỗi khi cập nhật trạng thái membership:', error.message);
            throw error;
        }
    }

    static async getExpiringSoonMemberships() {
        try {
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

            const expiringSoon = await UserMembership.find({
                paymentStatus: 'paid',
                endDate: {
                    $gte: new Date(),
                    $lte: sevenDaysFromNow
                }
            }).populate('userId memberShipPlanId');

            if (expiringSoon.length > 0) {
                expiringSoon.forEach(membership => {
                    const daysLeft = Math.ceil((membership.endDate - new Date()) / (1000 * 60 * 60 * 24));
                });
            }

            return expiringSoon;
        } catch (error) {
            console.error('Lỗi khi lấy danh sách membership sắp hết hạn:', error.message);
            throw error;
        }
    }

    static async getMembershipStats() {
        try {
            const stats = await UserMembership.aggregate([
                {
                    $group: {
                        _id: '$paymentStatus',
                        count: { $sum: 1 }
                    }
                }
            ]);

            stats.forEach(stat => {
            });

            return stats;
        } catch (error) {
            console.error('Lỗi khi lấy thống kê membership:', error.message);
            throw error;
        }
    }
    static initScheduler() {
        // Kiểm tra mỗi ngày lúc 00:00
        cron.schedule('0 0 * * *', async () => {
            try {
                await this.updateExpiredMemberships();
                await this.getExpiringSoonMemberships();
                await this.getMembershipStats();
            } catch (error) {
                console.error('Lỗi trong daily membership task:', error.message);
            }
        });

        cron.schedule('0 * * * *', async () => {
            try {
                await this.updateExpiredMemberships();
            } catch (error) {
                console.error('Lỗi trong hourly membership task:', error.message);
            }
        });
    }

    static async runImmediateCheck() {
        try {
            await this.updateExpiredMemberships();
            await this.getExpiringSoonMemberships();
            await this.getMembershipStats();
        } catch (error) {
            console.error('Lỗi khi chạy kiểm tra ngay lập tức:', error.message);
        }
    }
}

module.exports = MembershipScheduler; 