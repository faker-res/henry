var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformAlipayListSchema = new Schema({
    accountNumber: {type: String, required: true},
    name: {type: String},
    platformId: {type: String},
    quota: {type: Number},
    state: {type: String},
    singleLimit : {type: Number},
    bankTypeId: {type: String}
});

module.exports = platformAlipayListSchema;