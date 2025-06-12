const cron = require('node-cron');
const quitProgressService = require('../services/quitProgress.service');

const startFailedPlansChecker = () => {
    cron.schedule('0 0 * * *', async () => {
        try {
            await quitProgressService.checkFailedPlans();
        } catch (error) {
            console.error('Error checking failed plans:', error);
        }
    });

    cron.schedule('0 */6 * * *', async () => {
        try {
            await quitProgressService.checkFailedPlans();
        } catch (error) {
            console.error('Error in regular failed plans check:', error);
        }
    });
};

module.exports = { startFailedPlansChecker }; 