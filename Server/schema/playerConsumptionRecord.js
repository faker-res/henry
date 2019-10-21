var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerConsumptionRecordSchema = new Schema({
    //player id
    playerId: {type: Schema.ObjectId, required: true, index: true},
    // platform Id
    platformId: {type: Schema.ObjectId, required: true},
    // provider ID
    providerId: {type: Schema.ObjectId},
    // game ID
    gameId: {type: Schema.ObjectId, required: true},
    // game type
    gameType: {type: String, required: true},
    // cp game type
    cpGameType: {type: String, index: true},
    // bet type
    betType: {type: String},
    // gameRound
    roundNo: {type: String},
    // gameRound
    playNo: {type: String, index: true},
    // payment time
    createTime: {type: Date, default: Date.now, index: true},
    //total amount for statistics
    amount: {type: Number, required: true, default: 0, index: true},
    //total amount for statistics
    validAmount: {type: Number, required: true, default: 0, index: true},
    //order time
    orderTime: {type: Date},
    //order id
    orderNo: {type: String, index: true, unique: true},
    //bonus amount
    bonusAmount: {type: Number, default: 0, index: true},
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
    // had been used for which reward event
    usedEvent: [{type: Schema.ObjectId}],
    // had been used for which task id
    usedTaskId: {type: Schema.ObjectId},
    // had been used for which proposal
    usedProposal: {type: Schema.ObjectId},
    //check if record has been used for other reward
    bDirty: {type: Boolean, default: false, index: true},
    // check if record is duplicate
    isDuplicate: {type: Boolean, default: false, index: true},
    // record insert time
    insertTime: {type: Date, default: Date.now},
    // last update time
    updateTime: {type: Date, default: Date.now},
    // source for dba
    source: {type: String, index: true},
    // Number of comsumption (compressed records)
    count: {type: Number, default: 1},
    // win ratio (bonusAmount / validAmount)
    winRatio: {type: Number, index: true},
    // seperate bet type and bet amount for EA and EBET
    betDetails: {type: []},
    // constPlayerLoginDevice
    loginDevice: {type: Number, index: true}
});

//record is unique by playerId platformId and date
playerConsumptionRecordSchema.index({playerId: 1, platformId: 1, gameId: 1, createTime: 1});
playerConsumptionRecordSchema.index({platformId: 1, createTime: 1});
playerConsumptionRecordSchema.index({playerId: 1, createTime: 1, isDuplicate: 1});
playerConsumptionRecordSchema.index({platformId: 1, playerId: 1, createTime: 1});
playerConsumptionRecordSchema.index({createTime: 1, platformId: 1, _id: 1});
playerConsumptionRecordSchema.index({platformId:1, providerId:1, createTime:1});
playerConsumptionRecordSchema.index({providerId:1, createTime:1, isDuplicate:1});

module.exports = playerConsumptionRecordSchema;
