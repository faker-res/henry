var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformFeeEstimate = new Schema({
    //platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    platformFee: [{
        _id: false,
        gameProvider: {type: Schema.ObjectId, ref: 'gameProvider'},
        // percentage. eg: 20% = 0.2
        feeRate: {type: Number, default: 0}
    }]
});

module.exports = platformFeeEstimate;