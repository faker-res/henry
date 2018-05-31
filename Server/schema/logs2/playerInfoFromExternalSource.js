var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerInfoFromExternalSource = new Schema({
    // platform
    platformId: {type: String},
    //contact number
    phoneNumber: {type: String, index: true},
    //player display name
    name: {type: String, index: true},

});

// playerInfoFromExternalSource.js.index({ platformId: 1}, {unique: true});

module.exports = playerInfoFromExternalSource;