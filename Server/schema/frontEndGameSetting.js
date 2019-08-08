var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var frontEndGameSettingSchema = new Schema({
    // Platform
    platformObjId: {type: Schema.Types.ObjectId, ref: 'platform', required: true, index: true},
    // type 1 = PC, 2 = APP, 3 = H5
    device: {type: Number, index: true},
    // skin's name
    title: {type: String},
    // displayFormat 1： 背景展示； 2： 平铺3项1列； 3： 平铺5项1列
    displayFormat: {type: Number},
    // 1: available; 2: deleted
    status: {type: Number, default: 1, index: true},
    // display order based on individual category
    displayOrder: {type: Number, index: true},
});

module.exports = frontEndGameSettingSchema;