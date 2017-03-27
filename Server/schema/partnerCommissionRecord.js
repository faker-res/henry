/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/


var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerCommissionRecordSchema = new Schema({
    //partner object id
    partner: {type: Schema.Types.ObjectId, required: true, index: true},
    //platform object id
    platform: {type: Schema.Types.ObjectId, required: true, index: true},
    //create time
    createTime: {type: Date, default: Date.now},
    //settle time
    settleTime: {type: Date, required: true, index: true},
    //player total reward amount
    totalRewardAmount: {type: Number},
    //service fee
    serviceFee: {type: Number},
    //platform fee
    platformFee: {type: Number},
    //profit
    profitAmount: {type: Number},
    //operation amount
    operationAmount: {type: Number},
    //commission level
    commissionLevel: {type: Number},
    //commission rate
    commissionRate: {type: Number},
    //bonus commission rate
    bonusCommissionRate: {type: Number},
    //player total valid consumption amount //运营费：totalValidAmount - totalBonusAmount
    totalValidAmount: {type: Number},
    //player total bonus amount
    totalBonusAmount: {type: Number},
    //player total bonus amount
    totalPlayerBonusAmount: {type: Number},
    //player total top up amount
    totalTopUpAmount: {type: Number},
    //partner commission amount
    commissionAmount: {type: Number},
    //sum of all the commissionAmounts of this partner's children
    totalCommissionOfChildren: {type: Number},
    //commission amount awarded to this partner based on its children's performance
    commissionAmountFromChildren: {type: Number}
});

module.exports = partnerCommissionRecordSchema;