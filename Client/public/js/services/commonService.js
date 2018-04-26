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

        this.copyObjToText = function ($translate, ObjToCopy, fieldEnd, modalId) {
            let copiedText = "";
            let objLength;
            if (fieldEnd) {
                objLength = Object.keys(ObjToCopy).indexOf(fieldEnd) + 1;
                if (objLength <= 0) {
                    objLength = Object.keys(ObjToCopy).length;
                }
            } else {
                objLength = Object.keys(ObjToCopy).length;
            }
            for (let i = 0; i < objLength; i++) {
                if (copiedText) {
                    copiedText += " \n";
                }
                copiedText += $translate(Object.keys(ObjToCopy)[i]) + ": " + ObjToCopy[Object.keys(ObjToCopy)[i]];
            }
            copyToClipboard(copiedText, modalId);
        };

        function copyToClipboard(text, modalId) {
            var dummy = document.createElement("TEXTAREA");
            let elementBody;
            if (modalId) {
                elementBody = document.getElementById(modalId)
            } else {
                elementBody = document.body
            }
            elementBody.appendChild(dummy);
            dummy.setAttribute("id", "dummy_id");
            document.getElementById('dummy_id').value = text;
            dummy.select();
            document.execCommand("copy");
            elementBody.removeChild(dummy);
        }

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
                        grp.srcConfig
                        && grp.srcConfig.customSetting
                        && grp.srcConfig.customSetting.length > 0
                        && grp.srcConfig.customSetting.some(e => String(e.partner) === String(partnerObjId))
                    ) {
                        let customRateObjs = grp.srcConfig.customSetting.filter(e => String(e.partner) === String(partnerObjId));

                        grp.srcConfig.commissionSetting = grp.srcConfig.commissionSetting.map(e => {
                            customRateObjs.forEach(f => {
                                if (String(e._id) === String(f.configObjId)) {
                                    e.commissionRate = f.commissionRate;
                                    e.isCustomized = true;
                                    commSett.isCustomized = true;
                                }
                            });

                            return e;
                        })
                    }

                    // Apply to showConfig
                    grp.showConfig = JSON.parse(JSON.stringify(grp.srcConfig));

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
                        commSett.isCustomized = true;
                    }
                })

                if (commSett.rateAfterRebateGameProviderGroup && commSett.rateAfterRebateGameProviderGroup.length) {
                    commSett.rateAfterRebateGameProviderGroup.forEach(e => {
                        let customProviderRateObj = customRateObj.rateAfterRebateGameProviderGroup.filter(cust => String(e.gameProviderGroupId) === String(cust.gameProviderGroupId))[0];

                        if (e.rate != customProviderRateObj.rate) {
                            e.rate = customProviderRateObj.rate;
                            e.isCustomized = true;
                            commSett.isCustomized = true;
                        }
                    })
                }
            }

            return commSett;
        }
    };

    let commonServiceApp = angular.module('commonService', []);

    //Must be a provider since it will be injected into module.config()
    commonServiceApp.provider('commonService', commonService);
});
