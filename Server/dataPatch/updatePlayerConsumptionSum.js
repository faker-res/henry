/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

const Q = require("q");
const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");

const cursor = dbconfig.collection_players.find({}).cursor();

var i = 0;
cursor.eachAsync(
    playerData => {
        return dbconfig.collection_playerConsumptionRecord.aggregate(
            {
                $match: {
                    playerId: playerData._id,
                    platformId: playerData.platform
                }
            },
            {
                $group: {
                    _id: "$playerId",
                    consumptionTimes: {$sum: 1},
                    totalAmount: {$sum: "$validAmount"}
                }
            }
        ).then(
            consumptionData => {
                if(consumptionData && consumptionData[0]){
                    playerData.consumptionTimes = consumptionData[0].consumptionTimes;
                    playerData.consumptionSum = consumptionData[0].totalAmount;
                    playerData.dailyConsumptionSum = 0;
                    playerData.weeklyConsumptionSum = 0;
                    playerData.pastMonthConsumptionSum = 0;
                    i++;
                    console.log(i, playerData.playerId, playerData.name);
                    return playerData.save();
                }
            }
        );
    }
);

