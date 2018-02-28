var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var playerClientSourceLogSchema = new Schema ({
    //platform Id
    platformId: {type: String, index: true},
    //Player name
    playerName: {type: String, index: true},
    //domain name
    domain: String,
    //to store additional data
    data: JSON,
    //source ip
    sourceUrl: String,
    // client type
    clientType: String,
    //access type
    accessType: String,
    // Date of action
    createTime: {type: Date, default: Date.now, index: true},
    // is test player
    isTestPlayer: {type: Boolean, default: false},
    //is real player
    isRealPlayer: {type: Boolean, default: true, index: true},
    //partnerId
    partner: {type: Schema.ObjectId, ref: 'partner', index: true},
});

module.exports = playerClientSourceLogSchema;