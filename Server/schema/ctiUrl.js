const mongoose = require('mongoose');
const Schema = mongoose.Schema;

let ctiUrlSchema = new Schema({
    urlSubDomain: String,
});

module.exports = ctiUrlSchema;