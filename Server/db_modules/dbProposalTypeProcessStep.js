/**
 * Created by hninpwinttin on 13/1/16.
 */
var dbconfig = require('./../modules/dbproperties');
var Q = require("q");

var proposalTypeProcessStep = {

    /**
     * Create a new proposal type process step
     * @param {json} data - The data of the proposalTypeProcessStep. Refer to proposalTypeProcessStep schema.
     */
    createProposalTypeProcessStep: function (data) {

        var proposalTypeProcessStep = new dbconfig.collection_proposalTypeProcessStep(data);
        return proposalTypeProcessStep.save();
    },

    /**
     * Update proposal proposalTypeProcessStep
     * @param {json} query - The query string
     * @param {json} data - The update data of the ProposalTypeProcessStep
     */
    updateProposalTypeProcessStep: function (query, data) {
        return dbconfig.collection_proposalTypeProcessStep.findOneAndUpdate(query, data).exec();
    },

    /**
     * Delete proposal type process setp
     * @param {json} processStepObjIds - Array of processStep ObjId
     */
    deleteProposalTypeProcessStep: function (processStepObjIds) {
        var deferred = Q.defer();
        var stepProm = dbconfig.collection_proposalTypeProcessStep.remove({_id: {$in: processStepObjIds}}).exec();

        var preStepProm1 = dbconfig.collection_proposalTypeProcessStep.update(
            {nextStepWhenApprove: {$in: processStepObjIds}},
            {nextStepWhenApprove: null},
            {multi: true}
        ).exec();

        var preStepProm2 = dbconfig.collection_proposalTypeProcessStep.update(
            {nextStepWhenReject: {$in: processStepObjIds}},
            {nextStepWhenReject: null},
            {multi: true}
        ).exec();

        var processProm = dbconfig.collection_proposalTypeProcess.update(
            {},
            {$pull: {steps: {$in: processStepObjIds}}},
            {multi: true}
        ).exec();

        Q.all([stepProm, preStepProm1, preStepProm2, processProm]).then(
            function (data) {
                if (data && data[0] && data[1] && data[2] && data[3]) {
                    deferred.resolve(data);
                }
                else {
                    deferred.reject({name: "DBError", message: "Incorrect return data"});
                }
            }
        ).catch(
            function (error) {
                log.conLog.error("deleteProposalTypeProcessStep error", error);
                deferred.reject(error);
            });

        return deferred.promise;
    }

};

module.exports = proposalTypeProcessStep;