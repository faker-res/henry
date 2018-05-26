let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let callOutMissionCalleeSchema = new Schema({
    // platform
    platform:  {type: Schema.ObjectId, required: true, index: true},
    // missionObjId
    mission: {type: Schema.Types.ObjectId, index: true},
    // mission name
    missionName: {type: String, required: true, index: true, unique: true},
    // index number (sorting of player on call)
    indexNo: {type: Number},
    // playerObjId
    player: {type: Schema.ObjectId, ref: 'player'},
    // player name
    playerName: {type: String},
    // phone number
    phoneNumber: {type: String},
    // calling time
    callingTime: {type: Date},
    // status - refer to constCallOutMissionCalleeStatus
    status: {type: Number},
    // other data
    data: {},
});

// callOutMissionCalleeSchema.index({platform: 1, startTime: 1, endTime: 1, device: 1, pageName: 1, buttonName: 1});

module.exports = callOutMissionCalleeSchema;