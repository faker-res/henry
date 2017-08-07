/*
 * Player Status
 */
const constPlayerStatus = {
    NORMAL:1 ,// "Normal",
    //player can't play game but can login
    FORBID_GAME: 2 ,//"ForbidGame"
    //player can't login
    FORBID: 3, //"Forbid"
    BALCKLIST: 4, //"BALCKLIST"
    ATTENTION: 5, //"ATTENTION"
    CANCELS: 6,
    CHEAT_NEW_ACCOUNT_REWARD: 7,
    TOPUP_ATTENTION: 8,
    HEDGING: 9,
    TOPUP_BONUS_SPAM: 10,
    MULTIPLE_ACCOUNT: 11,
    BANNED: 12

};

module.exports = constPlayerStatus;