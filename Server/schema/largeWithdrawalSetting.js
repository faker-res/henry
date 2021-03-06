let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let largeWithdrawalSettingSchema = new Schema({
    // platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true, required: true},
    // email name extension
    emailNameExtension: {type: String},
    // recipient
    recipient: [{type: Schema.ObjectId, ref: 'adminInfo'}],
    // reviewer - people who can approve the withdrawal by email
    reviewer: [{type: Schema.ObjectId, ref: 'adminInfo'}],
    // show real name
    showRealName: {type: Boolean, default: true},
    // show player level
    showPlayerLevel: {type: Boolean, default: true},
    // show bank city
    showBankCity: {type: Boolean, default: true},
    // show register time
    showRegisterTime: {type: Boolean, default: true},
    // show current withdrawal time
    showCurrentWithdrawalTime: {type: Boolean, default: true},
    // show last withdrawal time
    showLastWithdrawalTime: {type: Boolean, default: true},
    // show current credit (total credit = local credit + game credit)
    showCurrentCredit: {type: Boolean, default: true},
    // show proposal ID
    showProposalId: {type: Boolean, default: true},
    // customer service comment
    allowAdminComment: {type: Boolean, default: true},
    // show player bonus amount / profit amount (current credit + current withdrawal amount - total top up amount between current withdrawal and last withdrawal)
    showPlayerBonusAmount: {type: Boolean, default: true},
    // show total top up amount after last withdrawal
    showTotalTopUpAmount: {type: Boolean, default: true},
    // show consumption return amount after last withdrawal
    showConsumptionReturnAmount: {type: Boolean, default: true},
    // show total reward amount that are not consumption return after last withdrawal
    showRewardAmount: {type: Boolean, default: true},
    // show consumption amount group count gap (count of consumption between 0-100, 100-1000, 1000-10000, 10000-100000, 100000+)
    showConsumptionSectionCount: {type: Boolean, default: true},
    // show game provider info (detail of consumption based on provider after last withdrawal)
    showGameProviderInfo: {type: Boolean, default: true},
    // show last top up bonus amount (current credit + current withdrawal amount - last top up amount)
    showLastTopUpBonusAmount: {type: Boolean, default: true},
    // show last top up amount
    showLastTopUpAmount: {type: Boolean, default: true},
    // show last top up consumption return amount (total consumption return amount after last top up)
    showLastTopUpConsumptionReturnAmount: {type: Boolean, default: true},
    // show last top up reward amount (total reward amount aside of consumption return after last top up)
    showLastTopUpRewardAmount: {type: Boolean, default: true},
    // show last top up consumption section amount gap (count of consumption between 0-100, 100-1000, 1000-10000, 10000-100000, 100000+)
    showLastTopUpConsumptionSectionCount: {type: Boolean, default: true},
    // show last top up game provider info (detail of consumption based on provider after last top up)
    showLastTopUpGameProviderInfo: {type: Boolean, default: true},
    // show current day total top up amount
    showDayTopUpAmount: {type: Boolean, default: true},
    // show current day total withdraw amount
    showDayWithdrawAmount: {type: Boolean, default: true},
    // show current day top up - withdraw difference
    showDayTopUpWithdrawDifference: {type: Boolean, default: true},
    // show total top up amount
    showAccountTopUpAmount: {type: Boolean, default: true},
    // show total withdraw amount
    showAccountWithdrawAmount: {type: Boolean, default: true},
    // show account top up - withdraw difference
    showAccountTopUpWithdrawDifference: {type: Boolean, default: true},
    // show last 3 month player top up amount (separated by each month)
    showLastThreeMonthTopUp: {type: Boolean, default: true},
    // show last 3 month player withdraw amount (separated by each month)
    showLastThreeMonthWithdraw: {type: Boolean, default: true},
    // show last 3 month top up - withdraw difference (separated by each month)
    showLastThreeMonthTopUpWithdrawDifference: {type: Boolean, default: true},
    // show last 3 month consumption amount (separated by each month)
    showLastThreeMonthConsumptionAmount: {type: Boolean, default: true},
    // domain for audit link
    domain: {type: String},
});

module.exports = largeWithdrawalSettingSchema;
