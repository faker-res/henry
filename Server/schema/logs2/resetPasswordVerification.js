var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var resetPasswordVerificationSchema = new Schema({
    // platform
    platformObjId: {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    //player object Id array
    playerObjIds: [{type: Schema.ObjectId, ref: 'player', index: true}],
    // code use for resetPassword API
    code: {type: String, required: true, index: true},
    // log create date
    createTime: {type: Date, default: Date.now, index: true},
    // to check if this code has been used
    isUsed: {type: Boolean, default: false, index: true}
});

module.exports = resetPasswordVerificationSchema;