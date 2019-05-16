const constPartnerCommissionType = {
    CLOSED_COMMISSION: 0,
    DAILY_BONUS_AMOUNT: 1, // deprecated
    WEEKLY_BONUS_AMOUNT: 2,
    BIWEEKLY_BONUS_AMOUNT: 3, // deprecated
    MONTHLY_BONUS_AMOUNT: 4, // deprecated
    WEEKLY_CONSUMPTION: 5, // deprecated
    OPTIONAL_REGISTRATION: 6,
    DAILY_CONSUMPTION:7,

    // note :: default partner would be 'optional_registration' as they should be able to choose which type they going to be
    // however, only daily_consumption and weekly_bonus_amount are used right now
};

module.exports = constPartnerCommissionType;