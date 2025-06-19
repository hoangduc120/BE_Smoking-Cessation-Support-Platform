const cron = require('node-cron');
const quitProgressService = require('../services/quitProgress.service');

const startDailyReminders = () => {
    cron.schedule('0 20 * * *', async () => {
        console.log('Starting daily health reminders at 20:00...');
        try {
            await quitProgressService.sendDailyReminders();
            console.log('Daily reminders sent successfully');
        } catch (error) {
            console.error('Error sending daily reminders:', error);
        }
    }, {
        timezone: "Asia/Ho_Chi_Minh"
    });

};

module.exports = { startDailyReminders }; 