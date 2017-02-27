/**
 * Created by hninpwinttin on 15/1/16.
 */
var dbconfig = require('./../modules/dbproperties');
var dbProposalTypeProcess = require('./../db_modules/dbProposalTypeProcess');
var dbProposalProcessStep = require('./../db_modules/dbProposalProcessStep');
const constSystemParam = require("../const/constSystemParam.js");

var Q = require("q");

var proposalProcess = {

    /**
     * Create a new proposalProcess
     * @param {json} data - The data of the proposalProcess. Refer to proposalProcess schema.
     */
    createProposalProcess: function (proposalProcessData) {
        var proposalProcess = new dbconfig.collection_proposalProcess(proposalProcessData);
        return proposalProcess.save();
    },

    /**
     * Get full info of process
     * @param {json} query - The query data.
     */
    getFullProposalProcess: function(query){
        var deferred = Q.defer();
        var processData = null;
        dbconfig.collection_proposalProcess.findOne(query).then(
            function(data){
                if( data ){
                    processData = data;
                    return dbconfig.collection_proposalProcessStep.find({_id: {$in: processData.steps}})
                        .populate({path: "department", model: dbconfig.collection_department})
                        .populate({path: "role", model: dbconfig.collection_role})
                        .populate({path: "operator", model: dbconfig.collection_admin})
                        .exec();
                }
                else{
                    deferred.reject({name: "DataError", message: "Error finding proposal process"});
                }
            },
            function(error){
                deferred.reject({name: "DBError", message: "Error finding proposal process", error: error});
            }
        ).then(
            function(data){
                var res = {
                    process: processData,
                    steps: data
                };
                deferred.resolve(res);
            },
            function(error){
                deferred.reject({name: "DBError", message: "Error finding proposal process steps", error: error});
            }
        );

        return deferred.promise;
    },

    /**
     * Create a new proposalProcess
     * @param {json} data - The data of the proposalProcess. Refer to proposalProcess schema.
     */
    createProposalProcessWithDefer: function (proposalProcessData, defer) {
        var proposalProcess = new dbconfig.collection_proposalProcess(proposalProcessData);
        proposalProcess.save().then(
            function (data) {
                defer.resolve(data);
            },
            function (error) {
                defer.reject({name: "DBError", message: "Error creating proporsal process"});
            }
        );
    },

    /**
     * Create a new proposalProcess with type
     * @param {json} data - The data of the proposalProcess. Refer to proposalProcess schema.
     */
    createProposalProcessWithTypeId: function (id) {
        var deferred = Q.defer();
        var processTypeId = null;
        var firstStepType = null;
        var stepIds = null;
        var typeData = null;

        dbconfig.collection_proposalType.findOne({_id: id}).populate({path: "process", model: dbconfig.collection_proposalTypeProcess}).then(
            function (data) {
                //if there are steps, set the process's curStep to the first one
                if (data && data.process) {
                    if (data.process.steps && data.process.steps.length > 0) {
                        processTypeId = data.process._id;
                        firstStepType = data.process.steps[0];
                        return dbconfig.collection_proposalTypeProcessStep.find({_id: {$in: data.process.steps}}).exec();
                    }
                    else {
                        deferred.resolve(constSystemParam.PROPOSAL_NO_STEP);
                    }
                }
                else {
                    //this proposal type doesn't need any process
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding proporsal process type name", error: error});
            }
        ).then(
            function (stepTypeData) {
                //copy all the steps to process
                if (stepTypeData && stepTypeData.length > 0) {
                    var proms = [];
                    typeData = {};
                    for (var i = 0; i < stepTypeData.length; i++) {
                        typeData[stepTypeData[i]._id] = stepTypeData[i];
                        var step = {
                            type: stepTypeData[i]._id,
                            department: stepTypeData[i].department,
                            role: stepTypeData[i].role
                        };
                        proms.push(dbProposalProcessStep.createProposalProcessStep(step));
                    }
                    return Q.all(proms);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't get steps for proposal process"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error getting proposal type process steps", error: error});
            }
        ).then(
            function (stepData) {
                if (stepData && stepData.length > 0) {
                    var keyMap = {};
                    stepIds = [];
                    var proms = [];
                    for (var j = 0; j < stepData.length; j++) {
                        stepIds.push(stepData[j]._id);
                        keyMap[stepData[j].type] = stepData[j]._id;
                    }

                    //move the headId to the first one in the array
                    var index = stepIds.indexOf(keyMap[firstStepType]);
                    stepIds.splice(index, 1);
                    stepIds.splice(0, 0, keyMap[firstStepType]);

                    //create proposal process
                    proms.push(proposalProcess.createProposalProcess(
                        {
                            type: processTypeId,
                            currentStep: keyMap[firstStepType],
                            steps: stepIds
                        }
                    ));

                    //update all steps for next step
                    for (var j = 0; j < stepData.length; j++) {
                        proms.push(dbconfig.collection_proposalProcessStep.findOneAndUpdate(
                            {_id: stepData[j]._id, createTime: stepData[j].createTime},
                            {
                                nextStepWhenApprove: typeData[stepData[j].type].nextStepWhenApprove ? keyMap[typeData[stepData[j].type].nextStepWhenApprove] : null,
                                nextStepWhenReject: typeData[stepData[j].type].nextStepWhenReject ? keyMap[typeData[stepData[j].type].nextStepWhenReject] : null,
                            }
                        ).exec());
                    }

                    return Q.all(proms);
                }
                else {
                    deferred.reject({name: "DataError", message: "Can't create steps for proposal process"});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating proposal process steps", error: error});
            }
        ).then(
            function (data) {
                if (data && data[0]) {
                    deferred.resolve(data[0]);
                }
                else {
                    deferred.resolve(false);
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error updating proposal process steps", error: error});
            }
        );
        return deferred.promise;
    },

    /**
     * Create a new proposalProcess with type
     * @param {json} data - The data of the proposalProcess. Refer to proposalProcess schema.
     */
    createProposalProcessWithType: function (platformId, typeName) {
        var deferred = Q.defer();
        dbconfig.collection_proposalType.findOne({platformId: platformId, name: typeName}).then(
            function (data) {
                if (data) {
                    return proposalProcess.createProposalProcessWithTypeId(data._id);
                }
                else {
                    deferred.reject({name: "DBError", message: "Cant find proposal process type name: " + typeName});
                }
            },
            function (error) {
                deferred.reject({name: "DBError", message: "Error finding proposal process type name", error: error});
            }
        ).then(
            function(data){
                deferred.resolve(data);
            },
            function(error){
                deferred.reject({name: "DBError", message: "Error creating proposal process", error: error});
            }
        );
        return deferred.promise;
    },
};

module.exports = proposalProcess;