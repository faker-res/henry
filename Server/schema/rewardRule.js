/*
 * Not in use
 */

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardRuleSchema = new Schema({
    //reward rule name
    name: {type: String, unique: true, required: true, dropDups: true, index: true},
    //rule type of the reward - such as firstTopup / spentReward / BankTransfer / contentProvider / DailyTopup
    rewardType: {type:Schema.Types.ObjectId, ref:'rewardType'},
    //condition params of the reward
    condition:{type: JSON, default: null},
    //reward params of the reward
    param: {type: JSON, default: null},
    // request proposal
    //requestProposal : {type:Schema.Types.ObjectId, ref:'proposalType'},
    // execution proposal
    executeProposal : {type: String}
});

module.exports = rewardRuleSchema;