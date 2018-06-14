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
    nickName: {type:String}
});

module.exports = platformWechatPayListSchema;