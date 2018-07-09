let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let phoneNumberStateSchema = new Schema({
    //Phone number
    phoneNumber: {type: String, required: true, index: true, unique: true},
    // Last get sms code
    lastGetSMSCode: {type: Date, default: new Date()},
});

module.exports = phoneNumberStateSchema;