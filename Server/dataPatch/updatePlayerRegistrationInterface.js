const dbconfig = require("../modules/dbproperties");
const constPlayerRegistrationInterface = require("../const/constPlayerRegistrationInterface");

let playerProm = dbconfig.collection_players.find({}).lean();

playerProm.then(
    players => {
        for (let p = 0, len = players.length; p < len; p++) {
            let player = players[p];

            let registrationInterface = constPlayerRegistrationInterface.BACKSTAGE;

            // determine registrationInterface
            if (player.domain && player.domain.indexOf('fpms8') !== -1) {
                registrationInterface = constPlayerRegistrationInterface.BACKSTAGE;
            }
            else if (player.userAgent && player.userAgent[0]) {
                let userAgent = player.userAgent[0];
                if (userAgent.browser.indexOf("WebKit") !== -1 || userAgent.browser.indexOf("WebView") !== -1) {
                    if (player.partner) {
                        registrationInterface = constPlayerRegistrationInterface.APP_AGENT;
                    }
                    else {
                        registrationInterface = constPlayerRegistrationInterface.APP_PLAYER;
                    }
                }
                else if (userAgent.os.indexOf("iOS") !== -1 || userAgent.os.indexOf("ndroid") !== -1 || userAgent.browser.indexOf("obile") !== -1) {
                    if (player.partner) {
                        registrationInterface = constPlayerRegistrationInterface.H5_AGENT;
                    }
                    else {
                        registrationInterface = constPlayerRegistrationInterface.H5_PLAYER;
                    }
                }
                else {
                    if (player.partner) {
                        registrationInterface = constPlayerRegistrationInterface.WEB_AGENT;
                    }
                    else {
                        registrationInterface = constPlayerRegistrationInterface.WEB_PLAYER;
                    }
                }
            }

            dbconfig.collection_players.update({_id: player._id, platform: player.platform}, {registrationInterface: registrationInterface}).lean().then(
                data => {
                    //
                }
            );
        }
    }
);