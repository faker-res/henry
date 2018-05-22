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

        function getBankCardTypeTextbyId (allBankTypeList, id) {
            if (!allBankTypeList) {
                return id;
            } else {
                return allBankTypeList[id];
            }
        }

        self.getRewardList = ($scope, platformObjId) => {
            return $scope.$socketPromise('getRewardEventsForPlatform', {platform: platformObjId})
                .then(data => data.data)
        };

        self.getPromotionTypeList = ($scope, platformObjId) => {
            return $scope.$socketPromise('getPromoCodeTypes', {
                platformObjId: platformObjId,
                deleteFlag: false
            }).then(data => data.data)
        };

        self.getAllAlipaysByAlipayGroup = ($scope, platformObjId) => {
            return $scope.$socketPromise('getAllAlipaysByAlipayGroup', {platform: platformObjId})
                .then(data => data && data.data && data.data.data ? data.data.data : false)
        };

        self.getAllWechatpaysByWechatpayGroup = ($scope, platformObjId) => {
            return $scope.$socketPromise('getAllWechatpaysByWechatpayGroup', {platform: platformObjId})
                .then(data => data && data.data && data.data.data ? data.data.data : false)
        };

        self.getAllBankCard = ($scope, $translate, platformObjId, allBankTypeList) => {
            return $scope.$socketPromise('getAllBankCard', {platform: platformObjId}).then(
                data => {
                    let bankCards = data && data.data && data.data.data ? data.data.data : false;

                    bankCards.forEach(bank => {
                        let bankStatus = $translate(bank.status);
                        bank.displayText = getBankCardTypeTextbyId(allBankTypeList, bank.bankTypeId) + ' - ' + bank.name
                            + ' ('+bank.accountNumber+') - ' + bankStatus;
                    });

                    bankCards.sort(function (a, b) {
                        return a.bankTypeId - b.bankTypeId;
                    });

                    return bankCards
                }
            )
        };

        self.getPlatformProvider = function ($scope, id) {
            if (!id) return;

            return $scope.$socketPromise('getPlatform', {_id: id}).then(data => data.data.gameProviders)
        };

        self.getBankTypeList = ($scope) => {
            return $scope.$socketPromise('getBankTypeList', {}).then(
                data => {
                    if (data && data.data && data.data.data) {
                        let allBankTypeList = {};

                        data.data.data.forEach(item => {
                            if (item && item.bankTypeId) {
                                allBankTypeList[item.id] = item.name + ' (' + item.id + ')';
                            }
                        });

                        return allBankTypeList;
                    }
                }
            )
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

        this.convertDOBDateFormat = function (DOBDate) {
            // conversion to new Date() from ISOString date format by using toLocaleString() will have delay after year 1982
            // the delay will result wrong displaying date
            // solution to this: generat the string format from new Date() by using basic functions (getFullYear(), geMonth(), getDate())
            if (DOBDate) {

                let displayedDOB = new Date(DOBDate);
                var y = displayedDOB.getFullYear();
                var m = displayedDOB.getMonth() + 1;
                if (m < 10) {
                    m = '0' + m;
                }

                var d = displayedDOB.getDate();
                if (d < 10) {
                    d = '0' + d;
                }

                return y + "-" + m + "-" + d
            }
        };

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

                            // Change to percentage format
                            e.commissionRate = e.commissionRate * 100;
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

        this.isIdInList = (list, id) => {
            if (!id) {
                return true;
            }
            if (!list instanceof Array) {
                return false;
            }

            for (let i = 0; i < list.length; i++) {
                let item = list[i];
                if (item.id == id) {
                    return true;
                }
            }

            let sixDigitRegex = /^\d{6}$/;
            return Boolean(sixDigitRegex.test(id));
        };

        this.convertDepartment = (platformData) => {
            let showPlatform = $.extend({}, platformData);

            if (showPlatform.live800CompanyId && showPlatform.live800CompanyId.length > 0) {
                showPlatform.live800CompanyIdTXT = showPlatform.live800CompanyId.join(',');
            }
            if (showPlatform.csDepartment && showPlatform.csDepartment.length > 0) {
                showPlatform.csDepartmentTXT = combinePlatformDepart(showPlatform.csDepartment);
            }
            if (showPlatform.qiDepartment && showPlatform.qiDepartment.length > 0) {
                showPlatform.qiDepartmentTXT = combinePlatformDepart(showPlatform.qiDepartment);
            }
            if (showPlatform.csDepartment && showPlatform.csDepartment.length > 0) {
                showPlatform.csDepartmentTXT = combinePlatformDepart(showPlatform.csDepartment);
            }
            if (showPlatform.qiDepartment && showPlatform.qiDepartment.length > 0) {
                showPlatform.qiDepartmentTXT = combinePlatformDepart(showPlatform.qiDepartment);
            }

            return showPlatform;

            function combinePlatformDepart (dpts) {
                let dptArr = [];
                dpts.forEach(item => {
                    dptArr.push(item.departmentName);
                });
                return dptArr.join(',');
            };
        };
    };

    let commonServiceApp = angular.module('commonService', []);

    //Must be a provider since it will be injected into module.config()
    commonServiceApp.provider('commonService', commonService);
});
