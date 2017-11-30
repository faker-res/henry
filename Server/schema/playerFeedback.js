var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * After player register, customer service will call player to get some feedback about the games and record down the feedback.
 */
var playerFeedbackSchema = new Schema({
    //playerId
    playerId: {type: Schema.ObjectId, ref: 'playerInfo', required: true, index: true},
    //platform id
    platform: {type: Schema.ObjectId, required: true, index: true},
    //create Time
    createTime: {type: Date, default: Date.now, index: true},
    //adminId( customer service admin user id )
    adminId: {type: Schema.ObjectId, ref: 'adminInfo', index: true},
    //content of the feedback
    content: String,
    //result ( Normal, Missed call, PlayerBusy)
    result: String,
    resultName: String,
    topic: String
});

module.exports = playerFeedbackSchema;