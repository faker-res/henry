let mongoose = require('mongoose');
let Schema = mongoose.Schema;

// demo player details
let commCalcParentSchema = new Schema({
    // partner commission log object id
    commCalc: {type: Schema.ObjectId, ref: 'partnerCommissionLog', required: true, index: true},
    // parent object id
    parentObjId: {type: Schema.ObjectId, ref: 'partner'},
    // parent name
    parentName: {type: String},
    // gross commission
    grossCommission: {type: Number},
    // nett commission
    nettCommission: {type: Number},

});

module.exports = commCalcParentSchema;

commCalcParentSchema.index({commCalc: 1, parentObjId: 1});