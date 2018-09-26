var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var themeSetting = new Schema({
    // platform
    // platform: {type: Schema.ObjectId, ref: 'platform', index: true},

    themeStyle: {type: String, index: true},

    content:[{
        // _id: false,
        themeId: {type: String},
        remark: {type: String},
    }],

    // player or partner
    type: {type: String},

});

themeSetting.index({ themeStyle: 1}, {unique: true});


module.exports = themeSetting;