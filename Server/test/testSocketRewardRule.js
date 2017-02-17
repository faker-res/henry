var should = require('should');
var socketConnection = require('../test_modules/socketConnection');
var commonTestFunc = require('../test_modules/commonTestFunc');

describe("Test Reward Rule", function () {

    var rewardRuleObjId = null;

    var rewardTypeObjId = null;
    var rewardConditionObjId = null;
    var rewardParamObjId = null;


    it('Should create test reward rule', function (done) {

        commonTestFunc.createTestRewardRule().then(
            function (data) {
                rewardRuleObjId = data._id;
                done();
            },
            function (error) {
                console.error(error);
            }
        );
    });

    it('Should update reward rule', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            var formName = "testRewardRule" + date;
            var rewardRuleData = {
                query: {_id : rewardRuleObjId},
                updateData: { name: formName }
            };
            socket.emit('updateRewardRule', rewardRuleData);
            socket.once('_updateRewardRule', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should delete reward rule', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var rewardRuleData = {
                _ids: [rewardRuleObjId]
            };
            socket.emit('deleteRewardRuleByIds', rewardRuleData);
            socket.once('_deleteRewardRuleByIds', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    it('Should create a rewardCondition', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            formName = "test-rewardConditionName" + date;

            var rewardConditionData = {
                name: formName,
                condition: { "Cond1" : "CondA", "Cond2" : "CondB" }
            };

            socket.emit('createRewardCondition', rewardConditionData);
            socket.once('_createRewardCondition', function (data) {
                socket.close();
                if (data.success) {
                    rewardConditionObjId = data.data._id;
                    done();
                }
            });
        });
    });

    it('Should get all reward types', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllRewardTypes');
            socket.once('_getAllRewardTypes', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

});

