mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerForbidPromoCodeLogSchema = new Schema({
    //admin
    admin: {type: Schema.ObjectId, ref: 'adminInfo', required: true},
    //playerId
    player: {type: Schema.ObjectId, ref: 'playerInfo', required: true, index: true},
    // payment time
    forbidPromoCodeNames: [{type: String}],
    // admin's comment on this update
    remark: String,
    // create time
    createTime: {type: Date, default: Date.now, index: true}
});

module.exports = playerForbidPromoCodeLogSchema;