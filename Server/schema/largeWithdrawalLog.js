let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let largeWithdrawalLogSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // proposal number
    proposalId: {type: String, index: true},
    // email name extension
    emailNameExtension: {type: String},
    // today large amount no (e.g. first large withdrawal log of today will be 1, second will be 2) base on GMT+8
    todayLargeAmountNo: {type: Number},
    // player name
    playerName: {type: String},
    // withdrawal amount
    amount: {type: Number},
    // real name
    realName: {type: String},
    // player level name (at the moment withdrawal is applied)
    playerLevelName: {type: String},
    // bank city
    bankCity: {type: String},
    // player registration time
    registrationTime: {type: Date},
    // current withdrawal time - also the proposal create time
    withdrawalTime: {type: Date},
    // last withdrawal time
    lastWithdrawalTime: {type:Date},
    // current credit (total credit = local credit + game credit)
    currentCredit: {type: Number},
    // admin comment
    comment: {type: String, default: ""},
    // player bonus amount / profit amount (current credit + current withdrawal amount - total top up amount between current withdrawal and last withdrawal)
    playerBonusAmount: {type: Number},
    // player total top up amount
    playerTotalTopUpAmount: {type: Number},
    // total consumption return amount after last withdrawal
    consumptionReturnAmount: {type: Number},
    // total reward amount that are not consumption return after last withdrawal
    rewardAmount: {type: Number},
    // consumption amount group count gap (count of consumption between 0-100, 100-1000, 1000-10000, 10000-100000, 100000+)
    consumptionAmountTimes: {
        // x < 100
        belowHundred: {type: Number},
        // 100 <= x < 1000
        belowThousand: {type: Number},
        // 1000 <= x < 10000
        belowTenThousand: {type: Number},
        // 10000 <= x < 100000
        belowHundredThousand: {type: Number},
        // 100000 <= x
        aboveHundredThousand: {type: Number}
    },
    // provider related detail
    gameProviderInfo: [{
        _id: false,
        // provider name
        providerName: {type: String},
        // bet amount
        consumptionTimes: {type: Number},
        // bonus amount
        bonusAmount: {type: Number},
        // valid consumption amount
        validAmount: {type: Number},
        // siteBonusRatio
        siteBonusRatio: {type: Number},
        // game type consumption amount
        consumptionAmountByType: {type: JSON},
        // game type player bonus amount
        playerBonusAmountByType: {type: JSON}
    }],
    // (since last top up) player bonus amount / profit amount (current credit + current withdrawal amount - total top up amount between current withdrawal and last withdrawal)
    lastTopUpPlayerBonusAmount: {type: Number},
    // last top up amount
    lastTopUpAmount: {type: Number},
    // (since last top up) total consumption return amount after last withdrawal
    lastTopUpConsumptionReturnAmount: {type: Number},
    // (since last top up) total reward amount that are not consumption return after last withdrawal
    lastTopUpRewardAmount: {type: Number},
    // (since last top up) consumption amount group count gap (count of consumption between 0-100, 100-1000, 1000-10000, 10000-100000, 100000+)
    lastTopUpConsumptionAmountTimes: {
        // x < 100
        belowHundred: {type: Number},
        // 100 <= x < 1000
        belowThousand: {type: Number},
        // 1000 <= x < 10000
        belowTenThousand: {type: Number},
        // 10000 <= x < 100000
        belowHundredThousand: {type: Number},
        // 100000 <= x
        aboveHundredThousand: {type: Number}
    },
    // (since last top up) provider related detail
    lastTopUpGameProviderInfo: [{
        _id: false,
        // provider name
        providerName: {type: String},
        // bet amount
        consumptionTimes: {type: Number},
        // bonus amount
        bonusAmount: {type: Number},
        // valid consumption amount
        validAmount: {type: Number},
        // siteBonusRatio
        siteBonusRatio: {type: Number},
        // game type consumption amount
        consumptionAmountByType: {type: JSON},
        // game type player bonus amount
        playerBonusAmountByType: {type: JSON}
    }],
    // withdrawal day top up amount
    dayTopUpAmount: {type: Number},
    // withdrawal day total withdraw amount (before current withdraw)
    dayWithdrawAmount: {type: Number},
    // withdrawal day topup - withdraw difference
    dayTopUpBonusDifference: {type: Number},
    // account total top up amount
    accountTopUpAmount: {type: Number},
    // account total withdraw amount
    accountWithdrawAmount: {type: Number},
    // account top up - bonus difference
    topUpBonusDifference: {type: Number},
    // last three month value (if Jan = 1, Dec = 12, etc)
    lastThreeMonthValue: {
        currentMonth: {type: Number},
        lastMonth: {type: Number},
        secondLastMonth: {type: Number}
    },
    // last three month top up amount
    lastThreeMonthTopUp: {
        currentMonth: {type: Number},
        lastMonth: {type: Number},
        secondLastMonth: {type: Number}
    },
    // last three month withdrawal amount
    lastThreeMonthWithdraw: {
        currentMonth: {type: Number},
        lastMonth: {type: Number},
        secondLastMonth: {type: Number}
    },
    // show last 3 month top up - withdraw difference
    lastThreeMonthTopUpWithdrawDifference: {
        currentMonth: {type: Number},
        lastMonth: {type: Number},
        secondLastMonth: {type: Number}
    },
    // last three month consumption amount
    lastThreeMonthConsumptionAmount: {
        currentMonth: {type: Number},
        lastMonth: {type: Number},
        secondLastMonth: {type: Number}
    },
    emailSentTimes: {type: Number, default: 0},
});

module.exports = largeWithdrawalLogSchema;
