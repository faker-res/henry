let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let callOutMissionCalleeSchema = new Schema({
    // platform
    platform:  {type: Schema.ObjectId, required: true, index: true},
    // adminObjId
    admin: {type: Schema.Types.ObjectId, ref: 'adminInfo', index: true},
    // missionObjId
    mission: {type: Schema.Types.ObjectId, ref: 'callOutMission', index: true},
    // mission name
    missionName: {type: String, required: true, index: true},
    // index number (sorting of player on call)
    indexNo: {type: Number},
    // playerObjId
    player: {type: Schema.ObjectId, ref: 'player'},
    // player name
    playerName: {type: String, index: true},
    // phone number
    phoneNumber: {type: String},
    // calling time
    callingTime: {type: Date},
    // call count / redial times
    callCount: {type: Number, default: 0},
    // status - refer to constCallOutMissionCalleeStatus
    status: {type: Number, default: 0},
    // is the player added feedback record
    isAddedFeedbackRecord: {type: Boolean, default: false},
    // other data
    data: {},
});

module.exports = callOutMissionCalleeSchema;