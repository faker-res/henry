var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardEventGroupSchema = new Schema({
    // platform of this group
    platform: {type: Schema.Types.ObjectId, ref: 'platform', index: true},
    // group name
    name: {type: String, unique: true, required: true, index: true},
    // reward event attached to this group
    rewardEvents: [{type: Schema.ObjectId, ref: 'rewardEvent'}],

});

module.exports = rewardEventGroupSchema;

