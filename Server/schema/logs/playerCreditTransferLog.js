var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit transfer error log
var playerCreditTransferLogSchema = new Schema({
    //Player Id
    playerObjId: {type: Schema.ObjectId, required: true, index: true},
    //platform
    platformObjId: {type: Schema.ObjectId},
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
    providerId: {type: String, required: true},
    // amount
    amount: {type: Number, required: true},
    // locked amount
    lockedAmount: {type: Number, default: 0},
    //create time
    createTime: {type: Date, default: Date.now},
    //API response data
    apiRes: JSON,
    // any additional JSON data
    data: JSON,
    //status
    status: {type: String},
    //if this log has been used
    bUsed: {type: Boolean}
});

module.exports = playerCreditTransferLogSchema;