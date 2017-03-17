var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerConsumptionRecordSchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true, index: true},
    // platform Id
    platformId: {type: Schema.ObjectId, required: true, index: true},
    // provider ID
    providerId: {type: Schema.ObjectId},
    // game ID
    gameId: {type: Schema.ObjectId, required: true},
    // game type
    gameType: {type: String, required: true},
    // gameRound
    roundNo: {type: String},
    // payment time
    createTime: {type: Date, default: Date.now, index: true},
    //total amount for statistics
    amount: {type: Number, required: true, default: 0},
    //total amount for statistics
    validAmount: {type: Number, required: true, default: 0},
    //order time
    orderTime: {type: Date},
    //order id
    orderNo: {type: String, index: true},
    //bonus amount
    bonusAmount: {type: Number, default: 0},
    //commissionable amount
    commissionAmount: {type: Number, default: 0},
    //content detail
    content: {type: String},
    //result
    result: {type: String},
    //player detail
    playDetail: {type: String},
    //settlement time
    settlementTime: {type: Date},
    //has been used for which reward type
    usedType: {type: String},
    //check if record has been used for other reward
    bDirty: {type: Boolean, default: false}
});

//record is unique by playerId platformId and date
playerConsumptionRecordSchema.index({playerId: 1, platformId: 1, gameId: 1, createTime: 1});

module.exports = playerConsumptionRecordSchema;
