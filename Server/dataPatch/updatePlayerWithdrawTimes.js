const dbconfig = require("../modules/dbproperties")

const playerCursor = dbconfig.collection_players.find({}).cursor();
let i = 0;
playerCursor.eachAsync(
    player => {
        let weekPeriods = sliceTimeFrameToWeekly(player.registrationTime);

        let proms = [];
        for (let i = 0; i < weekPeriods.length; i++) {
            let bonusAmountSumProm = dbconfig.collection_playerConsumptionRecord.aggregate([{
                $match: {
                    playerId: player._id,
                    createTime: {
                        $gte: weekPeriods[i].startTime,
                        $lt: weekPeriods[i].endTime
                    }
                }
            }, {
                $group: {
                    _id: null,
                    bonusAmount: {$sum: "$bonusAmount"}
                }
            }]).read("secondaryPreferred");
            proms.push(bonusAmountSumProm);
        }

        return Promise.all(proms).then(
            bonusAmounts => {
                if (!bonusAmounts || !bonusAmounts[0]) {
                    return;
                }

                let totalBonusAmount = 0;

                for (let i = 0; i < bonusAmounts.length; i++) {
                    let bonusObj = bonusAmounts[i];
                    if (bonusObj && bonusObj[0] && bonusObj[0].bonusAmount) {
                        console.log(bonusObj);
                        let bonus = bonusObj[0].bonusAmount;
                        totalBonusAmount += bonus;
                    }
                }

                return dbconfig.collection_players.update({
                    _id: player._id,
                    platform: player.platform
                }, {
                    bonusAmountSum: totalBonusAmount
                });
            }
        ).then(
            data => {
                console.log('index', i);
                i++;
            }
        );
    }
);


function sliceTimeFrameToWeekly(startTime, endTime) {
    startTime = new Date(startTime) || new Date();
    endTime = endTime ? new Date(endTime) : new Date();

    let periods = [];
    let endTimeReached = false;
    let currentStartTime = startTime;

    while (!endTimeReached) {
        let periodStartTime = new Date(currentStartTime);
        let periodEndTime = new Date(currentStartTime).setDate(currentStartTime.getDate() + 7);
        if (periodEndTime >= endTime) {
            periodEndTime = endTime;
            endTimeReached = true;
        }

        let period = {
            startTime: new Date(periodStartTime),
            endTime: new Date(periodEndTime)
        };

        periods.push(period);
        currentStartTime = new Date(periodEndTime);
    }

    return periods;
}