const constRewardPeriod = require('./../const/constRewardPeriod');

const dbconfig = require('./../modules/dbproperties');
const dbUtil = require('./../modules/dbutility');

const dbRewardUtility = {
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