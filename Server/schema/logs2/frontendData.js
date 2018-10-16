let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// frontend Data
let frontendData = new Schema({
    // platform
    platform:  {type: Schema.ObjectId, ref: 'platform', required: true, index: true},
    // page
    page: {type: Number, index: true},
    // data
    data: {type: String}
});

module.exports = frontendData;