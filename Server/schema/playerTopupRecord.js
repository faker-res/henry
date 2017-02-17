var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerTopUpRecordSchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true, index: true},
    // platform ID
    platformId: {type: Schema.ObjectId, required: true, index: true},
    // payment time
    createTime: {type: Date, default: Date.now},
    //numerical value of the amount top-upped
    amount: {type: Number, required: true, default: 0},
    //paid through Visa. mastercard, paypal etc..
    topUpType: {type: String},
    //dirty
    bDirty: {type: Boolean, default: false},
    //used by which reward
    usedType: {type: String},
    //merchant top up type
    merchantTopUpType: {type: String},
    //bank card type
    bankCardType: {type: String},
    //for manual top up
    bankName: {type: String},
    //bank account
    bankAccount: {type: String},
    //related proposal id
    proposalId: {type: String}
});

//record is unique by playerId platformId and createTime
playerTopUpRecordSchema.index({ playerId: 1, platformId: 1, createTime: 1 });

module.exports = playerTopUpRecordSchema;


