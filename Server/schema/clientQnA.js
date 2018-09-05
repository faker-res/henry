var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// for security question
var clientQnASchema = new Schema({
    //clientQnA template type = constClientQnA
    type: {type: String, required: true, index: true},
    //player object Id
    playerObjId: {type: Schema.ObjectId, ref: 'player'},
    // security question total wrong count - reset when success
    totalWrongCount: {type: Number, default: 0},
    // data for each step
    QnAData: {type: JSON, default: {}}
});
//record is unique by playerObjId and type
clientQnASchema.index({type: 1, playerObjId: 1});


module.exports = clientQnASchema;