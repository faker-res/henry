let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let ipDomainLogSchema = new Schema({
    // Platform
    platform: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // Create time
    createTime: {type: Date, default: new Date()},
    // Domain
    domain: {type: String},
    // IP Address
    ipAddress: {type: String}
});

module.exports = ipDomainLogSchema;