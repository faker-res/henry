/******************************************************************
 *        NinjaPandaManagement-WS
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

var botConfig = {
    botPlatformId: process.env.BOT_PLATFORM || "4",
    botPlayerNum: 2,
    testPlayerName: "bot_",
    botPassword: "123456",
    minTopUpTimes: 1,
    maxTopUpTimes: 3,
    minTopUpAmount: 10,
    maxTopUpAmount: 300,
    minConsumptionTimes: 1,
    maxConsumptionTimes: 10,
    minConsumptionAmount: 0.5,
    maxConsumptionAmount: 100,
    testApiUserData: {
        role: "botTesting",
        name: "botTesting",                  // Required for payment login (See payment/ConnectionServiceImplement.js)
        userName: "testClientApiUsername",   // Required for provider login (See provider/ConnectionServiceImplement.js)
        password: "123"
    },
};

module.exports = botConfig;