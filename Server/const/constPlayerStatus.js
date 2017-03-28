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
    ATTENTION: 5 //"ATTENTION"
};

module.exports = constPlayerStatus;