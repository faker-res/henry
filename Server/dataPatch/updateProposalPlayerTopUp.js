const env = require("../config/env").config();
const dbconfig = require("../modules/dbproperties");
const constProposalType = require("../const/constProposalType");
const constProposalStatus = require("../const/constProposalStatus");

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
                dbconfig.collection_players.findOneAndUpdate(
                    {_id: proposalData.data.playerObjId, platform: proposalData.data.platformObjId},
                    {
                        $inc: {
                            //validCredit: amount,
                            topUpSum: proposalData.data.amount,
                            //dailyTopUpSum: amount,
                            //weeklyTopUpSum: amount,
                            topUpTimes: 1,
                            //creditBalance: proposalData.data.amount
                        }
                    }
                ).then();

                console.log("index", i);
                i++;
            }
        );
    }
);

