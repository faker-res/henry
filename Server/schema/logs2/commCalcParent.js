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
    // current partner object id
    partnerObjId: {type: Schema.ObjectId, ref: 'partner'},
    // current partner name
    partnerName: {type: String},
    // gross commission
    grossCommission: {type: Number},
    // nett commission
    nettCommission: {type: Number},
    // raw commissions detail
    rawCommissions: [],
    // commCalc startTime to determine which batch it is
    startTime: {type: Date},

});

module.exports = commCalcParentSchema;

commCalcParentSchema.index({parentObjId:1, startTime: 1});
commCalcParentSchema.index({parentObjId:1, partnerObjId:1, startTime: 1});