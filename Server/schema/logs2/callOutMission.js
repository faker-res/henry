let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let callOutMissionSchema = new Schema({
    // platform
    platform:  {type: Schema.ObjectId, required: true, index: true},
    // adminObjId
    admin: {type: Schema.Types.ObjectId, index: true},
    // admin name
    adminName: {type: String},
    // mission name
    missionName: {type: String, required: true, index: true, unique: true},
    // search fields (JSON string)
    searchFields: {type: String},
    // createTime
    createTime: {type: Date, default: Date.now, index: true},
    // status - refer to constCallOutMissionStatus
    status: {type: Number, index: true, default: 0},
});

// callOutMissionSchema.index({platform: 1, startTime: 1, endTime: 1, device: 1, pageName: 1, buttonName: 1});

module.exports = callOutMissionSchema;