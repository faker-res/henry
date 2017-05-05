var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var partnerCreditChangeLogSchema = new Schema({
    //Partner Id
    partnerId: {type: Schema.ObjectId, required: true, index: true},
    //platform
    platformId: {type: Schema.ObjectId},
    // Admin Id
    operatorId: String,
    // Data
    data: JSON,
    // Date of action
    operationTime: {type: Date, default: Date.now, index: true},
    // operation Type
    operationType: {type: String, index: true},
    // changed amount
    amount: {type: Number, required: true},
    // current amount
    curAmount: {type: Number}
});

module.exports = partnerCreditChangeLogSchema;
