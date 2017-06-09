var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// AdminActionLog
var partnerStatusChangeLogSchema = new Schema ({
    //Partner object Id
    _partnerId: {type: Schema.ObjectId, required: true},
    //changed status
    status: String,
    //reason
    reason: String,
    // Time of creation
    createTime: {type: Date, default: Date.now},
    //admin user name
    adminName: {type: String}
});

module.exports = partnerStatusChangeLogSchema;
