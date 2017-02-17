var mongoose = require('mongoose');
var Schema = mongoose.Schema;
const constSettlementPeriod = require('../const/constSettlementPeriod');

var rewardEventSchema = new Schema({
    //reward event name
    name: {type: String, required: true},
    //reward event code
    code: {type: String, required: true},
    //reward rule id
    //rule: {type:Schema.Types.ObjectId, ref:'rewardRule'},
    //rule type of the reward - such as firstTopup / spentReward / BankTransfer / contentProvider / DailyTopup
    type: {type: Schema.Types.ObjectId, ref: 'rewardType'},
    //priority of the reward event, higher priority reward event will be processed first during settlement
    priority: {type: Number, default: 0},
    //if reward event need to apply, if false, means the reward result will be calculated by system
    needApply: {type: Boolean, default: false},
    //provider ID
    //providers: [{type:Schema.Types.ObjectId, ref:'gameProvider'}],
    //platform id
    platform: {type: Schema.Types.ObjectId, ref: 'platform'},
    //condition params of the reward
    condition: {type: JSON, default: null},
    //reward params of the reward
    param: {type: JSON, default: null},
    //execute proposal type id
    executeProposal: {type: Schema.Types.ObjectId, ref: 'proposalType'},
    //description
    description: {type: String},
    //if this reward event need settlement
    needSettlement: {type: Boolean, default: false},
    //settlement period
    settlementPeriod: {type: String, default: constSettlementPeriod.WEEKLY},
    //reward event valid start time
    validStartTime: {type: Date},
    //reward event valid end time
    validEndTime: {type: Date}
});

rewardEventSchema.index({platform: 1, name: 1}, {unique: true});
rewardEventSchema.index({platform: 1, code: 1}, {unique: true});

module.exports = rewardEventSchema;
