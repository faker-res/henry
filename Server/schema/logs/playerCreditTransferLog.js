var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit transfer error log
var playerCreditTransferLogSchema = new Schema({
    //Player Id
    playerObjId: {type: Schema.ObjectId, required: true, index: true},
    //platform
    platformObjId: {type: Schema.ObjectId, index: true},
    //Player name
    playerName: {type: String},
    //admin name
    adminName: {type: String},
    //Player Id
    playerId: {type: String},
    //platform
    platformId: {type: String},
    // transfer in or out
    type: {type: String, required: true},
    // transfer id
    transferId: {type: String, required: true, index: true},
    // Date of action
    providerId: {type: String, required: true, index: true},
    // amount
    amount: {type: Number, required: true},
    // locked amount
    lockedAmount: {type: Number, default: 0},
    //create time
    createTime: {type: Date, default: Date.now, index: true},
    //API response data
    apiRes: JSON,
    // any additional JSON data
    data: JSON,
    //status
    status: {type: String, index: true},
    //if this log has been used
    bUsed: {type: Boolean}
});

playerCreditTransferLogSchema.index({createTime: 1, platformObjId: 1});

module.exports = playerCreditTransferLogSchema;