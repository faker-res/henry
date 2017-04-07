const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");
const dbPlayerTopUpRecord = require("../db_modules/dbPlayerTopUpRecord");

dbconfig.collection_proposalType.find({name: {$in: [constProposalType.PLAYER_ALIPAY_TOP_UP, constProposalType.PLAYER_TOP_UP, constProposalType.PLAYER_MANUAL_TOP_UP]}}).lean().then(
    types => {
        var typeNames = {};
        var typeIds = types.map(type => {
            typeNames[type._id] = type.name;
            return type._id;
        });
        const cursor = dbconfig.collection_proposal.find({
            type: {$in: typeIds},
            status: constProposalStatus.SUCCESS,
            "creator.type": {$ne: "player"}
        }).cursor();
        var i = 0;
        cursor.eachAsync(
            proposalData => {
                var typeName = typeNames[proposalData.type];
                var record = {
                    playerId: proposalData.data.playerObjId,
                    platformId: (proposalData.data.platformObjId || proposalData.data.platformId),
                    amount: proposalData.data.amount,
                    topUpType: typeName == constProposalType.PLAYER_TOP_UP ? 2 : (typeName == constProposalType.PLAYER_MANUAL_TOP_UP ? 1 : 3),
                    createTime: new Date(proposalData.createTime),
                    bDirty: false,
                    proposalId: proposalData.proposalId
                };
                dbPlayerTopUpRecord.createPlayerTopUpRecord(record).then();
                console.log("index", i);
                i++;
            }
        );
    }
);

