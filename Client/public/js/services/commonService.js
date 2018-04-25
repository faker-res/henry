'use strict';

define([], () => {
    let commonService = function () {
        this.cookieTokenKey = 'sinonet-management-token';
        this.cookieAdminIdKey = 'sinonet-management-adminId';
        this.cookieAdminNameKey = 'sinonet-management-adminName';
        this.cookiePolicyKey = 'sinonet-management-role';
        this.cookieDepartmentKey = 'sinonet-management-departments';
        this.cookieLanguageKey = 'sinonet-management-language';
        this.cookiePlatformKey = 'sinonet-management-platform';

        let self = this;

        this.$get = function () {
            return this;
        };

        this.updatePageTile = ($translate, pageName, tabName) => {
            window.document.title = $translate(pageName) + "->" + $translate(tabName);
            $(document).one('shown.bs.tab', function (e) {
                $(document).trigger('resize');
            });
        };

        /**
         * Check if partner has custom rate
         * @param partnerObjId
         * @param commSett
         * @returns {*}
         */
        this.applyPartnerCustomRate = (partnerObjId, commSett) => {
            if (commSett && commSett.gameProviderGroup) {
                commSett.gameProviderGroup = commSett.gameProviderGroup.map(grp => {
                    if (
                        grp.srcConfig.customSetting
                        && grp.srcConfig.customSetting.length > 0
                        && grp.srcConfig.customSetting.some(e => String(e.partner) === String(partnerObjId))
                    ) {
                        let customRateObj = grp.srcConfig.customSetting.filter(e => String(e.partner) === String(partnerObjId))[0];

                        grp.srcConfig.commissionSetting = grp.srcConfig.commissionSetting.map(e => {
                            if (String(e._id) === String(customRateObj.configObjId)) {
                                e.commissionRate = customRateObj.commissionRate;
                                e.isCustomized = true;
                                commSett.isCustomized = true;
                            }

                            return e;
                        })
                    }

                    // Apply to showConfig
                    grp.showConfig = grp.srcConfig;

                    return grp;
                });
            }

            // Partner platform rate setting
            if (commSett && commSett.customRate && commSett.customRate.some(e => String(e.partner) === String(partnerObjId))) {
                let normalRates = ['rateAfterRebatePromo', 'rateAfterRebatePlatform', 'rateAfterRebateTotalDeposit', 'rateAfterRebateTotalWithdrawal'];
                let customRateObj = commSett.customRate.filter(e => String(e.partner) === String(partnerObjId))[0];

                normalRates.forEach(e => {
                    if (commSett[e] != customRateObj[e]) {
                        commSett[e] = customRateObj[e];
                        commSett.isCustomizedField = commSett.isCustomizedField || [];
                        commSett.isCustomizedField.push(e);
                    }
                })
            }

            return commSett;
        }
    };

    let commonServiceApp = angular.module('commonService', []);

    //Must be a provider since it will be injected into module.config()
    commonServiceApp.provider('commonService', commonService);
});
