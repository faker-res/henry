var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndSkinSettingSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // type 1 = PC, 2 = APP, 3 = H5
    device: {type: Number},
    // skin's name
    name: {type: String},
    // skin's url
    url: {type: String}
});

module.exports = frontEndSkinSettingSchema;