const dbUtil = require('./../modules/dbutility');

const dbRewardUtility = {

    getRewardEventIntervalTime: (rewardData, eventData) => {
        let todayTime = rewardData.applyTargetDate ? dbUtil.getTargetSGTime(rewardData.applyTargetDate) : dbUtil.getTodaySGTime();
        let intervalTime;

        if (eventData.condition.interval) {
            switch (eventData.condition.interval) {
                case "1":
                    intervalTime = todayTime;
                    break;
                case "2":
                    intervalTime = rewardData.applyTargetDate ? dbUtil.getWeekTime(rewardData.applyTargetDate) : dbUtil.getCurrentWeekSGTime();
                    break;
                case "3":
                    intervalTime = rewardData.applyTargetDate ? dbUtil.getBiWeekSGTIme(rewardData.applyTargetDate) : dbUtil.getCurrentBiWeekSGTIme();
                    break;
                case "4":
                    intervalTime = rewardData.applyTargetDate ? dbUtil.getMonthSGTIme(rewardData.applyTargetDate) : dbUtil.getCurrentMonthSGTIme();
                    break;
                default:
                    if (eventData.validStartTime && eventData.validEndTime) {
                        intervalTime = {startTime: eventData.validStartTime, endTime: eventData.validEndTime};
                    }
                    break;
            }
        }

        return intervalTime;
    },

    /**
     *
     * @param period - refer constRewardPeriod
     * @returns {Query}
     */
    getConsumptionReturnPeriodTime: (period) => {
        let intervalTime;
        if (period) {
            switch (period) {
                case "1":
                    intervalTime = dbUtil.getYesterdayConsumptionReturnSGTime();
                    break;
                case "2":
                    intervalTime = dbUtil.getLastWeekConsumptionReturnSGTime();
                    break;
                case "3":
                    intervalTime = dbUtil.getLastBiWeekConsumptionReturnSGTime();
                    break;
                case "4":
                    intervalTime = dbUtil.getLastMonthConsumptionReturnSGTime();
                    break;
                default:
                    // No interval time. Will return undefined
                    break;
            }
        }

        return intervalTime;
    }
};

module.exports = dbRewardUtility;