const cron = require('node-cron');
const quitProgressService = require('../services/quitProgress.service');

const startFailedPlansChecker = () => {
    cron.schedule('0 0 * * *', async () => {
        console.log('Checking for failed quit plans...');
        try {
            await quitProgressService.checkFailedPlans();
            console.log('Failed plans check completed');
        } catch (error) {
            console.error('Error checking failed plans:', error);
        }
    });

    cron.schedule('0 */6 * * *', async () => {
        console.log('🔍 Regular check for failed quit plans...');
        try {
            await quitProgressService.checkFailedPlans();
            console.log('Regular failed plans check completed');
        } catch (error) {
            console.error('Error in regular failed plans check:', error);
        }
    });
};

module.exports = { startFailedPlansChecker }; 