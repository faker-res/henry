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

        self.getAllAlipaysByAlipayGroup = ($scope, $translate, platformObjId) => {
            return $scope.$socketPromise('getAllAlipaysByAlipayGroup', {platform: platformObjId})
                .then(data=>{
                    let alipayAccs = data && data.data && data.data.data ? data.data.data : false;
                    alipayAccs.forEach(alipayAcc=>{
                        let stateName = $translate(alipayAcc.state == 'DISABLED' ? 'DISABLE' : alipayAcc.state);
                        alipayAcc.displayText = alipayAcc.accountNumber +' '+ alipayAcc.name + ' (' + stateName+')'
                    })
                    return alipayAccs
                })
        };

        self.getAllWechatpaysByWechatpayGroup = ($scope, $translate, platformObjId) => {
            return $scope.$socketPromise('getAllWechatpaysByWechatpayGroup', {platform: platformObjId})
                .then(data=>{
                    let wechatAccs = data && data.data && data.data.data ? data.data.data : false;
                    wechatAccs.forEach(wechatAcc=>{
                        let stateName = $translate(wechatAcc.state == 'DISABLED' ? 'DISABLE' : wechatAcc.state);
                        wechatAcc.displayText = (wechatAcc.nickName || '') + ' ' + wechatAcc.accountNumber + ' (' + stateName+')'
                    })
                    return wechatAccs;
                })
        };

        self.getAllBankCard = ($scope, $translate, platformObjId, allBankTypeList) => {
            return $scope.$socketPromise('getAllBankCard', {platform: platformObjId}).then(
                data => {
                    let bankCards = data && data.data && data.data.data ? data.data.data : false;

                    bankCards.forEach(bank => {
                        let bankStatus = $translate(bank.status == 'DISABLED' ? 'DISABLE' : bank.status);
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

        self.getKeyFromValue = function (object, value) {
            let refKey = null;
            if (object && value){

                for (let key in object){
                    if (object[key] == value) {
                        refKey = key
                        break;
                    }
                }
            }
            return refKey
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

        self.getRewardEventsByPlatform = ($scope, platformObjId) => {
            return $scope.$socketPromise('getRewardEventsForPlatform', {platform: platformObjId}).then(data => data.data)
        };

        self.getRewardPointsEvent = ($scope, platformObjId) => {
            return $scope.$socketPromise('getRewardPointsEvent', {platformObjId: platformObjId}).then(data => data.data)
        };

        self.getPlayerFeedbackTopic = ($scope, platformObjId) => {
            return $scope.$socketPromise('getPlayerFeedbackTopic', {platform: platformObjId}).then(data => data.data)
        };

        self.getPartnerFeedbackTopic = ($scope, platformObjId) => {
            return $scope.$socketPromise('getPartnerFeedbackTopic', {platform: platformObjId}).then(data => data.data)
        };

        self.getAllPartnerCommSettPreview = ($scope, platformObjId) => {
            return $scope.$socketPromise("getAllPartnerCommSettPreview", {platformObjId: platformObjId}).then(data => data.data)
        };

        self.getAllPlayerFeedbackResults = function ($scope) {
            return $scope.$socketPromise('getAllPlayerFeedbackResults').then(data => data.data)
        };

        self.getAllPlayerFeedbackTopics = function ($scope) {
            return $scope.$socketPromise('getAllPlayerFeedbackTopics').then(data => data.data)
        };

        self.getAllPlayerLevels = function ($scope, platformObjId) {
            return $scope.$socketPromise('getPlayerLevelByPlatformId', {platformId: platformObjId}).then(data => data.data)
        };

        self.getAllPartnerFeedbackResults = function ($scope) {
            return $scope.$socketPromise('getAllPartnerFeedbackResults').then(data => data.data)
        };

        self.getAllPartnerFeedbackTopics = function ($scope) {
            return $scope.$socketPromise('getAllPartnerFeedbackTopics').then(data => data.data)
        };

        self.getAllGameTypes = function ($scope) {
            return $scope.$socketPromise('getGameTypeList').then(
                data => {
                    let gameTypes = data.data;
                    let allGameTypes = {};
                    gameTypes.forEach(
                        gameType => {
                            allGameTypes[gameType.gameTypeId] = gameType.name;
                        }
                    );

                    return [gameTypes, allGameTypes]
                }
            );
        };

        self.getAllRewardTypes = function ($scope) {
            return $scope.$socketPromise('getAllRewardTypes').then(data => data.data)
        };

        self.getAllGameProviders = function ($scope, platformId) {
            if (!platformId) return;
            return $scope.$socketPromise('getPlatform', {_id: platformId}).then(
                data => {
                    let allGameProviders = data.data.gameProviders;
                    let gameProvidersList = {};
                    allGameProviders.map(provider => {
                        gameProvidersList[provider._id] = provider;
                    });

                    return [allGameProviders, gameProvidersList];
                }
            )
        };

        self.resetDropDown = function(el){
            $(el).val('').selectpicker("refresh");
        };

        self.getCredibilityRemarks = function ($scope, platformObjId) {
            return $scope.$socketPromise("getCredibilityRemarks", {platformObjId: platformObjId}).then(data => data.data)
        };

        self.getPlatformRewardProposal = function ($scope, platformObjId) {
            return $scope.$socketPromise("getPlatformRewardProposal", {platform: platformObjId}).then(data => data.data)
        };

        self.getAllPromoCodeUserGroup = function ($scope, platformObjId) {
            return $scope.$socketPromise("getAllPromoCodeUserGroup", {platformObjId: platformObjId}).then(data => data.data)
        };

        self.getPlatformProviderGroup = ($scope, platformObjId) => {
            return $scope.$socketPromise('getPlatformProviderGroup', {platformObjId: platformObjId}).then(
                data => {
                    if (data) {
                        let gameProviderGroup = data.data;
                        let gameProviderGroupNames = {};

                        for (let i = 0; i < gameProviderGroup.length; i++) {
                            let providerGroup = gameProviderGroup[i];
                            gameProviderGroupNames[providerGroup._id] = providerGroup.name;
                        }

                        return [gameProviderGroup, gameProviderGroupNames];
                    }
                }
            );
        };

        self.getAllThemeSetting = function ($scope, platformObjId) {
            return $scope.$socketPromise("getAllThemeSetting").then(data => data.data)
        };

        self.getAllTSPhoneList = function ($scope, platformObjId) {
            return $scope.$socketPromise("getAllTSPhoneList", {platformObjId: platformObjId}).then(data => data.data)
        };

        self.getTSPhoneListName = function ($scope, query) {
            return $scope.$socketPromise("getTSPhoneListName", query).then(data => data.data)
        };

        self.getAllDepartmentInfo = function ($scope, platformObjId, platformName) {
            return $scope.$socketPromise("getDepartmentDetailsByPlatformObjId", {platformObjId: platformObjId}).then(
                data => {
                    let parentId;
                    let queryDepartments = [];
                    let queryRoles = [];
                    let queryAdmins = [];

                    queryDepartments.push({_id: '', departmentName: 'N/A'});

                    data.data.map(e => {
                        if (e.departmentName === platformName) {
                            queryDepartments.push(e);
                            parentId = e._id;
                        }
                    });

                    data.data.map(e => {
                        if (String(parentId) === String(e.parent)) {
                            queryDepartments.push(e);
                        }
                    });

                    return [queryDepartments, queryRoles, queryAdmins];
                }
            )
        };

        self.getAllAutoFeedback = function($scope, platformObjId) {
            return $scope.$socketPromise('getAllAutoFeedback', {platformObjId: platformObjId})
                .then(data => data.data.data);
        };

        self.getPMSDevices = function(num){
            // PMS definition of device type
            // Web: 1, H5: 2, Both: 3, App:4
            let result = 7;
            switch (num) {
                case 1:
                    result = 1;
                    break;
                case 2:
                    result = 1;
                    break;
                case 3:
                    result = 2;
                    break;
                case 4:
                    result = 2;
                    break;
                case 5:
                    result = 4;
                    break;
                case 6:
                    result = 4;
                    break;
                default:
                    // if set 0 , might got issues with false or null , so i set 7
                    result = 7;
                    break;
            }
            return result
        }

        self.getMerchantName = function(merchantNo, merchantsFromPMS, merchantTypes, type){
            let merchantName = '';
            let result = '';
            let merchant = [];
            if (merchantNo && merchantsFromPMS) {

                let inputDevice = self.getPMSDevices(type);

                if(type){
                    merchant = merchantsFromPMS.filter(item => {
                        return item.merchantNo == merchantNo && item.targetDevices == inputDevice;
                    });
                }else{
                    merchant = merchantsFromPMS.filter(item => {
                        return item.merchantNo == merchantNo;
                    });
                }

                if (merchant.length > 0) {
                    let merchantName = merchantTypes.filter(item => {
                        return item.merchantTypeId == merchant[0].merchantTypeId;
                    })
                    if (merchantName[0]) {
                        result = merchantName[0].name;
                    }
                }
            }
            return result;
        }

        self.getAlipayLine2Acc = function ($translate) {
            let line2Acc = {
                accountNumber:"MMM4-line2",
                bankTypeId:"170",
                merchantNo:"MMM4-line2",
                merchantTypeId:"9997",
                merchantTypeName:"AliPayAcc",
                minDepositAmount:1,
                name: $translate("MMM4-line2"),
                singleLimit:0,
                state:"NORMAL"
            }
            return line2Acc;
        };


        this.updatePageTile = ($translate, pageName, tabName) => {
            window.document.title = $translate(pageName) + "->" + $translate(tabName);
            $(document).one('shown.bs.tab', function (e) {
                $(document).trigger('resize');
            });
        };

        let thisService = this;

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
            thisService.copyToClipboard(copiedText, modalId);
        };

        this.copyToClipboard = function (text, modalId) {
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
                            // e.commissionRate = parseFloat((e.commissionRate * 100).toFixed(2));
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

        this.commonInitTime = (utilService, vm, model, field, queryId, defTime, defTimeAsIs, options) => {
            vm[model] = vm[model] || {};
            options = options || null;

            utilService.actionAfterLoaded(queryId, () => {
                vm[model][field] = utilService.createDatePicker(queryId, options);
                if(defTimeAsIs) {
                    $(queryId).data('datetimepicker').setDate(new Date(defTime));
                } else {
                    $(queryId).data('datetimepicker').setLocalDate(new Date(defTime));
                }
            })
        };

        this.isSpecialChar = (string) => {
            let format = /[ !@#$%^&*_+\-=\[\]{};':"\\|,.<>\/?]/;

            return format.test(string);
        };
    };

    let commonServiceApp = angular.module('commonService', []);

    //Must be a provider since it will be injected into module.config()
    commonServiceApp.provider('commonService', commonService);
});
