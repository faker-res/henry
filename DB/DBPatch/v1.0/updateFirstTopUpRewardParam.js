var db = db.getSiblingDB("admindb");

var type5 = "FirstTopUp";

db.rewardParam.update({"name": type5}, {
    $set: {
        params: {
            periodType: {type: "Number", des: "Reward period"}, //0: First time, 1: week, 2: month
            targetEnable: {type: "Boolean", des: "If target is enabled"},
            providers: {type: "DBString", action: "getAllGameProviders", field: "name", des: "Game Provider"},
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
    }
});

//Player top up return reward
var type10 = "PlayerTopUpReturn";
db.rewardParam.update({"name": type10}, {$set: { params:{
    targetEnable: {type: "Boolean", des: "If target is enabled"},
    providers: {type: "DBArray", action:"getAllGameProviders", field: "name", des: "Game Provider"},
    //games: {type: "DBArray", action:"getGamesByProviderId", field: "name", des: "Games"},
    useConsumption: {type: "Boolean", des: "If use consumption record"},
    reward: {
        type: "Table",
        data:{
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},
            spendingTimes: {type: "Number", des: "Consumption amount times"},
            maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
            minTopUpAmount: {type: "Number", des: "Minimum top up amount"},
            maxDailyRewardAmount: {type: "Number", des: "Maximum daily reward amount"}
        },
        des: "Reward parameter for each level"
    }
}}});

// var param10Cursor = db.rewardParam.find({"name": type10});
// var param10 = param10Cursor.next();
//
// db.rewardType.insert({"name": type10, params: param10._id, des: "Player Top Up Return"});

//Player Consumption incentive
var type11= "PlayerConsumptionIncentive";
db.rewardParam.update({"name": type11}, {$set: {params:{
    needApply: {type: "Boolean", des: "If this reward requires player application"},
    //useConsumption: {type: "Boolean", des: "If use consumption record"},
    reward: {
        type: "Table",
        data:{
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
}}});

// var param11Cursor = db.rewardParam.find({"name": type11});
// var param11 = param11Cursor.next();
//
// db.rewardType.insert({"name": type11, params: param11._id, des: "Player Consumption Incentive"});

//Partner top up return reward
var type12 = "PartnerTopUpReturn";
db.rewardParam.insert({"name": type12, params:{
    reward: {
        type: "Table",
        data:{
            rewardPercentage: {type: "Percentage", des: "Reward percentage"},
            maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
            minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
        },
        des: "Reward parameter for each level"
    }
}});

var param12Cursor = db.rewardParam.find({"name": type12});
var param12 = param12Cursor.next();

db.rewardType.insert({"name": type12, params: param12._id, des: "Partner Top Up Return"});

//Player top up reward
var type13 = "PlayerTopUpReward";
db.rewardParam.insert({"name": type13, params:{
    reward: {
        minTopUpAmount: {type: "Number", des: "Minimal top up amount"},
        rewardAmount: {type: "Number", des: "Reward amount"},
        maxRewardAmount: {type: "Number", des: "Maximum reward amount"},
        unlockTimes: {type: "Number", des: "Unlock times"}
    }
}});

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

db.rewardType.insert({"name": type16, params: param16._id, des: "Player Registration Reward"});

//Player double top up reward
var type17 = "PlayerDoubleTopUpReward";
db.rewardParam.insert({
    "name": type17, params: {
        maxRewardTimes: {type: "Number", des: "Max Reward Times"},
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
