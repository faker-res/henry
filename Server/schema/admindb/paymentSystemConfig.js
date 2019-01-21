var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var paymentSystemConfigSchema = new Schema({
    //platform
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // currently available financial settlement system
    systemType: {type: Number, index: true},
    // topup
    enableTopup: {type: Boolean, default: false},
    // bonus
    enableBonus: {type: Boolean, default: false},
    // point less than min setup point will trigger alert
    minPointNotification: {type: Number, index: true}
});

module.exports = paymentSystemConfigSchema;
