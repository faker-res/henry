/**
 * Created by hninpwinttin on 15/1/16.
 */
var dbconfig = require('./../modules/dbproperties');

var dbProposalProcessStep = {
    /**
     * Create a new platform
     * @param {json} data - The data of the platform. Refer to Platform schema.
     */
    createProposalProcessStep : function (data) {
        var proposalProcessStep = new dbconfig.collection_proposalProcessStep(data);
        return proposalProcessStep.save();
    },

    /**
     * Create a new proposalProcessStep with typeId
     * @param {json} data - The data of the proposalProcess. Refer to proposalProcess schema.
     */
    createProposalProcessStepWithType: function (typeId) {
        var stepData = {
            type: typeId,
        };
        var proposalProcessStep = new dbconfig.collection_proposalProcessStep(stepData);
        return proposalProcessStep.save();
    },
};

module.exports = dbProposalProcessStep;


