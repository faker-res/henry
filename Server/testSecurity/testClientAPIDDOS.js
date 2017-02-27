"use strict";

require('../modules/debugTools').init();

var services = require('../modules/services');

var options = {
    numberOfConnectionsToOpen: 200,
    numberOfMessagesToSend: 0,
};

var loginAccount = null;

function openAConnectionAndSpamIt () {
    services.getClientClient(loginAccount, {autoReconnect: false}).then(
        clientClient => {
            //console.log("clientClient:", clientClient);
            clientClient.addEventListener('message', message => {
                console.log("message:", message);
            });
            clientClient.addEventListener('close', () => {
                console.log(`Disconnected from client.`);
            });

            for (var i = 0; i < options.numberOfMessagesToSend; i++) {
                // This emits a log on the server:
                clientClient._connection.send('SPAM', {data: 'SPAM_PAYLOAD_SPAM_PAYLOAD_SPAM_PAYLOAD_SPAM_PAYLOAD_SPAM_PAYLOAD_'});
                // This causes the connection to close immediately:
                //clientClient._connection.send({service: 'client', functionName: 'anything', data: {}});
                // This does nothing:
                //clientClient._connection.emit('login', JSON.stringify({service: 'client', functionName: 'login', data: {}}));
            }
        }
    ).catch(console.error);
}

for (var i = 0; i < options.numberOfConnectionsToOpen; i++) {
    openAConnectionAndSpamIt();
}