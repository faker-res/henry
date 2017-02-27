/**
 * Created by hninpwinttin on 13/1/16.
 */

var dbconfig = require('./../modules/dbproperties');
var Q = require("q");

var proposalTypeProcess = {
    /**
     * Create a new proposal type
     * @param {json} data - The data of the policy. Refer to policy schema.
     */
    createProposalTypeProcess: function (data) {
        var proposalTypeProcess = new dbconfig.collection_proposalTypeProcess(data);
        return proposalTypeProcess.save();
    },

    /**
     * Get proposal type process
     * @param {Object} query - The query string
     */
    getProposalTypeProcess: function (query) {
        return dbconfig.collection_proposalTypeProcess.findOne(query).exec();
    },

    /**
     * Get proposal type process full info
     * @param {String} query - The query string
     */
    getProposalTypeProcessFull: function (query) {
        return dbconfig.collection_proposalTypeProcess.findOne(query)
            .populate({path: "steps", model: dbconfig.collection_proposalTypeProcessStep}).exec();
    },

    /**
     * Get proposal type process steps full info
     * @param {String} query - The query string
     */
    getProposalTypeProcessSteps: function(processId){
        var deferred = Q.defer();
        var processData = {};
        dbconfig.collection_proposalTypeProcess.findOne({_id: processId}).then(
            function(pdata){
                if( pdata ){
                    processData = pdata;
                    return dbconfig.collection_proposalTypeProcessStep.find(
                        { _id: {$in: pdata.steps} }
                    ).populate({path: "department", model: dbconfig.collection_department})
                        .populate({path: "role", model: dbconfig.collection_role}).exec();
                }
                else{
                    deferred.reject({name: "DBError", message: "Can't find proposal type process"});
                }
            },
            function(error){
                deferred.reject({name: "DBError", message: "Error finding proposal type process", error: error});
            }
        ).then(
            function(data){
                if( data ){
                    var res = {
                        process: processData,
                        steps: data
                    };
                    deferred.resolve(res);
                }
                else{
                    deferred.reject({name: "DBError", message: "Can't find proposal type process steps"});
                }
            },
            function(error){
                deferred.reject({name: "DBError", message: "Error finding proposal type process steps", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Add a ProposalTypeProcessStep to a ProposalTypeProcess
     * @param {ObjectId} processId - ObjId of ProposalTypeProcess , ObjId of ProposalTypeProcessStep
     */
    addStepToProcess: function (processId, stepIds) {
        return dbconfig.collection_proposalTypeProcess.update(
            {
                _id: processId
            },
            {
                $addToSet: {steps: {$each: stepIds}}
            }
        ).exec();
    },

    /**
     * Update process steps info
     * @param {ObjectId} processId - ObjId of ProposalTypeProcess , ObjId of ProposalTypeProcessStep
     * @param {json} steps
     */
    updateProcessSteps: function (processId, steps, links) {
        var deferred = Q.defer();
        var stepNodeIds = [];
        //delete all current process steps
        dbconfig.collection_proposalTypeProcess.findOne({_id: processId}).then(
            function (data) {
                if (data) {
                    var stepProm = dbconfig.collection_proposalTypeProcessStep.remove({_id: {$in: data.steps}});
                    var processProm = dbconfig.collection_proposalTypeProcess.findOneAndUpdate(
                        {_id: processId},
                        {steps: []}
                    );
                    return Q.all([stepProm, processProm]);
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't find proposal type process"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding proposal type process", error: error});
            }
        ).then(
            //create all steps
            function (data) {
                if (data && data[0] && data[1]) {
                    var stepsProm = [];
                    for (var key in steps) {
                        stepNodeIds.push(key);
                        var proposalTypeProcessStep = new dbconfig.collection_proposalTypeProcessStep(steps[key]);
                        stepsProm.push(proposalTypeProcessStep.save());
                    }
                    return Q.all(stepsProm);
                }
                else {
                    deferred.reject({name: "DBError", message: "Can't delete current steps"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error deleting current steps", error: error});
            }
        ).then(
            //create step links and update process steps
            function (data) {
                if( data && data.length === stepNodeIds.length ){
                    var stepsData = {};
                    var stepIds = [];
                    for( var i = 0; i < data.length; i++ ){
                        stepIds.push(data[i]._id);
                        stepsData[stepNodeIds[i]] = data[i];
                    }
                    //update process steps data
                    var proms = [];
                    //create links for steps data
                    for( var key in links ){
                        //todo::check link type here, approve or reject
                        proms.push( dbconfig.collection_proposalTypeProcessStep.findOneAndUpdate(
                            {_id: stepsData[key]._id},
                            {nextStepWhenApprove: stepsData[links[key]]._id}
                        ) );
                        stepsData[links[key]].noHead = true;
                    }
                    //sort the step ids by checking next step, the head node should always be the first one in the array
                    if(stepIds.length > 1){
                        var headId = null;
                        for( var k in stepsData ){
                            if( !stepsData[k].noHead ){
                                headId = stepsData[k]._id;
                            }
                        }
                        if( !headId ){
                            deferred.reject({name: "DataError", message: "Incorrect steps data"});
                        }
                        //move the headId to the first one in the array
                        var index = stepIds.indexOf(headId);
                        stepIds.splice(index, 1);
                        stepIds.splice(0, 0, headId);
                    }

                    proms.push(dbconfig.collection_proposalTypeProcess.findOneAndUpdate(
                        {_id: processId},
                        {steps: stepIds}
                    ));

                    return Q.all(proms);
                }
                else{
                    deferred.reject({name: "DBError", message: "Can't create process steps"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating process steps", error: error});
            }
        ).then(
            function(data){
                if( data ){
                    deferred.resolve(data);
                }
                else{
                    deferred.reject({name: "DBError", message: "Can't update process steps"});
                }
            },
            function(error){
                deferred.reject({name: "DBError", message: "Error updating process steps", error: error});
            }
        );

        return deferred.promise;
    }

};

module.exports = proposalTypeProcess;