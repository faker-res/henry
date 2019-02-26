var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformWechatPayListSchema = new Schema({
    accountNumber: {type:String, required:true},
    name: {type:String},
    platformId: {type:String},
    bankTypeId: {type:String},
    state: {type:String},
    singleLimit: {type:Number},
    quota: {type:Number},
    nickName: {type:String},
    isFPMS: {type: Boolean, default: false, index: true},
    quotaUsed : {type: Number, default: 0},
    //if it is pms2
    isPMS2: {type: Boolean, index: true}
});

module.exports = platformWechatPayListSchema;