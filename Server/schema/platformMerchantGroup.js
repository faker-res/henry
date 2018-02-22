var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformMerchantGroupSchema = new Schema({
    //group id
    groupId: {type: String, required: true, unique: true, index: true},
    //group code
    code: {type: String, required: true, index: true},
    //group name
    name: {type: String, required: true},
    //group display name
    displayName: {type: String, required: true},
    //platform obj id
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},
    //group merchants
    merchants: [{type: String}],
    merchantNames: [{type: String}],
    //if it is default group
    bDefault: {type: Boolean, default: false}
});

//group is unique by platform and code
platformMerchantGroupSchema.index({platform: 1, code: 1}, {unique: true});

module.exports = platformMerchantGroupSchema;
