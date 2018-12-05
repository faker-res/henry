let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let ipDomainLogSchema = new Schema({
    // Platform
    platform: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // Create time
    createTime: {type: Date, default: Date.now, index: true},
    // Domain
    domain: {type: String, index: true},
    // IP Address
    ipAddress: {type: String, index: true},
    // Source before domain site
    sourceUrl: {type: String, index: true},
    // partnerId
    partnerId: {type: String, index : true}
});

module.exports = ipDomainLogSchema;
