/*
 * System param
 */

const constSystemParam = {
    SALT_WORK_FACTOR: 10,
    MAX_RECORD_NUM: 100,
    REPORT_MAX_RECORD_NUM: 1000,
    MIN_RECORD_NUM: 10,
    //TODO::update this value later
    VALID_PLAYER_TOP_UP_AMOUNT: 100,
    PASSWORD_LENGTH: 6,
    MAX_API_CALL_PER_SEC: 20,

    API_AUTH_SECRET_KEY : "$ap1U5eR$", // JWT Secret,
    PMS2_AUTH_SECRET_KEY : "FpM$t0pM$2",
    DAYOU_AUTH_SECRET_KEY: "ec12ef84a1439714d7c3e047c19abd9c",

    NO_OF_LOGIN_ATTEMPT: 2, // minimum no of login attempts failed per connection

    BATCH_SIZE: 500,

    //CONST STRING
    PROPOSAL_NO_STEP: "PROPOSAL_NO_STEP",

    BANK_ACCOUNT_LENGTH: 16,

    PROPOSAL_SEARCH_MAX_TIME_FRAME: 691200000, // 8 days ( 8 * (1000*3600*24))

    UPDATE_RECURSE_MAX_RETRY: 5,
    FTP_CONNECTION_PROPERTIES: {
        host: "callfpms-ftp.neweb.me",
        port: 21,
        user: 'hank',
        password: "CallHank@163",
        mode: 'Active'
    },
    FTP_URL: "https://callfpms-ftp.neweb.me",
    TINIFY_API_KEY: "xfBMk74pSR4z3B0wxC7R16qY87JvWNP9", // get the api key from Hank
    TINIFY_DEV_API_KEY: "Db3dqwprnM5wscR7wZn3KpF6NJNtP7LR"
};

module.exports = constSystemParam;