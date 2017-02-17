/******************************************************************
 *        NinjaPandaManagement
 *  Copyright (C) 2015-2016 Sinonet Technology Singapore Pte Ltd.
 *  All rights reserved.
 ******************************************************************/

/*
 * Player permissions
 */
const constPlayerPermissions = {
    //forbidden actions
    NO_CASH_OUT: 0,
    NO_EARLY_CONSUMPTION_RETURN : 1,
    NO_GAME_LOGIN: 2,
    NO_TOP_UP: 3,
    NO_REWARD: 4,

    //privileges
    EARLY_CONSUMPTION_RETURN: 5,
    PRIOR_PROPOSAL: 6
};

module.exports = constPlayerPermissions;