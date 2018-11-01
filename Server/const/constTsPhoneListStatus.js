/*
 * Player top up intent record status
 */
const consTsPhoneListStatus = {
    PREDISTRIBUTE: 1,
    DISTRIBUTING: 2,
    NOT_ENOUGH_CALLER: 3,
    MANUAL_PAUSED: 4,
    HALF_COMPLETE: 5,
    COMPLETED: 6,
    FORCE_COMPLETED: 7,
    DECOMPOSED: 8
};

module.exports = consTsPhoneListStatus;