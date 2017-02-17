/**
 * Created by hninpwinttin on 30/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerRewardRecordSchema = new Schema({

    // Reward type
    rewardType: String,
    // reward Amount
    rewardAmount: Number,
    //details
    details: Number
});

module.exports = partnerRewardRecordSchema;
