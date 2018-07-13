var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerInfoFromExternalSource = new Schema({
    // platform
    platformId: {type: String, index: true},
    //contact number
    phoneNumber: {type: String, index: true},
    //player display name
    name: {type: String, index: true},
    // the create time
    createTime: {type: Date, default: Date.now, index: true}

});

playerInfoFromExternalSource.index({platformId: 1, createTime: 1});

module.exports = playerInfoFromExternalSource;