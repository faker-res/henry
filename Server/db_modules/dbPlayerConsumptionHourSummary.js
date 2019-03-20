"use strict";
let dbPlayerConsumptionHourSummaryFunc = function () {
};
module.exports = new dbPlayerConsumptionHourSummaryFunc();

const dbconfig = require('./../modules/dbproperties');

const dbPlayerConsumptionHourSummary = {
    updateSummary: (platformObjId, playerObjId, createTime, amount, validAmount, bonusAmount, times) => {
        let startTime = new Date(createTime);
        startTime.setMinutes(0);
        startTime.setSeconds(0);
        startTime.setMilliseconds(0);
        return dbconfig.collection_playerConsumptionHourSummary.findOneAndUpdate(
            {platform: platformObjId, player: playerObjId, startTime},
            {$inc: {consumptionAmount: amount, consumptionValidAmount: validAmount, consumptionBonusAmount: bonusAmount, consumptionTimes: times}},
            {upsert: true, new: true}
        ).lean().then(
            summary => {
                // console.log('playerConsumptionHourSummary', summary.playerObjId, summary.createTime, summary.amount, summary.validAmount, summary.bonusAmount, summary.times);
                return summary;
            }
        );
    },
};

let proto = dbPlayerConsumptionHourSummaryFunc.prototype;
proto = Object.assign(proto, dbPlayerConsumptionHourSummary);

// This make WebStorm navigation work
module.exports = dbPlayerConsumptionHourSummary;
