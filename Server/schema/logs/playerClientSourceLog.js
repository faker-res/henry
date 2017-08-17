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
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = playerClientSourceLogSchema;