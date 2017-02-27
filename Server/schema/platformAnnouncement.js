var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var platformAnnouncement = new Schema({
    platform: {type: Schema.ObjectId, ref: 'platform', required: true},

    // Title of announcement
    title: {type: String, required: true},
    // Content of announcement
    content: {type: String, required: true},

    date: {type: Date, required: true},

    // Who will this announcement be shown to?
    reach: {type: String, required: true, enum: ['all', 'players', 'conditional']},

    // When reach === 'conditional'
    // Condition(s) for who will see this announcement
    reachCondition: {type: JSON, required: false}
});

module.exports = platformAnnouncement;