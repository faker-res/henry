var mongoose = require('mongoose');
var Schema = mongoose.Schema;

/**
 * Player mail
 */
var playerMailSchema = new Schema({
    //platform id
    platformId: {type: Schema.ObjectId, required: true},

    //The collection for the senderId depends on the senderType
    senderType: {type: String, enum: ['player', 'admin', 'System']},
    senderId: {type: Schema.ObjectId},
    //sender name, for display to human recipient
    senderName: {type: String},

    //The collection for the recipientId depends on the recipientType
    recipientType: {type: String, enum: ['player', 'admin', 'partner'], index: true},
    recipientId: {type: Schema.ObjectId, required: true, index: true},

    //title of the message
    title: String,
    //content of the message
    content: String,
    //create Time
    createTime: {type: Date, default: Date.now},

    //if player has opened the mail
    hasBeenRead: {type: Boolean, default: false, index: true},
    //if this mail has been deleted
    bDelete: {type: Boolean, default: false, index: true}
});

module.exports = playerMailSchema;


