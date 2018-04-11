var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var dxMission = new Schema({
    // platform
    platform: {type: Schema.ObjectId, ref: 'platform', index: true},
    // mission name
    name: {type: String, required: true},
    // mission description
    description: {type: String, default: ""},
    // player name prefix
    playerPrefix: {type: String, default: ""},
    // post fix of player name, last X number of digits from phone number
    lastXDigit: {type: Number},
    // registration password
    password: {type: String},
    // registration url
    domain: {type: String},
    // auto login link
    loginUrl: {type: String},
    // free cash amount for player
    creditAmount: {type: Number},
    // in which provider group where the credit locked
    providerGroup: {type: String},
    // consumption required in order to unlock the free credit
    requiredConsumption: {type: Number},
    // sms template use to send offer to potential client
    invitationTemplate: {type: String},
    // on-site welcome message title
    welcomeTitle: {type: String},
    // on-site welcome message content
    welcomeContent: {type: String},
    // number of days that name shown in different color
    alertDays: {type: Number},
    // creation time
    createTime:{type: Date, default: null, index: true},
});


module.exports = dxMission;