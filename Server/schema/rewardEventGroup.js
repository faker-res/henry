var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var rewardEventGroupSchema = new Schema({
    // platform of this group
    platform: {type: Schema.Types.ObjectId, ref: 'platform', index: true},
    // group name
    name: {type: String, required: true, index: true},
    // reward event attached to this group
    rewardEvents: [{type: Schema.ObjectId, ref: 'rewardEvent'}],

});
//record is unique by name and platform
rewardEventGroupSchema.index({name: 1, platform: 1});

module.exports = rewardEventGroupSchema;

