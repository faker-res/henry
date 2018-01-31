var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var creditChangeLogSchema = new Schema({
    //Player Id
    playerId: {type: Schema.ObjectId, required: true, index: true},
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
    curAmount: {type: Number},
    // locked Amount
    lockedAmount: {type: Number},
    //changed lockedAmount
    changedLockedAmount: {type: Number},
    // transfer id
    transferId: {type: String, index: true}
});

module.exports = creditChangeLogSchema;
