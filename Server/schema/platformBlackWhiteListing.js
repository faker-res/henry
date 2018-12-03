let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let platformBlackWhiteListingSchema = new Schema({
    // platform object Id
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // white listing SMS phone number
    whiteListingSmsPhoneNumbers: [{type:String}],
    // white listing SMS IP address
    whiteListingSmsIpAddress: [{type:String}],
    // black listing Callback IP address
    blackListingCallRequestIpAddress: [{type:String}],
});

module.exports = platformBlackWhiteListingSchema;