const Q = require("q");

const cpmsAPI = require("../externalAPI/cpmsAPI");

const constGameStatus = require('./../const/constGameStatus');
const constPlayerCreditChangeType = require('../const/constPlayerCreditChangeType');
const constProposalStatus = require('./../const/constProposalStatus');
const constProposalType = require('./../const/constProposalType');
const constServerCode = require('../const/constServerCode');

const dbConfig = require('./../modules/dbproperties');
const dbLogger = require("./../modules/dbLogger");
const errorUtils = require("./../modules/errorUtils.js");

const dbProposalUtility = {
    getProposalDataOfType: (platformObjId, proposalType, proposalQuery) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: proposalType
        }).lean().then(
            proposalType => {
                proposalQuery.type = proposalType._id;

                return dbConfig.collection_proposal.find(proposalQuery).lean();
            }
        )
    },

    getOneProposalDataOfType: (platformObjId, proposalType, proposalQuery) => {
        return dbConfig.collection_proposalType.findOne({
            platformId: platformObjId,
            name: proposalType
        }).lean().then(
            proposalType => {
                proposalQuery.type = proposalType._id;

                return dbConfig.collection_proposal.findOne(proposalQuery).lean();
            }
        )
    }
};

module.exports = dbProposalUtility;