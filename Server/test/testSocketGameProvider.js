var should = require('should');
var socketConnection = require('../test_modules/socketConnection');

describe("Test Game Provider", function () {

    var formName="";
    var gameProviderObjId = null;

    /* Test 1 - Create a game Provider */
    it('Should create the game Provider', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var date = new Date().getTime();
            var gameProviderData = {
                name: "testGameProviderName" + date,
                nickName: "Froggy Games",
                code: "FGXN" + date
            }
            socket.emit('createGameProvider', gameProviderData);
            socket.once('_createGameProvider', function (data) {
                socket.close();
                if (data.success) {
                    gameProviderObjId =data.data._id;
                    done();
                }
            });
        });
    });

    /* Test 2 - update a gameProvider */
    it('Should update gameProvider', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            var date = new Date().getTime();
            formName = "testGameProviderName-update" + date;
            var updateData = {
                query: {_id: gameProviderObjId},
                updateData: {name: formName}
            };

            socket.emit('updateGameProvider', updateData);
            socket.once('_updateGameProvider', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });

    /* Test 3 - get a gameProvider Info */
    it('Should get gameProvider Info', function (done) {

        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);
            var gameProviderData = {
                _id: gameProviderObjId
            }
            socket.emit('getGameProvider', gameProviderData);
            socket.once('_getGameProvider', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


    it('Should get all gameProvider', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('getAllGameProviders', {});
            socket.once('_getAllGameProviders', function (data) {
                socket.close();
                if (data.success) {
                    done();
                    //console.log(data);
                }
            });
        });
    });

    /* Test 4 - delete a gameProvider  */
    it('Should delete gameProvider', function (done) {
        socketConnection.createConnection().then(function (socket) {
            socket.connected.should.equal(true);

            socket.emit('deleteGameProvider', {_id: gameProviderObjId});
            socket.once('_deleteGameProvider', function (data) {
                socket.close();
                if (data.success) {
                    done();
                }
            });
        });
    });


});
