var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var financialSettlementConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // currently available financial settlement system
    systemName: {type: String},
    // topup
    enableTopup: {type: Boolean, default: false},
    // bonus
    enableBonus: {type: Boolean, default: false},
    // description
    description: {type: String},
    // current financial points
    currentPoint: {type: Number},
    // point less than min setup point will trigger alert
    minPointNotification: {type: Number}
});

module.exports = financialSettlementConfigSchema;
