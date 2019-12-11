var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var testlogSchema = new Schema({
        data: {type: String},
        createTime: {type: Date, default: Date.now}
    },
    {
        writeConcern: {
            w: 1,
            j: true,
            wtimeout: 2000
        }
    });


module.exports = testlogSchema;
