/*
 * System param
 */

const constSystemParam = {
    SALT_WORK_FACTOR: 10,
    MAX_RECORD_NUM: 100,
    REPORT_MAX_RECORD_NUM: 2000,
    MIN_RECORD_NUM: 10,
    //TODO::update this value later
    VALID_PLAYER_TOP_UP_AMOUNT: 100,
    PASSWORD_LENGTH: 6,
    API_AUTH_SECRET_KEY : "$ap1U5eR$", // JWT Secret,
    NO_OF_LOGIN_ATTEMPT: 3 , // minimum no of login attempts failed per connection

    BATCH_SIZE: 1000,

    //CONST STRING
    PROPOSAL_NO_STEP: "PROPOSAL_NO_STEP",

    BANK_ACCOUNT_LENGTH: 16
};

module.exports = constSystemParam;