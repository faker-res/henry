"use strict";
let dbPlayerConsumptionHourSummaryFunc = function () {
};
module.exports = new dbPlayerConsumptionHourSummaryFunc();

const dbconfig = require('./../modules/dbproperties');

const dbPlayerConsumptionHourSummary = {
    updateSummary: (platformObjId, playerObjId, providerObjId, createTime, amount, validAmount, bonusAmount, times) => {
        let startTime = new Date(createTime);
        startTime.setMinutes(0);
        startTime.setSeconds(0);
        startTime.setMilliseconds(0);
        return dbconfig.collection_playerConsumptionHourSummary.findOneAndUpdate(
            {platform: platformObjId, player: playerObjId, provider: providerObjId, startTime: startTime},
            {$inc: {consumptionAmount: amount, consumptionValidAmount: validAmount, consumptionBonusAmount: bonusAmount, consumptionTimes: times}},
            {upsert: true, new: true}
        ).lean().then(
            summary => {
                // console.log('playerConsumptionHourSummary', summary.playerObjId, summary.createTime, summary.amount, summary.validAmount, summary.bonusAmount, summary.times);
                return summary;
            }
        );
    },

    setWinnerMonitorConfig: (platformObjId, winnerMonitorData) => {
        if (!(winnerMonitorData instanceof Array)) {
            return [];
        }
        let proms = [];
        for (let i = 0; i < winnerMonitorData.length; i++) {
            let providerConfig = winnerMonitorData[i];
            if (!providerConfig || !providerConfig.providerObjId) {
                continue;
            }

            providerConfig.companyWinRatio = providerConfig.companyWinRatio || 0;
            providerConfig.playerWonAmount = providerConfig.playerWonAmount || 0;
            providerConfig.consumptionTimes = providerConfig.consumptionTimes || 0;

            let prom = dbconfig.collection_winnerMonitorConfig.findOneAndUpdate(
                {
                    platform: platformObjId,
                    provider: providerConfig.providerObjId
                },
                {
                    companyWinRatio: providerConfig.companyWinRatio,
                    playerWonAmount: providerConfig.playerWonAmount,
                    consumptionTimes: providerConfig.consumptionTimes,
                },
                {
                    upsert: true,
                    new: true
                }
            ).lean();
            proms.push(prom);
        }

        return Promise.all(proms);
    },

    getWinnerMonitorConfig: (platformObjId) => {
        return dbconfig.collection_winnerMonitorConfig.find({platform: platformObjId}).lean();
    },

    // getWinnerMonitorData: (platformObjId, startTime, endTime, providerObjId, playerName) => {
    //
    // },
};

let proto = dbPlayerConsumptionHourSummaryFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionHourSummary);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionHourSummary;
