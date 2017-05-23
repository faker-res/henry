const constServerCode = {
    //SUCCESS
    SUCCESS: 200,

    //ERRORS
    COMMON_ERROR: 400,
    DB_ERROR: 500,
    INVALID_API_USER: 420,

    // Client API Server code
    INVALID_USER_PASSWORD: 401,
    INVALID_CAPTCHA: 402,
    GENERATE_VALIDATION_CODE_ERROR: 403,
    USERNAME_ALREADY_EXIST: 404,
    INVALID_PARAM: 405,
    INVALID_PHONE_NUMBER: 406,
    INVALID_PROPOSAL: 406,
    INVALID_OLD_PASSWORD: 407,
    DATABASE_CONNECTION_FAILURE: 408,
    PERMISSION_DENIED: 409,
    SEARCH_OUT_OF_RANGE: 410,
    SESSION_EXPIRED: 411,
    PAYMENT_NOT_AVAILABLE: 413,
    PLAYER_NOT_ENOUGH_CREDIT: 415,
    PARTNER_NOT_ENOUGH_CREDIT: 415,
    PLAYER_CREDIT_BALANCE_NOT_ENOUGH: 416,
    PLAYER_INVALID_PAYMENT_INFO: 417,
    PLAYER_NO_PERMISSION: 418,
    PLAYER_PENDING_PROPOSAL: 419,
    PLAYER_TOP_UP_FAIL: 426,
    REWARD_EVENT_INVALID: 421,
    PLAYER_NOT_VALID_FOR_REWARD: 422,
    PLAYER_APPLY_REWARD_FAIL: 423,
    PLAYER_HAS_REWARD_TASK: 424,
    CP_NOT_AVAILABLE: 425,
    PLAYER_REWARD_INFO: 427,
    PLAYER_TRANSFER_OUT_ERROR: 428,
    PLAYER_TRANSFER_IN_ERROR: 429,
    PLAYER_IS_FORBIDDEN: 430,
    DATA_INVALID: 431,
    PLAYER_NAME_INVALID: 432,
    PARTNER_NAME_INVALID: 433,
    VALIDATION_CODE_INVALID: 434,
    VALIDATION_CODE_EXPIRED: 435,
    PLAYER_PENDING_REWARD_PROPOSAL: 436,
    TEST_GAME_REQUIRE_LOGIN: 430,
    INVALID_REFERRAL: 437,
    INVALID_PLATFORM: 438,

    // Payment API Server code
    INVALID_PAYMENT_SERVICE_GATEWAY: 401,
    CONSUMPTION_ORDERNO_ERROR: 421,

    //Provider API Server Code
    INVALID_CONTENT_PROVIDER: 401,
    OPERATION_FAIL: 402,
    INVALID_DATA: 403,


    DOCUMENT_NOT_FOUND: 420,
    EXTERNAL_API_TIMEOUT: 430,
    PARTNER_IS_FORBIDDEN:430

};

module.exports = constServerCode;
