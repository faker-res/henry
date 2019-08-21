var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var preventBlockUrl = new Schema({
    url:  {type: String},
    remark:  {type: String}
});

module.exports = preventBlockUrl;
