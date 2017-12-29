const constRewardPeriod = require('./../const/constRewardPeriod');

const dbconfig = require('./../modules/dbproperties');
const dbUtil = require('./../modules/dbutility');

const dbRewardUtility = {
    /**
     *
     * @param period - refer constRewardPeriod
     * @returns {Query}
     */
    getRewardPeriodTime: (period) => {
        let intervalTime;
        if (period) {
            switch (period) {
                case "1":
                    intervalTime = dbUtil.getTodaySGTime();
                    break;
                case "2":
                    intervalTime = dbUtil.getCurrentWeekSGTime();
                    break;
                case "3":
                    intervalTime = dbUtil.getCurrentBiWeekSGTIme();
                    break;
                case "4":
                    intervalTime = dbUtil.getCurrentMonthSGTIme();
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