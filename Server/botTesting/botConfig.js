var botConfig = {
    botPlatformId: process.env.BOT_PLATFORM || "6",
    botPlayerNum: 2,
    testPlayerName: "bot_",
    // botPassword: "123456",
    botPassword: "888888",
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
    minutesPerLogin: 1,
    botPlayerPrefix: "jobot",
    botBankName: "10",
    botBankAccName: "机器人"
};

module.exports = botConfig;