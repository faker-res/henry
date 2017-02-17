/*
 * All Platform task status
 */
const constPlatformStatus = {
    //platform is ready for any settlement
    READY: "Ready",
    //platform is doing daily settlement
    DAILY_SETTLEMENT: "DailySettlement",
    //platform is doing weekly settlement
    WEEKLY_SETTLEMENT: "WeeklySettlement",
    //there was some problem with the latest settlement attempt
    DAILY_ERROR: "DailyError",
    WEEKLY_ERROR: "WeeklyError",
};

module.exports = constPlatformStatus;