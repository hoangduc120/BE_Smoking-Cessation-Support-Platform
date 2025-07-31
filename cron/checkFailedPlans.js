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

    cron.schedule('*/10 * * * * ', async () => {
        try {
            await quitProgressService.checkFailedPlans();
        } catch (error) {
            console.error('❌ Error in test failed plans check:', error);
        }
    });

};

const runManualFailedPlansCheck = async () => {
    try {
        await quitProgressService.checkFailedPlans();
        console.log('Manual failed plans check completed');
        return true;
    } catch (error) {
        console.error('Manual failed plans check failed:', error);
        return false;
    }
};

module.exports = {
    startFailedPlansChecker,
    runManualFailedPlansCheck
}; 