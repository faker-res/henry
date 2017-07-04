var db = db.getSiblingDB("admindb");

//todo::refactor code here
db.rewardType.remove({});
db.rewardParam.remove({});
db.rewardCondition.remove({});
db.rewardRule.remove({});
db.rewardEvent.remove({});
db.rewardTask.remove({});

//daily consecutive top up
//var type1 = "ConsecutiveTopUp";
//db.rewardParam.insert({"name": type1, params:{
//    numOfDays: {type: "Number", des: "No of consecutive top up days"},
//    minAmount: {type: "Number", des: "Minimum top up amount"},
//    rewardAmount: {type: "Number", des: "Reward amount"},
//    spendingAmount: {type: "Number", des: "Minimum spending amount for reward task"}
//}});
//
//var param1Cursor = db.rewardParam.find({"name": type1});
//var param1 = param1Cursor.next();
//
//db.rewardType.insert({"name": type1, params: param1._id, des: "Consecutive Top Up"});

//full attendance
var type2 = "FullAttendance";
db.rewardParam.insert({
    "name": type2, params: {

        checkTopUp: {type: "Boolean", des: "Check player top up"},
        numOfTopUpDays: {type: "Number", des: "No of top up days"},
        minTopUpAmount: {type: "Number", des: "Minimum top up amount"},

        checkConsumption: {type: "Boolean", des: "Check player consumption"},
        numOfConsumeDays: {type: "Number", des: "No of consumption days"},
        minConsumeAmount: {type: "Number", des: "Minimum consumption amount"},

        //'and' or 'or' condition for top up and consumption
        //true => and, false => or
        andTopUpConsume: {type: "Boolean", des: "And condition for top up and consumption"},

        //if no provider, means all
        //for each element in the array, the data should be {providerObjId:xxxxx, games: ['gameObjId1', 'gameObjId2']}
        providers: {type: "Array", des: "target game providers and games"},

        //and or or condition for provider check
        //true => and, false => or
        andProvider: {type: "Boolean", des: "And or or condition for game provider check"},

        rewardAmount: {type: "Number", des: "Reward amount"},
        spendingAmount: {type: "Number", des: "Minimum spending amount to unlock reward task"}
    }
});

var param2Cursor = db.rewardParam.find({"name": type2});
var param2 = param2Cursor.next();

db.rewardType.insert({"name": type2, params: param2._id, des: "Full Attendance"});

//player weekly consumption return
var type3 = "PlayerConsumptionReturn";
db.rewardParam.insert({
    "name": type3, params: {
        ratio: {
            type: "Table",
            data: {
                Normal: {
                    Casual: 0.02,
                    Card: 0.03,
                    Sports: 0.04
                },
                VIP: {
                    Casual: 0.03,
                    Card: 0.04,
                    Sports: 0.05
                },
                Diamond: {
                    Casual: 0.04,
                    Card: 0.05,
                    Sports: 0.06
                }
            },
            des: "Return ratio for weekly total consumption"
        }
    }
});

var param3Cursor = db.rewardParam.find({"name": type3});
var param3 = param3Cursor.next();

db.rewardType.insert({"name": type3, params: param3._id, des: "Player Consumption Return"});


//Game Provider Reward
var type4 = "GameProviderReward";
db.rewardParam.insert({
    "name": type4, params: {
        rewardPercentage: {type: "Percentage", des: "Reward percentage"},
        spendingPercentage: {type: "Percentage", des: "Minimum spending amount to unlock reward task"},
        provider: {type: "DBString", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        games: {type: "DBArray", action: "getGamesByProviderId", field: "name", des: "Games"}
    }
});

var param4Cursor = db.rewardParam.find({"name": type4});
var param4 = param4Cursor.next();

db.rewardType.insert({"name": type4, params: param4._id, des: "Game Provider Reward"});


//Player first top up reward
var type5 = "FirstTopUp";
db.rewardParam.insert({
    "name": type5, params: {
        periodType: {type: "Number", des: "Reward period"}, //0: First time, 1: week, 2: month
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBString", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        //games: {type: "DBArray", action:"getGamesByProviderId", field: "name", des: "Games"},
        reward: {
            type: "Table",
            data: {
                rewardPercentage: {type: "Percentage", des: "Reward percentage"},
                spendingTimes: {type: "Number", des: "Consumption amount times"},
                maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
                minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
            },
            des: "Reward parameter for each level"
        },
    }
});

var param5Cursor = db.rewardParam.find({"name": type5});
var param5 = param5Cursor.next();

db.rewardType.insert({"name": type5, params: param5._id, des: "Player First Time Top Up"});

// Transaction
var type6 = "PlatformTransactionReward";
db.rewardParam.insert({
    "name": type6, params: {
        rewardPercentage: {type: "Percentage", des: "Reward percentage"},
        playerLevel: {type: "DBString", action: "getPlayerLevelByPlatformId", field: "name", des: "Base Player Level"},
        bankCardType: {type: "Array", des: "Bank Card Type"},
        maxRewardAmountPerDay: {type: "Number", des: "Max reward amount per day"}
    }
});
var param6Cursor = db.rewardParam.find({"name": type6});
var param6 = param6Cursor.next();

db.rewardType.insert({"name": type6, params: param6._id, des: "Platform Transaction Reward"});

// partner consumption return
var type7 = "PartnerConsumptionReturn";

db.rewardCondition.insert({
    "name": type7,
    condition: {
        partnerLevel: {type: "DBString", action: "partnerLevel/getByPlatform", field: "name", des: "Partner Level"}
    }
});
var con7Cursor = db.rewardCondition.find({"name": type7});
var cond7 = con7Cursor.next();

db.rewardParam.insert({
    "name": type7,
    params: {
        rewardPercentage: {
            type: "Table",
            des: "Reward percentage",
            data: {
                Normal: {
                    Casual: 0.02,
                    Card: 0.03,
                    Sports: 0.04
                },
                VIP: {
                    Casual: 0.03,
                    Card: 0.04,
                    Sports: 0.05
                },
                Diamond: {
                    Casual: 0.04,
                    Card: 0.05,
                    Sports: 0.06
                }
            }
        }
    }
});
var param7Cursor = db.rewardParam.find({"name": type7});
var param7 = param7Cursor.next();

db.rewardType.insert({
    "name": type7,
    params: param7._id,
    condition: cond7._id,
    des: "Partner Weekly Consumption Return Reward"
});

// Partner Referral Reward
var type8 = "PartnerReferralReward";
db.rewardCondition.insert({
    "name": type8,
    condition: {
        partnerLevel: {type: "DBString", action: "partnerLevel/getByPlatform", field: "name", des: "Partner Level"},
        numOfEntries: {type: "Number", des: "Number of entries"}
    }
});
var condition8Cursor = db.rewardCondition.find({"name": type8});
var condition8 = condition8Cursor.next();
db.rewardParam.insert({
    "name": type8,
    params: {
        rewardAmount: {
            type: "Array",
            des: "Reward amount",
            data: [5, 10, 20, 40, 100]
        }
    }
});
var param8Cursor = db.rewardParam.find({"name": type8});
var param8 = param8Cursor.next();

db.rewardType.insert({"name": type8, params: param8._id, condition: condition8._id, des: "Partner Referral Reward"});

// Partner Incentive Reward
var type9 = "PartnerIncentiveReward";
db.rewardCondition.insert({
    "name": type9, condition: {
        partnerLevel: {type: "DBString", action: "partnerLevel/getByPlatform", field: "name", des: "Partner Level"},
        validConsumptionSum: {type: "Number", des: "Consumption Sum"}, // referred to the consumptionSum in "partnerWeekSummary" collection
        rewardAmount: {type: "Number", des: "Reward amount"}
    }
});

var condition2Cursor = db.rewardCondition.find({"name": type9});
var condition2 = condition2Cursor.next();

db.rewardType.insert({"name": type9, condition: condition2._id, des: "Partner Incentive Reward"});

//Player top up return reward
var type10 = "PlayerTopUpReturn";
db.rewardParam.insert({
    "name": type10, params: {
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        //games: {type: "DBArray", action:"getGamesByProviderId", field: "name", des: "Games"},
        useConsumption: {type: "Boolean", des: "If use consumption record"},
        reward: {
            type: "Table",
            data: {
                rewardPercentage: {type: "Percentage", des: "Reward percentage"},
                spendingTimes: {type: "Number", des: "Consumption amount times"},
                maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
                minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
                maxDailyRewardAmount: {type: "Number", des: "Maximum daily reward amount"}
            },
            des: "Reward parameter for each level"
        }
    }
});

var param10Cursor = db.rewardParam.find({"name": type10});
var param10 = param10Cursor.next();

db.rewardType.insert({"name": type10, params: param10._id, des: "Player Top Up Return"});

//Player Consumption incentive
var type11 = "PlayerConsumptionIncentive";
db.rewardParam.insert({
    "name": type11, params: {
        needApply: {type: "Boolean", des: "If this reward requires player application"},
        useConsumption: {type: "Boolean", des: "If use consumption record"},
        reward: {
            type: "Table",
            data: {
                rewardPercentage: {type: "Percentage", des: "Reward percentage"},
                spendingTimes: {type: "Number", des: "Consumption amount times"},
                minRewardAmount: {type: "Number", des: "Minimal reward amount"},
                maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
                //minConsumptionAmount: {type: "Number", des: "Minimal total consumption amount"},
                minTopUpRecordAmount: {type: "Number", des: "Minimal top up amount each time"},
                maxPlayerCredit: {type: "Number", des: "Maximum player credit"}
            },
            des: "Reward parameter for each level"
        }
    }
});

var param11Cursor = db.rewardParam.find({"name": type11});
var param11 = param11Cursor.next();

db.rewardType.insert({"name": type11, params: param11._id, des: "Player Consumption Incentive"});

//Partner top up return reward
var type12 = "PartnerTopUpReturn";
db.rewardParam.insert({
    "name": type12, params: {
        reward: {
            type: "Table",
            data: {
                rewardPercentage: {type: "Percentage", des: "Reward percentage"},
                maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
                minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
            },
            des: "Reward parameter for each level"
        }
    }
});

var param12Cursor = db.rewardParam.find({"name": type12});
var param12 = param12Cursor.next();

db.rewardType.insert({"name": type12, params: param12._id, des: "Partner Top Up Return"});

//Player top up reward
var type13 = "PlayerTopUpReward";
db.rewardParam.insert({
    "name": type13, params: {
        reward: {
            minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
            rewardAmount: {type: "Number", des: "Reward amount"},
            maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
            unlockTimes: {type: "Number", des: "Unlock times"}
        }
    }
});

var param13Cursor = db.rewardParam.find({"name": type13});
var param13 = param13Cursor.next();

db.rewardType.insert({"name": type13, params: param13._id, des: "Player Top Up Reward"});

//Player referral reward
var type14 = "PlayerReferralReward";
db.rewardParam.insert({
    "name": type14, params: {
        reward: {
            minTopUpAmount: {type: "Number", des: "Minimal top up amount"},     //本身充值限额
            validTopUpDays: {type: "Number", des: "Valid top up days"},         //充值有效天数
            validTopUpAmount: {type: "Number", des: "Valid top up amount"},     //充值最小限额
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},   //奖励比例
            maxRewardAmount: {type: "Number", des: "Maximum reward amount per player"},    //每个推荐人最大奖励限额
            expirationDays: {type: "Number", des: "Expeiration days"}           //推荐人有效期
        }
    }
});

var param14Cursor = db.rewardParam.find({"name": type14});
var param14 = param14Cursor.next();

db.rewardType.insert({"name": type14, params: param14._id, des: "Player Referral Reward"});

//Player registration reward
var type16 = "PlayerRegistrationReward";
db.rewardParam.insert({
    "name": type16, params: {
        rewardAmount: {type: "Number", des: "Reward amount"},                           //奖励金额
        unlockBonusAmount: {type: "Number", des: "Required unlock bonus amount"}        //解锁目标金额
    }
});

var param16Cursor = db.rewardParam.find({"name": type16});
var param16 = param16Cursor.next();

db.rewardType.insert({"name": type16, params: param16._id, des: "Player Referral Reward"});

//Player double top up reward
var type17 = "PlayerDoubleTopUpReward";
db.rewardParam.insert({
    "name": type17, params: {
        maxRewardTimes: {type: "Number", des: "Max Reward Times"},
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        reward: {
            type: "Table",
            data: {
                minPlayerLevel: {type: "Number", des: "PlayerLevel"},
                topUpAmount: {type: "Number", des: "Topup Amount"},
                rewardAmount: {type: "Number", des: "Reward amount"},
                consumptionTimes: {type: "Number", des: "Consumption Times"},
                maxRewardAmount: {type: "Number", des: "Maximum reward amount"}
            },
            des: "Reward parameter for each level"
        }
    }
});

var param17Cursor = db.rewardParam.find({"name": type17});
var param17 = param17Cursor.next();

db.rewardType.insert({"name": type17, params: param17._id, des: "Player Double Top Up Reward"});

//Player consecutive login reward
var type18 = "PlayerConsecutiveLoginReward";
db.rewardParam.insert({
    "name": type18, params: {
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        bonusAmount: {type: "Number", des: "Bonus amount"},
        bonusRequiredTimes: {type: "Number", des: "Bonus amount required times"},
        dailyTopUpAmount: {type: "Number", des: "Daily top up amount"},
        dailyConsumptionAmount: {type: "Number", des: "Daily consumption amount"},
        reward: {
            type: "Table",
            data: {
                dayIndex: {type: "Number", des: "Day Index"},
                rewardAmount: {type: "Number", des: "Reward amount"},
                consumptionTimes: {type: "Number", des: "Consumption Times"}
            },
            des: "Reward parameter for each day"
        }
    }
});

var param18Cursor = db.rewardParam.find({"name": type18});
var param18 = param18Cursor.next();

db.rewardType.insert({"name": type18, params: param18._id, des: "Player Consecutive Login Reward"});

//Player easter egg reward
var type19 = "PlayerEasterEggReward";
db.rewardParam.insert({
    "name": type19, params: {
        targetEnable: {type: "Boolean", des: "If target is enabled"},
        providers: {type: "DBArray", action: "getAllGameProviders", field: "name", des: "Game Provider"},
        minTopUpAmount: {type: "Number", des: "Day Index"},
        reward: {
            type: "Table",
            data: {
                rewardAmount: {type: "Number", des: "Reward amount"},
                probability: {type: "Number", des: "Consumption Times"}
            },
            des: "Reward parameter"
        }
    }
});

var param19Cursor = db.rewardParam.find({"name": type19});
var param19 = param19Cursor.next();

db.rewardType.insert({"name": type19, params: param19._id, des: "Player Consecutive Login Reward"});
