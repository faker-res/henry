let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let queryCreditTimeoutSchema = new Schema({
    //platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', index: true},
    // player
    playerObjId: {type: Schema.ObjectId, ref: 'player', index: true},
    //provider
    providerObjId: {type: Schema.ObjectId, index: true},
    //platform
    platformId: {type: String, index: true},
    // playerName
    playerName: {type: String, index: true},
    //provider
    providerId: {type: String, index: true},
    // Date time added
    createTime: {type: Date, default: Date.now, index: true},
});

module.exports = queryCreditTimeoutSchema;