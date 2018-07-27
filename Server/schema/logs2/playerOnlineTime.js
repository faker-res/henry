let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerOnlineTimeSchema = new Schema({
    // playerId
    player: {type: Schema.Types.ObjectId, ref: 'player', required: true, index: true, unique: true},
    // Current login time
    lastLoginTime: {type: Date, default: new Date()},
    // Current login token
    lastLoginToken: {type: String},
    // Last authenticated time
    lastAuthenticateTime: {type: Date, default: new Date()},

    // Accumulated
    // Total online time
    totalOnlineSeconds: {type: Number, default: 0}
});

module.exports = playerOnlineTimeSchema;