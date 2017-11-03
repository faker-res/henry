/*
 * All reward task status
 */
const constRewardTaskStatus = {
    STARTED: "Started",
    ACHIEVED: "Achieved",
    COMPLETED: "Completed",
    NO_CREDIT: "NoCredit",
    // Unlock due to system wide operation, such as provider group removed
    SYSTEM_UNLOCK: "SystemUnlock"
};

module.exports = constRewardTaskStatus;