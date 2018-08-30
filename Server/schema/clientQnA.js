var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// for security question
var clientQnASchema = new Schema({
    //QnA template object Id
    template: {type: Schema.ObjectId, ref: 'CSQnATemplate', required: true},
    //player object Id
    playerObjId: {type: Schema.ObjectId, ref: 'player', required: true},
    // security question total wrong count - reset when success
    totalWrongCount: {type: Number, default: 0},
    // data for each step
    QnAData: {type: JSON, default: {}}
});
//record is unique by playerObjId and template
clientQnASchema.index({template: 1, playerObjId: 1});


module.exports = clientQnASchema;