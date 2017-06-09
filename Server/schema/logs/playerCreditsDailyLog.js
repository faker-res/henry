let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let playerCreditsDailyLog = new Schema ({
    playerObjId: {type: Schema.ObjectId, ref: 'player', required: true, index: true},
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    validCredit: {type: Number, default: 0},
    lockedCredit: {type: Number, default: 0},
    gameCredit: {type: Number, default: 0},
    createTime: {type: Date, default: Date.now()}
});

module.exports = playerCreditsDailyLog;