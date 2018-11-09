/*
 * Player top up intent record status
 */
const constTsPhoneListStatus = {
    PRE_DISTRIBUTION: 0,
    DISTRIBUTING: 1,
    NOT_ENOUGH_CALLER: 2,
    MANUAL_PAUSED: 3,
    HALF_COMPLETE: 4,
    COMPLETED: 5,
    FORCE_COMPLETED: 6,
    DECOMPOSED: 7
};

module.exports = constTsPhoneListStatus;

