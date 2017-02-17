/**
 * Created by hninpwinttin on 29/1/16.
 */
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var partnerLevelSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    //partnerLevel name such as - Diamond / VIP / Normal / Referral
    name: {type: String, required: true},
    //level value, used for level comparison
    value: {type: Number, required: true},
    //description
    description: String,
    // Minimum number of players required to reach this level
    limitPlayers: {type: Number, required: true},
    // Weekly consumption amount required for this level
    consumptionAmount: {type: Number, required: true},
    // The number of weeks of failed targets after which the partner will be demoted
    demoteWeeks: {type: Number, required: true},
    //consumption return rate
    consumptionReturn: {type: Number, required: true}
});

//record is unique by platform, name and platform, value
partnerLevelSchema.index({ platform: 1, value: 1}, { unique: true });
partnerLevelSchema.index({ platform: 1, name: 1}, { unique: true });

module.exports = partnerLevelSchema;
