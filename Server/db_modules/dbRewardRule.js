var dbconfig = require('./../modules/dbproperties');

var Q = require("q");

var dbRewardRule = {

    /**
     * Create a new reward rule
     * @param {json} rewardData - The data of the reward rule. Refer to rewardRule schema.
     */
    createRewardRule: function (rewardRuleData) {
        var rewardRule = new dbconfig.collection_rewardRule(rewardRuleData);
        return rewardRule.save();
    },

    /**
     * Create a new reward rule
     * @param {String} typeName - reward rule type name
     * @param {json} data - The data of the reward rule. Refer to rewardRule schema.
     */
    createRewardRuleWithType: function (typeName, ruleData) {
        var deferred = Q.defer();
        //var proposalProm = dbconfig.collection_proposalType.findOne({name: typeName}).exec();
        var rewardProm = dbconfig.collection_rewardType.findOne({name: typeName}).exec();

        //todo::refactor here
        Q.all([rewardProm]).then(
            function(data){
                if( data && data[0] ){
                    ruleData.rewardType = data[0]._id;
                    ruleData.executeProposal = typeName;
                    var rewardRule = new dbconfig.collection_rewardRule(ruleData);
                    rewardRule.save().then(
                        function(data){
                            if( data ){
                                deferred.resolve(data);
                            }
                            else{
                                deferred.reject({name: "DBError", message: "Can't create reward rule with type"});
                            }
                        },
                        function(error){
                            deferred.reject({name: "DBError", message: "Error creating reward rule with type", error: error});
                        }
                    );
                }
                else{
                    deferred.reject({name: "DataError", message: "Can't find proposal type and reward type for name"});
                }
            }
        ).catch(
            function (error) {
                deferred.reject({name: "DBError", message: "Error creating reward rule with type", error: error});
            });

        return deferred.promise;
    },

    /**
     * Get a reward rule by id
     * @param {String} query - The query string
     */
    getRewardRule: function (query) {
        return dbconfig.collection_rewardRule.findOne(query).populate({path: "rewardType", model: dbconfig.collection_rewardType}).exec();
    },

    /**
     * Get all reward rules
     */
    getAllRewardRule: function () {
        return dbconfig.collection_rewardRule.find({}).exec();
    },

    /**
     * Update one reward rule
     * @param {String} query - The query string
     * @param {Json} updateData - The update data
     */
    updateRewardRule: function (query, updateData) {
        return dbconfig.collection_rewardRule.findOneAndUpdate(query, updateData).exec();
    },

    /**
     * Delete reward rule by ids
     * @param {Array} ids - The query string
     */
    deleteRewardRuleByIds: function (ids) {
        return dbconfig.collection_rewardRule.remove({_id: {$in: ids}}).exec();
    },

};

module.exports = dbRewardRule;