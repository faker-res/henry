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
         * @param custSett - Custom setting
         * @returns {*}
         */
        this.applyPartnerCustomRate = (partnerObjId, commSett, custSett) => {
            commSett = !commSett ? {} : commSett;
            commSett.isCustomized = false;

            if (commSett && commSett.gameProviderGroup && custSett && custSett.some(e => String(e.partner) === String(partnerObjId))) {
                let custObjs = custSett.filter(e => String(e.partner) === String(partnerObjId));
                commSett.isCustomized = true;

                commSett.gameProviderGroup = commSett.gameProviderGroup.map(grp => {
                    custObjs.forEach(e => {
                        if (grp.showConfig && String(grp.showConfig.provider) === String(e.provider) && grp.showConfig.commissionType === e.commissionType) {
                            grp.showConfig = e;
                        }
                    });

                    if (grp.showConfig && grp.showConfig.commissionSetting && grp.showConfig.commissionSetting.length > 0) {
                        grp.showConfig.commissionSetting.forEach(e => {
                            if(grp.srcConfig && grp.srcConfig.commissionSetting && grp.srcConfig.commissionSetting.length > 0) {
                                grp.srcConfig.commissionSetting.forEach(f => {
                                    if (e.playerConsumptionAmountFrom === f.playerConsumptionAmountFrom
                                        && e.playerConsumptionAmountTo === f.playerConsumptionAmountTo
                                        && e.activePlayerValueFrom === f.activePlayerValueFrom
                                        && e.activePlayerValueTo === f.activePlayerValueTo
                                        && Number(e.commissionRate) !== Number(f.commissionRate)
                                    ) {
                                        e.isCustomized = true;
                                    }
                                });
                            }
                        });
                    }

                    return grp;
                });
            }

            // Partner platform rate setting
            if (commSett && commSett.rateAfterRebateGameProviderGroup && custSett.some(e => String(e.partner) === String(partnerObjId))) {
                commSett.isCustomized = true;
                let normalRates = ['rateAfterRebatePromo', 'rateAfterRebatePlatform', 'rateAfterRebateTotalDeposit', 'rateAfterRebateTotalWithdrawal'];
                let custObj = custSett.filter(e => String(e.partner) === String(partnerObjId))[0];

                normalRates.forEach(e => {
                    if (Number(commSett[e]) !== Number(custObj[e])) {
                        custObj.isCustomizedField = custObj.isCustomizedField || [];
                        custObj.isCustomizedField.push(e);
                    }
                });

                if (commSett.rateAfterRebateGameProviderGroup && commSett.rateAfterRebateGameProviderGroup.length > 0) {
                    commSett.rateAfterRebateGameProviderGroup = commSett.rateAfterRebateGameProviderGroup.map(e => {
                        custObj.rateAfterRebateGameProviderGroup.forEach(f => {
                            if (String(e.gameProviderGroupId) === String(f.gameProviderGroupId) && Number(e.rate) !== Number(f.rate)) {
                                f.isCustomized = true;
                                e = Object.assign({}, e, f);
                            }
                        });

                        return e;
                    })
                }

                commSett = Object.assign({}, commSett, custObj);
            }

            return commSett;
        }
    };

    let commonServiceApp = angular.module('commonService', []);

    //Must be a provider since it will be injected into module.config()
    commonServiceApp.provider('commonService', commonService);
});
