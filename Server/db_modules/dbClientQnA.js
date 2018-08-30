'use strict';

var dbClientQnAFunc = function () {
};
module.exports = new dbClientQnAFunc();

const dbutility = require('./../modules/dbutility');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const dbconfig = require('./../modules/dbproperties');
const dbProposal = require('./../db_modules/dbProposal');
const constClientQnA = require('./../const/constClientQnA');
const constServerCode = require('./../const/constServerCode');
const constProposalEntryType = require('../const/constProposalEntryType');
const constProposalUserType = require('../const/constProposalUserType');
const constProposalType = require('../const/constProposalType');
const Q = require("q");

var dbClientQnA = {

};

var proto = dbClientQnAFunc.prototype;
proto = Object.assign(proto, dbClientQnA);

// This make WebStorm navigation work
module.exports = dbClientQnA;
