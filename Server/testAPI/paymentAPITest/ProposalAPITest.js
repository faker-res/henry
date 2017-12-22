(function () {
    var isNode = (typeof module !== 'undefined' && module.exports);

    var ProposalAPITest = function (service) {
        this._service = service;

        // this.testChannelObjId = null;
        // this.testChannelName = "testProposal";
    };

    var proto = ProposalAPITest.prototype;

    var platformObjId = null;
    var proposalTypeId = null;
    var proposalId = null;

    //////////////////////////////// Init Proposal Data - Start ///////////////////////

    if (isNode) {

        var constProposalPriority = require('./../../const/constProposalPriority');
        var constProposalEntryType = require('./../../const/constProposalEntryType');
        var constProposalUserType = require('./../../const/constProposalUserType');
        var constProposalType = require('./../../const/constProposalType');
        var dbPlatform = require('./../../db_modules/dbPlatform');
        var dbProposal = require('./../../db_modules/dbProposal');
        var dbProposalType = require('./../../db_modules/dbProposalType');


        var Q = require('q');

        proto.initGetPlatform = function (callback, requestData) {
            var deferred = Q.defer();
            dbPlatform.getPlatform({
                    name: "testClientPlatform"  // get Platform
                }
            ).then(
                function (data) {
                    platformObjId = data._id;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };


        proto.initGetProposalType = function (callback, requestData) {
            var deferred = Q.defer();
            dbProposalType.getProposalType({
                    name: constProposalType.PLAYER_TOP_UP  // get proposal type
                }
            ).then(
                function (data) {
                    proposalTypeId = data._id;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in getting platform", error: error});
                }
            );
            return deferred.promise;
        };

        proto.initCreateProposal = function (callback, requestData) {
            var deferred = Q.defer();
            var inputProposal = {
                type: proposalTypeId,
                priority: constProposalPriority.GENERAL,
                entryType: constProposalEntryType.ADMIN,
                userType: constProposalUserType.PLAYERS
            };

            dbProposal.createProposal(inputProposal).then(
                function (data) {
                    proposalId = data.proposalId;
                    deferred.resolve(data);
                },
                function (error) {
                    deferred.reject({name: "DBError", message: "Error in creating proposal", error: error});
                }
            );
            return deferred.promise;
        };

    }
    //////////////////////////////// Init Proposal Data - Just to run on server site ///////////////////////

    proto.topupSuccess = function (callback, requestData) {

        var data = requestData ||
            {
                proposalId: proposalId,
                amount: 200
            };
        this._service.topupSuccess.request(data);
        var self = this;
        this._service.topupSuccess.once(function (data) {
            //self.testChannelObjId = data.data._id;
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.topupFail = function (callback, requestData) {
        var data = requestData ||
            {
                proposalId: proposalId,
                money: 200
            };
        this._service.topupFail.request(data);
        var self = this;
        this._service.topupFail.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.applyBonusSuccess = function (callback, requestData) {
        var data = requestData || {proposalId: ""};
        this._service.applyBonusSuccess.request(data);
        var self = this;
        this._service.applyBonusSuccess.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.applyBonusFail = function (callback, requestData) {
        var data = requestData || {proposalId: ""};
        this._service.applyBonusFail.request(data);
        var self = this;
        this._service.applyBonusFail.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.setTopupProposalStatus = function (callback, requestData) {
        var data = requestData || {proposalId: "", orderStatus: "", depositID: ""};
        this._service.setTopupProposalStatus.request(data);
        var self = this;
        this._service.setTopupProposalStatus.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.setBonusProposalStatus = function (callback, requestData) {
        var data = requestData || {proposalId: "", orderStatus: "", bonusID: ""};
        this._service.setBonusProposalStatus.request(data);
        var self = this;
        this._service.setBonusProposalStatus.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getProposalById = function (callback, requestData) {
        var data = requestData || {proposalId: ""};
        this._service.getProposalById.request(data);
        var self = this;
        this._service.getProposalById.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getProposalList = function (callback, requestData) {
        var data = requestData || {queryId: "123"};
        this._service.getProposalList.request(data);
        var self = this;
        this._service.getProposalList.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getBankcardListByGroup = function (callback, requestData) {
        var data = requestData ;
        this._service.getBankcardListByGroup.request(data);
        var self = this;
        this._service.getBankcardListByGroup.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.getMerchantIdListByGroup = function (callback, requestData) {
        var data = requestData ;
        this._service.getMerchantIdListByGroup.request(data);
        var self = this;
        this._service.getMerchantIdListByGroup.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    proto.addTestTopUp = function (callback, requestData) {
        this._service.addTestTopUp.request(requestData);
        this._service.addTestTopUp.once(function (data) {
            if (callback && typeof callback === "function") {
                callback(data);
            }
        });
    };

    if (isNode) {
        module.exports = ProposalAPITest;
    } else {
        define([], function () {
            return ProposalAPITest;
        });
    }

})();
