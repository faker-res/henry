var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// Player credit change log
var playerClientSourceLogSchema = new Schema ({
    //platform Id
    platformId: String,
    //Player name
    playerName: String,
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
    createTime: {type: Date, default: Date.now}
});

module.exports = playerClientSourceLogSchema;