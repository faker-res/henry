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
        function getIntervalTime ($scope, $translate, rewardAppearPeriod) {
            // display time interval of reward (week)
            let startDate = ( rewardAppearPeriod && rewardAppearPeriod.startDate ) ? $scope.weekDay [rewardAppearPeriod.startDate] : '';
            let endDate = ( rewardAppearPeriod && rewardAppearPeriod.endDate ) ? $scope.weekDay [rewardAppearPeriod.endDate] : '';
            let startTime = ( rewardAppearPeriod && rewardAppearPeriod.startTime ) ? pad(rewardAppearPeriod.startTime) : '';
            let endTime = ( rewardAppearPeriod && rewardAppearPeriod.endTime ) ? pad(rewardAppearPeriod.endTime) : '';

            let fullDate = $translate(startDate) + startTime + ':00' + ' - ' + $translate(endDate) + endTime + ':00';
            return fullDate
        }
        function pad(n){ return n < 10 ? '0' + n : n}
        // region General get functions

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

        self.getBankTypeList = ($scope, id) => {
            return $scope.$socketPromise('getBankTypeList', {platform: id}).then(
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

        self.getActiveBankTypeList = ($scope, id) => {
            return $scope.$socketPromise('getBankTypeList', {platform: id}).then(
                data => {
                    if (data && data.data && data.data.data) {
                        let allActiveBankTypeList = {};

                        data.data.data.forEach(item => {
                            if (item && item.bankTypeId && item.bankflag && item.bankflag == 1) {
                                allActiveBankTypeList[item.id] = item.name + ' (' + item.id + ')';
                            }
                        });

                        return allActiveBankTypeList;
                    }
                }
            )
        };

        self.getAllPromoCode = ($scope) => {
            return $scope.$socketPromise('getAllPromoCode').then(data => data.data)
        };

        self.getRewardEventsByPlatform = ($scope, platformObjId) => {
            return $scope.$socketPromise('getRewardEventsForPlatform', {platform: platformObjId}).then(data => data.data)
        };

        self.getRewardEventsGroupByPlatform = ($scope, platformObjId) => {
            return $scope.$socketPromise('getRewardEventGroup', {platform: platformObjId}).then(data => data.data)
        };

        self.getRewardPointsEvent = ($scope, platformObjId) => {
            return $scope.$socketPromise('getRewardPointsEvent', {platformObjId: platformObjId}).then(data => data.data)
        };

        self.getAllRewardPointsEvent = ($scope) => {
            return $scope.$socketPromise('getAllRewardPointsEvent').then(data => data.data)
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
                            delete gameProviderGroup[i].__v;
                            delete gameProviderGroup[i].__proto__;
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
            let sendData = {};
            if(platformObjId) {
                sendData.platformObjId = platformObjId;
            }
            return $scope.$socketPromise('getAllAutoFeedback', sendData)
                .then(data => data.data.data);
        };

        self.getSMSTemplate = function($scope, platformObjId) {
            return $scope.$socketPromise("getMessageTemplatesForPlatform", {platform: platformObjId, format: 'smstpl'}).then(data => data.data)
        };

        self.getPaymentSystemName = function($scope, paymentSystemType) {
            return $scope.$socketPromise("getPaymentSystemName", {systemTypeId: paymentSystemType}).then(data => data.data)
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

        self.getAlipayLineAcc = function ($translate, no) {
            let lineAcc = {
                accountNumber:"MMM4-line"+no,
                bankTypeId:"170",
                merchantNo:"MMM4-line"+no,
                merchantTypeId:"9997",
                merchantTypeName:"AliPayAcc",
                minDepositAmount:1,
                name: $translate("MMM4-line"+no),
                singleLimit:0,
                state:"NORMAL"
            }
            return lineAcc;
        };

        self.redefineInputDevice = function (inputDevice) {
            if (inputDevice && inputDevice == 5){
                // 5: 玩家包壳APP 已归类为 H5
                return 3
            }
            else if (inputDevice && inputDevice == 6){
                // 6: 代理包壳APP 已归类为 H5
                return 4
            }
        };

        self.convertClientTypeToInputDevice = function (clientType, userAgent) {
            let inputDevice;

            //clientType
            //1 - Web
            //2 - MOBILE
            //4 - APP

            if (clientType) {
                switch (Number(clientType)) {
                    case 1:
                        inputDevice = 1;
                        break;
                    case 2:
                        inputDevice = 3;
                        break;
                    case 4:
                        inputDevice = 5;
                        if (userAgent && userAgent.browser && userAgent.browser.name &&
                            (userAgent.browser.name.indexOf("WebKit") !== -1 || userAgent.browser.name.indexOf("WebView") !== -1)) {
                            inputDevice = 3;
                        }
                        break;
                }
            }

            return inputDevice;
        };

        self.getProvinceName = function($scope, provinceId) {
            return $scope.$socketPromise('getProvince', {provinceId: provinceId})
                .then(data => {
                    let text = data.data.data ? data.data.data.name : '';

                    return text;
                });
        };

        self.getCityName = function($scope, cityId) {
            return $scope.$socketPromise('getCity', {cityId: cityId})
                .then(data => {
                    let text = data.data.data ? data.data.data.name : '';

                    return text;
                });
        };
        // endregion


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

                    if (grp.showConfig && grp.showConfig.commissionSetting && grp.srcConfig && grp.srcConfig.commissionSetting && grp.srcConfig.commissionSetting.length == grp.showConfig.commissionSetting.length) {
                        let originalConfig = grp.srcConfig.commissionSetting;
                        grp.showConfig.commissionSetting.forEach((e, index) => {
                            // if(grp.srcConfig && grp.srcConfig.commissionSetting && grp.srcConfig.commissionSetting.length > 0) {
                            // grp.srcConfig.commissionSetting.forEach(f => {
                            // if (e.playerConsumptionAmountFrom === f.playerConsumptionAmountFrom
                            //     && e.playerConsumptionAmountTo === f.playerConsumptionAmountTo
                            //     && e.activePlayerValueFrom === f.activePlayerValueFrom
                            //     && e.activePlayerValueTo === f.activePlayerValueTo
                            //     && Number(e.commissionRate) !== Number(f.commissionRate)
                            // ) {
                            //     e.isCustomized = true;
                            // }
                            if (e.playerConsumptionAmountFrom !== originalConfig[index].playerConsumptionAmountFrom
                                || e.playerConsumptionAmountTo !== originalConfig[index].playerConsumptionAmountTo
                                || e.activePlayerValueFrom !== originalConfig[index].activePlayerValueFrom
                                || e.activePlayerValueTo !== originalConfig[index].activePlayerValueTo
                            ) {
                                e.isConfigCustomized = true;
                                e.isCustomized = true;
                            }

                            if (Number(e.commissionRate) !== Number(originalConfig[index].commissionRate)) {
                                e.isCustomized = true;
                            }
                            // });
                            // }

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
                    // if (Number(commSett[e]) !== Number(custObj[e])) {
                    let cusTomFieldKey = e + "Custom";
                    if (custObj[cusTomFieldKey]) {
                        custObj.isCustomizedField = custObj.isCustomizedField || [];
                        custObj.isCustomizedField.push(e);
                    } else {
                        custObj[e] = commSett[e];
                    }
                    // }
                });

                if (commSett.rateAfterRebateGameProviderGroup && commSett.rateAfterRebateGameProviderGroup.length > 0) {
                    commSett.rateAfterRebateGameProviderGroup = commSett.rateAfterRebateGameProviderGroup.map(e => {
                        custObj.rateAfterRebateGameProviderGroup.map(f => {
                            if (String(e.gameProviderGroupId) === String(f.gameProviderGroupId) && Number(e.rate) !== Number(f.rate)) {
                                // f.isCustomized = true;
                                // e = Object.assign({}, e, f);
                                if (!f.isCustom) {
                                    f.rate = e.rate;
                                } else {
                                    f.isCustomized = true;
                                    e = Object.assign({}, e, f);
                                }
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

        this.commonInitTime = (utilService, vm, model, field, queryId, defTime, defTimeAsIs, options, showDateOnly) => {
            vm[model] = vm[model] || {};
            options = options || null;

            utilService.actionAfterLoaded(queryId, () => {
                if (showDateOnly){
                    vm[model][field] = utilService.createDatePickerWithoutTime(queryId, options);
                }
                else{
                    vm[model][field] = utilService.createDatePicker(queryId, options);
                }

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

        this.checkProgressOfRewardTasksWithinRTG = (result, dynRewardTaskGroupId, rtgBonusAmtObj, isLockedProviderGroup) => {
            let rewardTaskProposalData = result;
            console.log("rewardTaskProposalData", result);

            result.forEach((item, index) => {
                item.proposalId = item.proposalId || item.data.proposalId;
                // item['createTime$'] = vm.dateReformat(item.data.createTime$);
                item.useConsumption = item.data.useConsumption;
                item.topUpProposal = item.data.topUpProposalId ? item.data.topUpProposalId : item.data.topUpProposal;
                item.topUpAmount = item.data.topUpAmount;
                item.bonusAmount = item.data.rewardAmount;
                item.applyAmount = item.data.actualAmount || item.data.actualAmountReceived || item.data.applyAmount || item.data.amount;
                item.requiredUnlockAmount = item.data.spendingAmount;
                item.requiredBonusAmount = item.data.requiredBonusAmount;
                // item['provider$'] = $translate(item.data.provider$);
                item.rewardType = item.data.rewardType;

                item.requiredUnlockAmount$ = item.requiredUnlockAmount;
                // item.curConsumption$ = item.curConsumption;
                if (isLockedProviderGroup) {
                    let spendingAmt = calSpendingAmt(dynRewardTaskGroupId, rewardTaskProposalData, index);
                    // let spendingAmt = vm.calSpendingAmt(index);

                    item.curConsumption$ = spendingAmt.currentAmt;
                    item.maxConsumption$ = spendingAmt.currentMax;
                } else {
                    item.curConsumption$ = item.requiredBonusAmount;
                    item.maxConsumption$ = item.requiredUnlockAmount;
                }
                item.bonusAmount$ = item.data.bonusAmount;
                item.requiredBonusAmount$ = item.requiredBonusAmount;
                item.currentAmount$ = item.data.currentAmount;

                item.availableAmt$ = item.bonusAmount ? item.bonusAmount : (item.applyAmount || 0);
                item.archivedAmt$ = 0;

                // exclude the proposal to be shown in the progress bar if the proposal is dynamicReward, type c promocode or limitedOffer
                if (item.data.isDynamicRewardAmount || (item.data.promoCodeTypeValue && item.data.promoCodeTypeValue == 3) || item.data.limitedOfferObjId) {
                    item.availableAmt$ = (item.applyAmount || 0) + (item.bonusAmount || 0);
                }

                let providerGroup = "undefined"; // this is the key to access vm.rtgBonusAmt for rewards/top ups that are not binding with providerGroup
                if (item && item.data && item.data.providerGroup) {

                    // extra checking on the type as the promocode will generate array of providerGroup
                    if (typeof item.data.providerGroup == 'object') {

                        if (item.data.providerGroup.length) {
                            providerGroup = item.data.providerGroup[0];
                        } else {
                            providerGroup = "undefined";
                        }
                    } else {
                        providerGroup = item.data.providerGroup;
                    }
                }
                // let providerGroup = item && item.data && item.data.providerGroup ? (item.data.providerGroup.length == 0 ? 'undefined' : ):
                if (rtgBonusAmtObj[providerGroup] <= -(item.availableAmt$)) {
                    rtgBonusAmtObj[providerGroup] -= -(item.availableAmt$);
                    item.archivedAmt$ = item.availableAmt$
                } else if (rtgBonusAmtObj[providerGroup] != 0) {
                    if (providerGroup === "undefined") {
                        let archivedAmtEmpty = rtgBonusAmtObj["undefined"] ? rtgBonusAmtObj["undefined"] : 0;
                        item.archivedAmt$ = -archivedAmtEmpty;
                        rtgBonusAmtObj["undefined"] = 0;

                    } else {
                        item.archivedAmt$ = -rtgBonusAmtObj[providerGroup];
                        rtgBonusAmtObj[providerGroup] = 0;
                        item.archivedAmt$ = item.archivedAmt$ ? item.archivedAmt$ : 0;
                    }
                }
                item.isArchived =
                    item.archivedAmt$ == item.availableAmt$ || item.curConsumption$ == item.requiredUnlockAmount$;


            });

            return result || [];

            function calSpendingAmt(dynRewardTaskGroupId, rewardTaskProposalData, rowId) {
                let rewardTaskGroup = dynRewardTaskGroupId[0] ? dynRewardTaskGroupId[0] : null;

                if (!rewardTaskGroup) {
                    return {'incCurConsumption': 0, 'currentAmt': 0, 'currentMax': 0}
                } else {
                    let spendingAmt = 0;

                    //calculate the value between this rowId
                    let currentMax = 0;
                    let AmtNow = 0;
                    let curConsumption = rewardTaskGroup.curConsumption ? rewardTaskGroup.curConsumption : 0;
                    for (let i = 0; i <= rowId; i++) {
                        if (rewardTaskProposalData[i]) {
                            let proposalSpendingAmt =
                                rewardTaskProposalData[i].data.spendingAmount
                                || rewardTaskProposalData[i].data.requiredUnlockAmount
                                || rewardTaskProposalData[i].data.actualAmountReceived
                                || rewardTaskProposalData[i].data.amount
                                || 0;

                            let forbidXIMAAmt = 0;
                            let spendingAmount = parseFloat(proposalSpendingAmt);
                            let rewardTaskGroup = dynRewardTaskGroupId[0] ? dynRewardTaskGroupId[0] : null;
                            if (rewardTaskGroup) {
                                forbidXIMAAmt = rewardTaskGroup.forbidXIMAAmt ? rewardTaskGroup.forbidXIMAAmt : 0;
                            }
                            currentMax = parseFloat(proposalSpendingAmt);
                            spendingAmt += spendingAmount;
                        }
                    }
                    let incCurConsumption = curConsumption - spendingAmt;

                    if (incCurConsumption >= 0) {
                        AmtNow = currentMax;
                    } else {
                        AmtNow = currentMax + incCurConsumption;
                        if (AmtNow <= 0) {
                            AmtNow = 0;
                        }
                    }

                    return {'incCurConsumption': incCurConsumption, 'currentAmt': AmtNow, 'currentMax': currentMax}
                }
            }
        };
        this.setFixedPropDetail = ($scope, $translate, $noRoundTwoDecimalPlaces, vm, $fixTwoDecimalStr) => {
            let proposalDetail = {};
            if(vm && vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.platformId && vm.selectedProposal.data.platformId.name
                && proposalDetail && !proposalDetail.PRODUCT_NAME) {
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
            }
            proposalDetail = Object.assign(proposalDetail, vm.selectedProposal.data);
            proposalDetail.platformId = proposalDetail.platformId._id;

            let inputDevice = vm.selectedProposal && vm.selectedProposal.inputDevice ?  this.redefineInputDevice(vm.selectedProposal.inputDevice) : null;

            // region Manual top up proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "ManualPlayerTopUp") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("ManualPlayerTopUp");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                proposalDetail["DEPOSIT_METHOD"] = $translate(vm.getDepositMethodbyId[vm.selectedProposal.data.depositMethod]);
                proposalDetail["ACCNAME"] = vm.selectedProposal.data.realName || " ";
                proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                proposalDetail["RECEIVE_BANK_TYPE"] = vm.allBankTypeList[vm.selectedProposal.data.bankTypeId] || (vm.selectedProposal.data.bankTypeId + " ! " + $translate("not in bank type list"));
                proposalDetail["RECEIVE_BANK_ACC"] = vm.selectedProposal.data.bankCardNo;
                proposalDetail["RECEIVE_BANK_ACC_NAME"] = vm.selectedProposal.data.cardOwner;
                proposalDetail["RECEIVE_BANK_ACC_PROVINCE"] = vm.selectedProposal.data.provinceId || vm.selectedProposal.data.provinceName;
                proposalDetail["RECEIVE_BANK_ACC_CITY"] = vm.selectedProposal.data.cityId || vm.selectedProposal.data.cityName;
                proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositTime)) : " ";
                proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                if (inputDevice) {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[inputDevice] || "BACKSTAGE");
                } else {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[vm.selectedProposal.inputDevice] || "BACKSTAGE");
                }
                proposalDetail["bankCardGroup"] = vm.selectedProposal.data.bankCardGroupName || " ";
                proposalDetail["REQUEST_BANK_TYPE"] = vm.allBankTypeList[vm.selectedProposal.data.bankCardType] || (vm.selectedProposal.data.bankCardType + " ! " + $translate("not in bank type list"));
                proposalDetail["USE_PMS_CARD_GROUP"] = vm.selectedProposal.data.bPMSGroup || false;
                proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                proposalDetail["RETENTION_REWARD_CODE"] = vm.selectedProposal.data.retentionRewardCode || " ";
                proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                proposalDetail["SINGLE_LIMIT"] = " ";
                proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
                if (vm.selectedProposal.data.hasOwnProperty("topUpSystemName")) {
                    proposalDetail["topUpSystemName"] = vm.selectedProposal.data.topUpSystemName;
                }
                if (vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.parentProposalId) {
                    proposalDetail["Parent Proposal ID"] = vm.selectedProposal.data.parentProposalId;
                }
            }
            // endregion

            // region Online top up proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerTopUp") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("PlayerTopUp");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                proposalDetail["OnlineTopUpType"] = $translate($scope.merchantTopupTypeJson[vm.selectedProposal.data.topupType]) || vm.selectedProposal.data.topupType || " ";
                proposalDetail["3rdPartyPlatform"] = this.getMerchantName(vm.selectedProposal.data.merchantNo, $scope.merchantNoList, $scope.merchantTypes, vm.selectedProposal.inputDevice) || vm.selectedProposal.data.merchantNo || " ";
                proposalDetail["merchantNo"] = vm.selectedProposal.data.merchantNo || " ";
                proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                if(vm.selectedProposal.data.hasOwnProperty("rate")){
                    proposalDetail["Service Charge Fee"] = $noRoundTwoDecimalPlaces(vm.selectedProposal.data.amount * vm.selectedProposal.data.rate) + '（' + $translate("Service Charge Ratio") + '：' + (vm.selectedProposal.data.rate * 100) + '%)';
                }
                if(vm.selectedProposal.data.hasOwnProperty('actualAmountReceived')){
                    proposalDetail["ActualReceivedAmount"] = vm.selectedProposal.data.actualAmountReceived;
                }
                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                if (inputDevice) {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[inputDevice] || "BACKSTAGE");
                } else {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[vm.selectedProposal.inputDevice] || "BACKSTAGE");
                }
                proposalDetail["MerchantGroup"] = vm.selectedProposal.data.merchantGroupName || " ";
                proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                proposalDetail["RETENTION_REWARD_CODE"] = vm.selectedProposal.data.retentionRewardCode || " ";
                proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.permerchantLimits || "0";
                proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.transactionForPlayerOneDay || "0");
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
                if (vm.selectedProposal.data.hasOwnProperty("topUpSystemName")) {
                    proposalDetail["topUpSystemName"] = vm.selectedProposal.data.topUpSystemName;
                }
            }
            // endregion

            // region Alipay top up proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerAlipayTopUp") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("PlayerAlipayTopUp");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                proposalDetail["PLAYER_ALIPAY_NAME_ID"] = vm.selectedProposal.data.userAlipayName;
                proposalDetail["PLAYER_ALIPAY_REALNAME"] = vm.selectedProposal.data.realName || " ";
                proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                proposalDetail["RECIPIENTS_APLIPAY_ACC"] = vm.selectedProposal.data.alipayAccount;
                proposalDetail["RECIPIENTS_APLIPAY_NAME"] = vm.selectedProposal.data.alipayName || " ";
                proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositeTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositeTime)) : " ";
                proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                if (inputDevice) {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[inputDevice] || "BACKSTAGE");
                } else {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[vm.selectedProposal.inputDevice] || "BACKSTAGE");
                }
                proposalDetail["PERSONAL_ALIPAY_GROUP"] = vm.selectedProposal.data.aliPayGroupName || " ";
                proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                proposalDetail["RETENTION_REWARD_CODE"] = vm.selectedProposal.data.retentionRewardCode || " ";
                proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.singleLimit || "0";
                proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                proposalDetail["ALIPAY_QR_CODE"] = vm.selectedProposal.data.alipayQRCode || " ";
                proposalDetail["ALIPAY_QR_ADDRESS"] = vm.selectedProposal.data.qrcodeAddress || " ";
                proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                proposalDetail["alipayer"] = vm.selectedProposal.data.alipayer || " ";
                proposalDetail["alipayerAccount"] = vm.selectedProposal.data.alipayerAccount || " ";
                proposalDetail["alipayerNickName"] = vm.selectedProposal.data.alipayerNickName || " ";
                proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
                if (vm.selectedProposal.data.hasOwnProperty("topUpSystemName")) {
                    proposalDetail["topUpSystemName"] = vm.selectedProposal.data.topUpSystemName;
                }
            }
            // endregion

            // region Wechat top up proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerWechatTopUp") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("PlayerWechatTopUp");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                proposalDetail["TopupAmount"] = vm.selectedProposal.data.amount;
                proposalDetail["RECIPIENTS_WECHAT_ACC"] = vm.selectedProposal.data.weChatAccount || " ";
                proposalDetail["RECIPIENTS_WECHAT_NAME"] = vm.selectedProposal.data.name || " ";
                proposalDetail["RECIPIENTS_WECHAT_NICK"] = vm.selectedProposal.data.nickname || " ";
                proposalDetail["DEPOSIT_TIME"] = vm.selectedProposal.data.depositeTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.depositeTime)) : " ";
                proposalDetail["EXPIRY_DATE"] = vm.selectedProposal.data.validTime ? $scope.timeReformat(new Date(vm.selectedProposal.data.validTime)) : " ";
                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                if (inputDevice) {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[inputDevice] || "BACKSTAGE");
                } else {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[vm.selectedProposal.inputDevice] || "BACKSTAGE");
                }
                proposalDetail["PERSONAL_WECHAT_GROUP"] = vm.selectedProposal.data.wechatPayGroupName || " ";
                proposalDetail["requestId"] = vm.selectedProposal.data.requestId;
                proposalDetail["REWARD_CODE"] = vm.selectedProposal.data.bonusCode || " ";
                proposalDetail["TOP_UP_RETURN_CODE"] = vm.selectedProposal.data.topUpReturnCode || " ";
                proposalDetail["RETENTION_REWARD_CODE"] = vm.selectedProposal.data.retentionRewardCode || " ";
                proposalDetail["LIMITED_OFFER_NAME"] = vm.selectedProposal.data.limitedOfferName || " ";
                proposalDetail["SINGLE_LIMIT"] = vm.selectedProposal.data.singleLimit || "0";
                proposalDetail["DAY_LIMIT"] = (vm.selectedProposal.data.cardQuota || "0") + " / " + (vm.selectedProposal.data.dailyCardQuotaCap || "0");
                proposalDetail["ALIPAY_QR_CODE"] = vm.selectedProposal.data.weChatQRCode || " ";
                proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || " ";
                proposalDetail["orderNo"] = vm.selectedProposal.data.orderNo || " ";
                if (vm.selectedProposal.data.hasOwnProperty("pointsBefore")) {
                    proposalDetail["pointsBefore"] = vm.selectedProposal.data.pointsBefore;
                }
                if (vm.selectedProposal.data.hasOwnProperty("pointsAfter")) {
                    proposalDetail["pointsAfter"] = vm.selectedProposal.data.pointsAfter;
                }
                if (vm.selectedProposal.data.hasOwnProperty("topUpSystemName")) {
                    proposalDetail["topUpSystemName"] = vm.selectedProposal.data.topUpSystemName;
                }
            }
            // endregion

            //#region Common Top Up Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerCommonTopUp" && vm.selectedProposal.status === "PrePending") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("PlayerCommonTopUp");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || " ";
                if (inputDevice) {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[inputDevice] || "BACKSTAGE");
                } else {
                    proposalDetail["SUBMIT_DEVICE"] = $translate($scope.constPlayerRegistrationInterface[vm.selectedProposal.inputDevice] || "BACKSTAGE");
                }
            }
            //#endregion

            // region Baccarat Reward Group Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "BaccaratRewardGroup") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                let providerGroupName;
                let rewardDetail = '';
                let originalRewardTotal = 0;

                if (vm.selectedProposal.data && vm.selectedProposal.data.providerGroup) {
                    providerGroupName = vm.getProviderGroupNameById(vm.selectedProposal.data.providerGroup);
                } else {
                    providerGroupName = $translate("LOCAL_CREDIT");
                }

                if (vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.baccaratRewardList && vm.selectedProposal.data.baccaratRewardList.length > 0) {
                    vm.selectedProposal.data.baccaratRewardList.forEach(detail => {
                        if (detail) {
                            rewardDetail += detail.roundNo + '，' + $translate('BET_AMOUNT') + detail.betAmount + $translate('YEN') + '，'
                                + $translate('REWARD_AMOUNT') + '：' + detail.rewardAmount + $translate('YEN') + '，' + $translate('remark') + '：' + detail.remark + '<br>';
                        }

                        if (detail.rewardAmount) {
                            originalRewardTotal += detail.rewardAmount;
                        }
                    });
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerId"] = vm.selectedProposal.data.playerId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realName || " ";
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.proposalPlayerLevel;
                proposalDetail["spendingAmount"] = vm.selectedProposal.data.spendingAmount;
                proposalDetail["eventName"] = vm.selectedProposal.data.eventName;
                proposalDetail["eventCode"] = vm.selectedProposal.data.eventCode;
                proposalDetail["REWARD_AMOUNT"] = vm.selectedProposal.data.rewardAmount < originalRewardTotal ?
                    vm.selectedProposal.data.rewardAmount + $translate('YEN') + ' (' + $translate('ORIGINAL_REWARD_TOTAL') + originalRewardTotal + ')' : vm.selectedProposal.data.rewardAmount + $translate('YEN');
                proposalDetail["REWARD_APPLIED"] = vm.selectedProposal.data.intervalRewardAmount + vm.selectedProposal.data.rewardAmount + $translate('YEN');
                proposalDetail["MAX_REWARD"] = vm.selectedProposal.data.intervalMaxRewardAmount + $translate('YEN');
                proposalDetail["ORDER_NO_REWARD_AMOUNT"] = rewardDetail;
                if (vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.isIgnoreAudit) {
                    proposalDetail["isIgnoreAudit"] = vm.selectedProposal.data.isIgnoreAudit.toString() === 'true' ? $translate('Yes') : $translate('No');
                }
                if (vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.forbidWithdrawAfterApply) {
                    proposalDetail["forbidWithdrawAfterApply"] = vm.selectedProposal.data.forbidWithdrawAfterApply.toString() === 'true' ? $translate('Yes') : $translate('No');
                }
                proposalDetail["forbidWithdrawIfBalanceAfterUnlock"] = vm.selectedProposal.data.forbidWithdrawIfBalanceAfterUnlock;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
                if (vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.isSharedWithXIMA) {
                    proposalDetail["isSharedWithXIMA"] = vm.selectedProposal.data.isSharedWithXIMA.toString() === 'true' ? $translate('Yes') : $translate('No');
                }
                proposalDetail["Provider group"] = providerGroupName;
                proposalDetail["rewardStartTime"] = vm.selectedProposal.data.eventStartTime;
                proposalDetail["rewardEndTime"] = vm.selectedProposal.data.eventEndTime;
                proposalDetail["rewardInterval"] = vm.selectedProposal.data.intervalType;
            }
            // end region

            // region Customize Partner Commission Rate Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "CustomizePartnerCommRate") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                proposalDetail["COMMISSION_TYPE"] = $translate($scope.commissionTypeList[vm.selectedProposal.data.commissionType]);
                proposalDetail["isMultiLevel"] = vm.selectedProposal.data.isMultiLevel? $translate("true"): $translate("false");
                if (vm.selectedProposal.data.isEditAll) {
                    proposalDetail["oldRate"] = "";
                    if (vm.selectedProposal.data.oldConfigArr && vm.selectedProposal.data.oldConfigArr.length > 0) {
                        vm.selectedProposal.data.oldConfigArr.forEach(oldConfig => {
                            if (oldConfig && oldConfig.hasOwnProperty("provider") && oldConfig.commissionSetting && oldConfig.commissionSetting.length > 0) {
                                let providerGroupName = oldConfig.provider === null? $translate("default"): vm.getProviderGroupNameById(oldConfig.provider);
                                let oldRateArr = [];
                                let oldRateStr = '';
                                oldConfig.commissionSetting.forEach(commission => {
                                    if (commission && commission.commissionRate) {
                                        oldRateArr.push($fixTwoDecimalStr(commission.commissionRate * 100) + '%');
                                    }
                                });

                                if (oldRateArr && oldRateArr.length > 0) {
                                    oldRateStr = oldRateArr.join(', ');
                                }

                                proposalDetail["- " + providerGroupName] = oldRateStr;
                            }
                        });
                    }
                    proposalDetail["newRate"] = "";
                    if (vm.selectedProposal.data.newConfigArr && vm.selectedProposal.data.newConfigArr.length > 0) {
                        vm.selectedProposal.data.newConfigArr.forEach(newConfig => {
                            if (newConfig && newConfig.hasOwnProperty("provider") && newConfig.commissionSetting && newConfig.commissionSetting.length > 0) {
                                let providerGroupName = newConfig.provider === null? $translate("default"): vm.getProviderGroupNameById(newConfig.provider);
                                let newRateArr = [];
                                let newRateStr = '';
                                newConfig.commissionSetting.forEach(commission => {
                                    if (commission && commission.commissionRate) {
                                        newRateArr.push($fixTwoDecimalStr(commission.commissionRate * 100) + '%');
                                    }
                                });

                                if (newRateArr && newRateArr.length > 0) {
                                    newRateStr = newRateArr.join(', ');
                                }

                                proposalDetail["-  " + providerGroupName] = newRateStr;
                            }
                        });
                    }
                } else if (vm.selectedProposal.data.isPlatformRate) {
                    if (vm.selectedProposal.data.isRevert) {
                        proposalDetail["Commission Customization Revert"] = vm.selectedProposal.data.isRevert;
                    }
                    proposalDetail["oldFeeRate"] = "";
                    if (vm.selectedProposal.data.oldRate) {
                        let oldRate = vm.selectedProposal.data.oldRate;
                        proposalDetail["Rate After Rebate Promo"] = oldRate.rateAfterRebatePromo + '%';
                        proposalDetail["Rate After Rebate Platform"] = oldRate.rateAfterRebatePlatform + '%';
                        if (oldRate.rateAfterRebateGameProviderGroup && oldRate.rateAfterRebateGameProviderGroup.length > 0) {
                            oldRate.rateAfterRebateGameProviderGroup.forEach(rate => {
                                if (rate && rate.name) {
                                    proposalDetail["- " + rate.name] = rate.rate + '%';
                                }
                            })
                        }
                        proposalDetail["Rate After Rebate Total Deposit"] = oldRate.rateAfterRebateTotalDeposit + '%';
                        proposalDetail["Rate After Rebate Total Withdrawal"] = oldRate.rateAfterRebateTotalWithdrawal + '%';
                    }
                    proposalDetail["newFeeRate"] = "";
                    if (vm.selectedProposal.data.newRate) {
                        let newRate = vm.selectedProposal.data.newRate;
                        proposalDetail["rateAfterRebatePromo"] = newRate.rateAfterRebatePromo + '%';
                        proposalDetail["rateAfterRebatePlatform"] = newRate.rateAfterRebatePlatform + '%';
                        if (newRate.rateAfterRebateGameProviderGroup && newRate.rateAfterRebateGameProviderGroup.length > 0) {
                            newRate.rateAfterRebateGameProviderGroup.forEach(rate => {
                                if (rate && rate.name) {
                                    proposalDetail["-  " + rate.name] = rate.rate + '%';
                                }
                            })
                        }
                        proposalDetail["rateAfterRebateTotalDeposit"] = newRate.rateAfterRebateTotalDeposit + '%';
                        proposalDetail["rateAfterRebateTotalWithdrawal"] = newRate.rateAfterRebateTotalWithdrawal + '%';
                    }
                } else if (!vm.selectedProposal.data.isPlatformRate && vm.selectedProposal.data.oldRate && vm.selectedProposal.data.newRate
                    && vm.selectedProposal.data.oldRate.hasOwnProperty('commissionSetting') && vm.selectedProposal.data.newRate.hasOwnProperty('commissionSetting')){
                    if (vm.selectedProposal.data.isRevert) {
                        proposalDetail["Commission Customization Revert"] = vm.selectedProposal.data.isRevert;
                    }
                    proposalDetail["oldRate"] = "";
                    if (vm.selectedProposal.data.oldRate.hasOwnProperty("provider") && vm.selectedProposal.data.oldRate.commissionSetting && vm.selectedProposal.data.oldRate.commissionSetting.length > 0) {
                        let providerGroupName = vm.selectedProposal.data.oldRate.provider === null? $translate("default"): vm.getProviderGroupNameById(vm.selectedProposal.data.oldRate.provider);
                        let oldRateArr = [];
                        let oldRateStr = '';
                        vm.selectedProposal.data.oldRate.commissionSetting.forEach(commission => {
                            if (commission && commission.commissionRate) {
                                oldRateArr.push($fixTwoDecimalStr(commission.commissionRate * 100) + '%');
                            }
                        });

                        if (oldRateArr && oldRateArr.length > 0) {
                            oldRateStr = oldRateArr.join(', ');
                        }

                        proposalDetail["- " + providerGroupName] = oldRateStr;
                    }
                    proposalDetail["newRate"] = "";
                    if (vm.selectedProposal.data.newRate.hasOwnProperty("provider") && vm.selectedProposal.data.newRate.commissionSetting && vm.selectedProposal.data.newRate.commissionSetting.length > 0) {
                        let providerGroupName = vm.selectedProposal.data.oldRate.provider === null? $translate("default"): vm.getProviderGroupNameById(vm.selectedProposal.data.newRate.provider);
                        let oldRateArr = [];
                        let oldRateStr = '';
                        vm.selectedProposal.data.newRate.commissionSetting.forEach(commission => {
                            if (commission && commission.commissionRate) {
                                oldRateArr.push($fixTwoDecimalStr(commission.commissionRate * 100) + '%');
                            }
                        });

                        if (oldRateArr && oldRateArr.length > 0) {
                            oldRateStr = oldRateArr.join(', ');
                        }

                        proposalDetail["-  " + providerGroupName] = oldRateStr;
                    }
                } else if (vm.selectedProposal.data.isResetAll) {
                    proposalDetail["isResetAll"] = vm.selectedProposal.data.isResetAll;
                }
            }
            // end region

            // region Settle Partner Commission Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "SettlePartnerCommission") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                let grossCommission = 0;
                let totalPlatformFee = 0;

                let customizedStyle = {
                    'font-weight': 'bold',
                    'color': 'red'
                };
                let isCustomized = false;

                let consumptionUsed = [5, 7].includes(vm.selectedProposal.data.commissionType) ? "CONSUMPTION" : "SITE_LOSE_WIN";
                let consumptionUsedKey = [5, 7].includes(vm.selectedProposal.data.commissionType) ? "totalConsumption" : "siteBonusAmount";
                let isValidConsumptionBased = Boolean([5, 7].includes(vm.selectedProposal.data.commissionType));
                let platformFeeRateMultiplier = vm.selectedProposal.data.isNewComm ? 100 : 1;

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name; // 产品名称
                proposalDetail["MAIN_TYPE"] = $translate("SettlePartnerCommission"); // 提案类型
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId; // 提案号
                proposalDetail["CREATION_TIME"] = $scope.timeReformat(vm.selectedProposal.createTime); // 创建时间
                proposalDetail["COMMISSION_PERIOD"] = $scope.dateReformat(vm.selectedProposal.data.startTime) + " - " + $scope.dateReformat(vm.selectedProposal.data.endTime); // 佣金周期
                proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName; // 代理账号
                proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId; // 代理ID
                proposalDetail["Proposal Status"] = $translate(vm.selectedProposal.status); // 提案状态
                proposalDetail["COMMISSION_TYPE"] = $translate($scope.commissionTypeList[vm.selectedProposal.data.commissionType]); // 佣金模式


                // proposalDetail["[Direct Down Line] Total Commission"] = $fixTwoDecimalStr(vm.selectedProposal.data.tCNettAmount || 0) + $translate("YEN"); // 多级代理佣金总计

                vm.selectedProposal.data.rawCommissions = vm.selectedProposal.data.rawCommissions || [];
                vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                    grossCommission += rawCommission.amount;
                    let str = $fixTwoDecimalStr(rawCommission.amount) + $translate("YEN") + " "
                        + "(" + $translate(consumptionUsed) + ": " + $fixTwoDecimalStr(-rawCommission.totalConsumption) + "/"
                        + $translate("RATIO") + ": " + $fixTwoDecimalStr(rawCommission.commissionRate * 100) + "%)";

                    let label = `${$translate("[Direct Down Line]")} ${rawCommission.groupName} ${$translate("Commission")}`;
                    proposalDetail[label] = str; // {提供商组} 佣金

                    if (rawCommission.isCustomCommissionRate) {
                        vm.proposalDetailStyle[label] = customizedStyle;
                        isCustomized = true;
                    }
                });

                // proposalDetail["REQUIRED_PLATFORM_FEES_DEDUCTION"] = ""; // 需扣除的平台费
                if (!isValidConsumptionBased) {
                    vm.selectedProposal.data.rawCommissions.map(rawCommission => {
                        totalPlatformFee += rawCommission.platformFee;
                        let str = $fixTwoDecimalStr(rawCommission.platformFee) + $translate("YEN") + " "
                            + "(" + $translate("SITE_LOSE_WIN") + ": " + $fixTwoDecimalStr(rawCommission.siteBonusAmount) + "/"
                            + $translate("RATIO") + ": " + (rawCommission.platformFeeRate && rawCommission.platformFeeRate * platformFeeRateMultiplier || 0) + "%)";
                        let forcedZeroStr = rawCommission.isForcePlatformFeeToZero ? $fixTwoDecimalStr(rawCommission.platformFee) + $translate("YEN") + " "
                            + "(" + $translate("Forced 0") + "/" + rawCommission.forcePlatformFeeToZeroBy.name + ")" : "";

                        let label = `${$translate("[Direct Down Line]")} ${$translate("TOTAL_PLATFORM_FEE")} ${rawCommission.groupName}`;
                        if (rawCommission && rawCommission.isForcePlatformFeeToZero) {
                            proposalDetail[label] = forcedZeroStr;
                        } else {
                            proposalDetail[label] = str;

                            if (rawCommission.isCustomPlatformFeeRate) {
                                vm.proposalDetailStyle[label] = customizedStyle;
                                isCustomized = true;
                            }
                        }
                    });

                    proposalDetail[`${$translate("[Direct Down Line]")} ${$translate("REQUIRED_PROMO_DEDUCTION")}`] = $fixTwoDecimalStr(vm.selectedProposal.data.totalRewardFee) + $translate("YEN") // 需扣除的优惠
                        + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.totalReward) + "/"
                        + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig && vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebatePromo || 0) + "%)";

                    if (vm.selectedProposal.data.rateAfterRebatePromoIsCustom) {
                        vm.proposalDetailStyle[`${$translate("[Direct Down Line]")} ${$translate("REQUIRED_PROMO_DEDUCTION")}`] = customizedStyle;
                        isCustomized = true;
                    }

                    proposalDetail[`${$translate("[Direct Down Line]")} ${$translate("REQUIRED_DEPOSIT_FEES_DEDUCTION")}`] = $fixTwoDecimalStr(vm.selectedProposal.data.totalTopUpFee) + $translate("YEN") // 需扣除的总存款手续费
                        + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.totalTopUp) + "/"
                        + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig && vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalDeposit || 0) + "%)";

                    if (vm.selectedProposal.data.rateAfterRebateTotalDepositIsCustom) {
                        vm.proposalDetailStyle[`${$translate("[Direct Down Line]")} ${$translate("REQUIRED_DEPOSIT_FEES_DEDUCTION")}`] = customizedStyle;
                        isCustomized = true;
                    }

                    `${$translate("[Direct Down Line]")} ${$translate("REQUIRED_WITHDRAWAL_FEES_DEDUCTION")}`
                    proposalDetail[`${$translate("[Direct Down Line]")} ${$translate("REQUIRED_WITHDRAWAL_FEES_DEDUCTION")}`] = $fixTwoDecimalStr(vm.selectedProposal.data.totalWithdrawalFee) + $translate("YEN") // 需扣除的总取款手续费
                        + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.totalWithdrawal) + "/"
                        + $translate("RATIO") + ": " + (vm.selectedProposal.data.partnerCommissionRateConfig && vm.selectedProposal.data.partnerCommissionRateConfig.rateAfterRebateTotalWithdrawal || 0) + "%)";

                    if (vm.selectedProposal.data.rateAfterRebateTotalWithdrawalIsCustom) {
                        vm.proposalDetailStyle[`${$translate("[Direct Down Line]")} ${$translate("REQUIRED_WITHDRAWAL_FEES_DEDUCTION")}`] = customizedStyle;
                        isCustomized = true;
                    }
                }

                if (isCustomized) {
                    vm.proposalDetailStyle["COMMISSION_TYPE"] = customizedStyle;
                }

                // proposalDetail["[Multi Level] Total Commission"] = $fixTwoDecimalStr(vm.selectedProposal.data.tCNettAmount || 0) + $translate("YEN"); // 多级代理佣金总计
                // 【多级代理】
                vm.selectedProposal.data.tCRawTotal = vm.selectedProposal.data.tCRawTotal || [];
                vm.selectedProposal.data.tCRawTotal.map(rawCommission => {
                    let str = $fixTwoDecimalStr(rawCommission.amount) + $translate("YEN") + " "
                        + "(" + $translate(consumptionUsed) + ": " + $fixTwoDecimalStr(isValidConsumptionBased ? rawCommission.totalValidConsumption : -rawCommission.crewProfit) /*+ "/"
                        + $translate("RATIO") + ": " + $fixTwoDecimalStr(rawCommission.commissionRate * 100) + "%"*/ + ")";

                    let label = `${$translate("[Multi Level]")} ${rawCommission.groupName} ${$translate("Commission")}`;
                    proposalDetail[label] =  str; // {提供商组} 佣金

                    if (rawCommission.isCustomCommissionRate) {
                        vm.proposalDetailStyle[label] = customizedStyle;
                        isCustomized = true;
                    }
                });

                if (!isValidConsumptionBased) {
                    vm.selectedProposal.data.tCRawTotal.map(rawCommission => {
                        let str = $fixTwoDecimalStr(rawCommission.platformFee) + $translate("YEN") + " "
                            + "(" + $translate("SITE_LOSE_WIN") + ": " + $fixTwoDecimalStr(-rawCommission.crewProfit) + "/"
                            + $translate("RATIO") + ": " + ($fixTwoDecimalStr(rawCommission.platformFeeRate*100)) + "%)";
                        let forcedZeroStr = rawCommission.isForcePlatformFeeToZero ? $fixTwoDecimalStr(rawCommission.platformFee) + $translate("YEN") + " "
                            + "(" + $translate("Forced 0") + "/" + rawCommission.forcePlatformFeeToZeroBy.name + ")" : "";

                        let label = `${$translate("[Multi Level]")} ${$translate("TOTAL_PLATFORM_FEE")} ${rawCommission.groupName}`;
                        if (rawCommission && rawCommission.isForcePlatformFeeToZero) {
                            proposalDetail[label] = forcedZeroStr;
                        } else {
                            proposalDetail[label] = str;

                            if (rawCommission.isCustomPlatformFeeRate) {
                                vm.proposalDetailStyle[label] = customizedStyle;
                                isCustomized = true;
                            }
                        }
                    });

                    proposalDetail[`${$translate("[Multi Level]")} ${$translate("REQUIRED_PROMO_DEDUCTION")}`] = $fixTwoDecimalStr(vm.selectedProposal.data.tCRewardFee || 0) + $translate("YEN") // 需扣除的优惠
                        + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.tCReward || 0) + "/"
                        + $translate("RATIO") + ": " + (vm.selectedProposal.data.childRewardFeeRate || 0) + "%)";

                    // if (vm.selectedProposal.data.rateAfterRebatePromoIsCustom) {
                    //     vm.proposalDetailStyle[`${$translate("[Multi Level]")} ${$translate("REQUIRED_PROMO_DEDUCTION")}`] = customizedStyle;
                    //     isCustomized = true;
                    // }

                    proposalDetail[`${$translate("[Multi Level]")} ${$translate("REQUIRED_DEPOSIT_FEES_DEDUCTION")}`] = $fixTwoDecimalStr(vm.selectedProposal.data.tcTopUpFee || 0) + $translate("YEN") // 需扣除的总存款手续费
                        + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.tCTopUp || 0) + "/"
                        + $translate("RATIO") + ": " + (vm.selectedProposal.data.childTopUpFeeRate || 0) + "%)";

                    // if (vm.selectedProposal.data.rateAfterRebateTotalDepositIsCustom) {
                    //     vm.proposalDetailStyle[`${$translate("[Multi Level]")} ${$translate("REQUIRED_DEPOSIT_FEES_DEDUCTION")}`] = customizedStyle;
                    //     isCustomized = true;
                    // }

                    `${$translate("[Multi Level]")} ${$translate("REQUIRED_WITHDRAWAL_FEES_DEDUCTION")}`
                    proposalDetail[`${$translate("[Multi Level]")} ${$translate("REQUIRED_WITHDRAWAL_FEES_DEDUCTION")}`] = $fixTwoDecimalStr(vm.selectedProposal.data.tcWithdrawalFee || 0) + $translate("YEN") // 需扣除的总取款手续费
                        + "(" + $translate("Total") + ": " + $fixTwoDecimalStr(vm.selectedProposal.data.tCWithdrawal || 0) + "/"
                        + $translate("RATIO") + ": " + (vm.selectedProposal.data.childWithdrawalFeeRate || 0) + "%)";

                    // if (vm.selectedProposal.data.rateAfterRebateTotalWithdrawalIsCustom) {
                    //     vm.proposalDetailStyle[`${$translate("[Multi Level]")} ${$translate("REQUIRED_WITHDRAWAL_FEES_DEDUCTION")}`] = customizedStyle;
                    //     isCustomized = true;
                    // }
                }



                proposalDetail["COMMISSION_TOTAL"] = $fixTwoDecimalStr(vm.selectedProposal.data.amount); // 佣金总结
            }
            // end region

            // region Parent Partner Commission Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "UpdateParentPartnerCommission") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PARENT_PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                proposalDetail["PARENT_PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                proposalDetail["PARENT_PARTNER_COMMISSION_RATE"] = vm.selectedProposal.data.parentCommissionRate + "%";
                proposalDetail["PARENT_PARTNER_COMMISSION_FEE"] = $noRoundTwoDecimalPlaces(vm.selectedProposal.data.amount);
                proposalDetail["CHILD_PARTNER_NAME"] = vm.selectedProposal.data.childPartnerName;
                proposalDetail["CHILD_PARTNER_DOWNLINES"] = vm.selectedProposal.data.childPartnerTotalDownLines;
                proposalDetail["CHILD_PARTNER_COMMISSION_TYPE"] = $translate($scope.commissionTypeList[vm.selectedProposal.data.childPartnerCommissionType]);
                proposalDetail["CHILD_PARTNER_TOTAL_WINLOSE"] = $noRoundTwoDecimalPlaces(vm.selectedProposal.data.childPlayerTotalWinLose);
                proposalDetail["CHILD_PARTNER_RELATED_PROPOSAL_NO"] = vm.selectedProposal.data.relatedProposalId;
            }
            // end region

            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "UpdatePlayerPhone") {
                proposalDetail = {};
                console.log(vm.selectedProposal.data)
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_Id"] = vm.selectedProposal.data.playerId;
                proposalDetail["Player Level"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PrevPhone"] = (vm.selectedProposal.data && vm.selectedProposal.data.curData && vm.selectedProposal.data.curData.phoneNumber) ? vm.selectedProposal.data.curData.phoneNumber: '';
                proposalDetail["remark"] = vm.selectedProposal.data.remark;

                if (vm.selectedProposal.data.updateData && vm.selectedProposal.data.updateData["phoneNumber"]) {
                    proposalDetail["PhoneNow"] = vm.selectedProposal.data.updateData["phoneNumber"];
                }
                if (vm.selectedProposal.data.updateData && vm.selectedProposal.data.updateData["phoneCity"]) {
                    proposalDetail["phoneCity"] = vm.selectedProposal.data.updateData["phoneCity"];
                }
                if (vm.selectedProposal.data.updateData && vm.selectedProposal.data.updateData["phoneProvince"]) {
                    proposalDetail["phoneProvince"] = vm.selectedProposal.data.updateData["phoneProvince"];
                }
                if (vm.selectedProposal.data.updateData && vm.selectedProposal.data.updateData["phoneType"]) {
                    proposalDetail["phoneType"] = vm.selectedProposal.data.updateData["phoneType"];
                }
            }

            // region Parent Partner Commission Proposal

            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerPromoCodeReward") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["proposalPlayerLevelValue"] = vm.selectedProposal.data.proposalPlayerLevelValue;
                proposalDetail["REWARD_NAME"] = vm.selectedProposal.data.rewardName;
                proposalDetail["topUpAmount"] = vm.selectedProposal.data.topUpAmount;
                proposalDetail["eventCode"] = vm.selectedProposal.data.eventCode;
                proposalDetail["eventName"] = vm.selectedProposal.data.eventName;
                proposalDetail["forbidWithdrawIfBalanceAfterUnlock"] = vm.selectedProposal.data.forbidWithdrawIfBalanceAfterUnlock;
                proposalDetail["useConsumption"] = vm.selectedProposal.data.useConsumption;
                proposalDetail["applyAmount"] = vm.selectedProposal.data.applyAmount;
                proposalDetail["PROMO_CODE_TYPE"] = vm.selectedProposal.data.PROMO_CODE_TYPE;
                proposalDetail["disableWithdraw"] = vm.selectedProposal.data.disableWithdraw;
                proposalDetail["promoCode"] = vm.selectedProposal.data.promoCode;
                proposalDetail["spendingAmount"] = vm.selectedProposal.data.spendingAmount;
                proposalDetail["rewardAmount"] = vm.selectedProposal.data.rewardAmount;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["playerId"] = vm.selectedProposal.data.playerId;
            }

            // end region

            // region Partner Credit Transfer To Downline Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PartnerCreditTransferToDownline") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                proposalDetail["PARTNER_CREDIT_AMOUNT_BEFORE_TRANSFER"] = vm.selectedProposal.data.currentCredit;
                proposalDetail["PARTNER_CREDIT_AMOUNT_AFTER_TRANSFER"] = vm.selectedProposal.data.updateCredit;
                proposalDetail["TOTAL_TRANSFER_PARTNER_CREDIT_AMOUNT"] = vm.selectedProposal.data.amount * -1;

                vm.selectedProposal.data.transferToDownlineDetail = vm.selectedProposal.data.transferToDownlineDetail || [];
                vm.selectedProposal.data.transferToDownlineDetail.map((transferredDownline, index) => {
                    let providerGroupName = '';
                    let orderNo = 0;
                    orderNo = index + 1;

                    if (transferredDownline && transferredDownline.providerGroup) {
                        providerGroupName = vm.getProviderGroupNameById(transferredDownline.providerGroup);
                    } else {
                        providerGroupName = $translate("LOCAL_CREDIT");
                    }

                    let str = transferredDownline.playerName + "/" + transferredDownline.amount + "/" + providerGroupName + "/" + transferredDownline.withdrawConsumption;

                    proposalDetail[$translate("Targeted Downline Player") + "（" + orderNo + "）" + "/" + $translate("Transferred Amount") + "/" + $translate("PROVIDER_GROUP") + "/" + $translate("Withdraw Consumption")] =  str;
                });
            }
            // end region

            // region Downline Receive Partner Credit Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "DownlineReceivePartnerCredit") {
                proposalDetail = {};
                let inputDevice = "";
                let providerGroupName = '';
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                if (vm.selectedProposal.data && vm.selectedProposal.data.providerGroup) {
                    providerGroupName = vm.getProviderGroupNameById(vm.selectedProposal.data.providerGroup);
                } else {
                    providerGroupName = $translate("LOCAL_CREDIT");
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["Downline Player ID"] = vm.selectedProposal.data.playerId;
                proposalDetail["Downline Player Name"] = vm.selectedProposal.data.playerName;
                proposalDetail["Received Amount"] = vm.selectedProposal.data.amount;
                proposalDetail["Provider group"] = providerGroupName;
                proposalDetail["Withdraw Consumption (Accurate number/non-multiple)"] = vm.selectedProposal.data.withdrawConsumption;
                proposalDetail["Proposal No. of Partner Transfer Credit to Downline"] = vm.selectedProposal.data.partnerTransferCreditToDownlineProposalNo;
                proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;

                for (let i = 0; i < Object.keys(vm.inputDevice).length; i++){
                    if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == vm.selectedProposal.inputDevice ){
                        inputDevice =  $translate(Object.keys(vm.inputDevice)[i]);
                    }
                }

                proposalDetail["INPUT_DEVICE"] = inputDevice;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region


            // region random reward Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && (vm.selectedProposal.type.name === "PlayerFestivalRewardGroup")) {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                let rewardType = vm.selectedProposal.data.rewardType;
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("PlayerFestivalRewardGroup");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                // proposalDetail["proposalPlayerLevel"] = vm.selectedProposal.data.proposalPlayerLevel;
                // proposalDetail["proposalPlayerLevelValue"] = vm.selectedProposal.data.proposalPlayerLevelValue;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realName || " ";
                proposalDetail["lastLoginIp"] = vm.selectedProposal.data.lastLoginIp || " ";
                proposalDetail["phoneNumber"] = vm.selectedProposal.data.phoneNumber || " ";
                proposalDetail["eventCode"] = vm.selectedProposal.data.eventCode;
                proposalDetail["eventId"] = vm.selectedProposal.data.eventId;
                proposalDetail["eventName"] = vm.selectedProposal.data.eventName;
                proposalDetail["rewardInterval"] = vm.selectedProposal.data.intervalType;
                proposalDetail["rewardName"] = vm.selectedProposal.data.rewardName;
                proposalDetail["festivalName"] = vm.selectedProposal.data.festivalName;

                //***
                proposalDetail["playerBirthday"] =  vm.selectedProposal.data.playerBirthday ? $scope.timeReformat(vm.selectedProposal.data.playerBirthday) :'' ;
                proposalDetail["applyTargetDate"] = vm.selectedProposal.data.applyTargetDate;
                proposalDetail["forbidWithdrawAfterApply"] = vm.selectedProposal.data.forbidWithdrawAfterApply;
                proposalDetail["forbidWithdrawIfBalanceAfterUnlock"] = vm.selectedProposal.data.forbidWithdrawIfBalanceAfterUnlock;
                proposalDetail["isDynamicRewardAmount"] = vm.selectedProposal.data.isDynamicRewardAmount;
                proposalDetail["isGroupReward"] = vm.selectedProposal.data.isGroupReward;
                proposalDetail["isIgnoreAudit"] = vm.selectedProposal.data.isIgnoreAudit;
                proposalDetail["providerGroup"] = vm.selectedProposal.data.providerGroup;
                // proposalDetail["realNameBeforeEdit"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["rewardAmount"] = vm.selectedProposal.data.rewardAmount;
                proposalDetail["spendingAmount"] = vm.selectedProposal.data.spendingAmount;
                proposalDetail["useConsumption"] = vm.selectedProposal.data.useConsumption;
                proposalDetail["useConsumptionAmount"] = vm.selectedProposal.data.useConsumptionAmount;
                proposalDetail["useTopUpAmount"] = vm.selectedProposal.data.useTopUpAmount;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;

            }

            // region Update Player Real Name Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "UpdatePlayerRealName") {
                proposalDetail = {};
                let inputDevice = "";
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_Id"] = vm.selectedProposal.data.playerId;
                proposalDetail["Player Level"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["realNameBeforeEdit"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["realNameAfterEdit"] = vm.selectedProposal.data.realNameAfterEdit;

                for (let i = 0; i < Object.keys(vm.inputDevice).length; i++){
                    if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == vm.selectedProposal.inputDevice ){
                        inputDevice =  $translate(Object.keys(vm.inputDevice)[i]);
                    }
                }

                proposalDetail["INPUT_DEVICE"] = inputDevice;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region

            // region Update Partner Real Name Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "UpdatePartnerRealName") {
                proposalDetail = {};
                let inputDevice = "";
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["partnerName"] = vm.selectedProposal.data.partnerName;
                proposalDetail["partnerId"] = vm.selectedProposal.data.partnerId;
                proposalDetail["partnerRealNameBeforeEdit"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["partnerRealNameAfterEdit"] = vm.selectedProposal.data.realNameAfterEdit;

                for (let i = 0; i < Object.keys(vm.inputDevice).length; i++){
                    if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == vm.selectedProposal.inputDevice ){
                        inputDevice =  $translate(Object.keys(vm.inputDevice)[i]);
                    }
                }

                proposalDetail["INPUT_DEVICE"] = inputDevice;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region

            // region Player Bonus Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerBonus") {
                let bankNameWhenSubmit = "";
                let bankNameWhenApprove = "";
                let pmsRemark = "";
                let indexOfDivider = -1;
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["BANK_ACCOUNT_NAME"] = vm.selectedProposal.data.bankAccountNameWhenSubmit;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["playerId"] = vm.selectedProposal.data.playerId;
                proposalDetail["proposalPlayerLevel"] = vm.selectedProposal.data.proposalPlayerLevel;
                proposalDetail["Credit Charge(Service Charge Deducted)"] = vm.selectedProposal.data.amount;
                proposalDetail["ximaWithdrawUsed"] = vm.selectedProposal.data.ximaWithdrawUsed;
                if(vm.selectedProposal.data.creditCharge != vm.selectedProposal.data.oriCreditCharge){
                    proposalDetail["actualCreditCharge"] = vm.selectedProposal.data.creditCharge + " (" + $translate("original service charge") + vm.selectedProposal.data.oriCreditCharge + ", " + $translate("remove decimal") + ")";
                }else{
                    proposalDetail["actualCreditCharge"] = vm.selectedProposal.data.creditCharge
                }
                proposalDetail["oriCreditCharge"] = vm.selectedProposal.data.oriCreditCharge;
                if(typeof vm.selectedProposal.data.isAutoApproval != "undefined"){
                    proposalDetail["isAutoApproval"] = vm.selectedProposal.data.isAutoApproval ? "开启" : "关闭";
                }
                proposalDetail["autoAuditTime"] = vm.selectedProposal.data.autoAuditTime;
                proposalDetail["autoAuditRemark"] = vm.selectedProposal.data.autoAuditRemarkChinese;
                proposalDetail["autoAuditDetail"] = vm.selectedProposal.data.detailChinese;

                if(vm.selectedProposal.data.bankNameWhenSubmit){
                    bankNameWhenSubmit = vm.allBankTypeList[vm.selectedProposal.data.bankNameWhenSubmit] || (vm.selectedProposal.data.bankNameWhenSubmit + " ! " + $translate("not in bank type list"));
                    bankNameWhenSubmit += " / "
                }
                proposalDetail["bankInfoWhenSubmit"] = bankNameWhenSubmit + $translate("bankcard no:") + vm.selectedProposal.data.bankAccountWhenSubmit;

                if(vm.selectedProposal.data.bankNameWhenApprove){
                    bankNameWhenApprove = vm.allBankTypeList[vm.selectedProposal.data.bankNameWhenApprove] || (vm.selectedProposal.data.bankNameWhenApprove + " ! " + $translate("not in bank type list"));
                    bankNameWhenApprove += " / "
                }
                proposalDetail["bankInfoWhenApprove"] = bankNameWhenApprove + $translate("bankcard no:") + vm.selectedProposal.data.bankAccountWhenApprove;
                if (vm.selectedProposal.data.approvedByCs) {
                    proposalDetail["Player forbid apply bonus, apply bonus proposal need cs approval"] = vm.selectedProposal.data.approvedByCs;
                }

                if (vm.selectedProposal.status === 'Fail' && vm.selectedProposal.data.remarkPMS) {
                    proposalDetail["remark"] = vm.selectedProposal.data.remarkPMS;
                }

                if(vm.selectedProposal.data.remarkPMS){
                    pmsRemark = vm.selectedProposal.data.remarkPMS;
                    indexOfDivider = pmsRemark.indexOf("#");

                    if(indexOfDivider > -1){
                        proposalDetail["pmsRemark"] = pmsRemark.substring(0, indexOfDivider);
                        proposalDetail["pmsOperator"] = pmsRemark.substring(indexOfDivider + 1, pmsRemark.length);
                    }
                }
                if(vm.selectedProposal.data.lastSettleTime) {
                    proposalDetail["lastSettleTime"] = vm.selectedProposal.data.lastSettleTime;
                }
                if(vm.selectedProposal.data.bonusSystemName) {
                    proposalDetail["bonusSystemName"] = vm.selectedProposal.data.bonusSystemName;
                }
            }
            //end region

            // region Partner Bonus Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PartnerBonus") {
                let pmsRemark = "";
                let indexOfDivider = -1;
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["partnerRealName"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["PARTNER_NAME"] = vm.selectedProposal.data.partnerName;
                proposalDetail["PARTNER_ID"] = vm.selectedProposal.data.partnerId;
                proposalDetail["Withdrawal amount (system does not support transaction fee)"] = vm.selectedProposal.data.amount;
                if(typeof vm.selectedProposal.data.isAutoApproval != "undefined"){
                    proposalDetail["isAutoApproval"] = vm.selectedProposal.data.isAutoApproval ? $translate("Open") : $translate("Closed");
                }
                proposalDetail["autoAuditTime"] = vm.selectedProposal.data.autoAuditTime;
                proposalDetail["autoAuditRemark"] = vm.selectedProposal.data.autoAuditRemarkChinese;
                proposalDetail["autoAuditDetail"] = vm.selectedProposal.data.detailChinese;
                proposalDetail["Total commission since the last withdrawal (include first level partner commission)"] = vm.selectedProposal.data.lastWithdrawalTotalCommission;

                if(vm.selectedProposal.data.remarkPMS){
                    pmsRemark = vm.selectedProposal.data.remarkPMS;
                    indexOfDivider = pmsRemark.indexOf("#");

                    if(indexOfDivider > -1){
                        proposalDetail["pmsRemark"] = pmsRemark.substring(0, indexOfDivider);
                        proposalDetail["pmsOperator"] = pmsRemark.substring(indexOfDivider + 1, pmsRemark.length);
                    }
                }
                if(vm.selectedProposal.data.bonusSystemName) {
                    proposalDetail["bonusSystemName"] = vm.selectedProposal.data.bonusSystemName;
                }
            }
            // end region

            // region Player Lose Return Reward Group Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name && vm.selectedProposal.type.name == 'PlayerLoseReturnRewardGroup') {
                proposalDetail = vm.selectedProposal.data;
                let checkForHexRegExp = new RegExp("^[0-9a-fA-F]{24}$");
                for (let i in proposalDetail) {
                    if (checkForHexRegExp.test(proposalDetail[i]) || i == 'playerLevelName') {
                        delete proposalDetail[i];
                    }
                }
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail.defineLoseValue = $translate($scope.loseValueType[vm.selectedProposal.data.defineLoseValue]);
                if (vm.selectedProposal.data.rewardPercent) {
                    proposalDetail.rewardPercent = vm.selectedProposal.data.rewardPercent + "%";
                }
            }
            // end region

            // region Bulk Export Player Data Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "BulkExportPlayerData") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                let depositCountQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.depositCountOperator, vm.selectedProposal.data.depositCountFormal, vm.selectedProposal.data.depositCountLater);
                let topUpSumQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.topUpSumOperator, vm.selectedProposal.data.topUpSumFormal, vm.selectedProposal.data.topUpSumLater);
                let playerValueQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.playerValueOperator, vm.selectedProposal.data.playerValueFormal, vm.selectedProposal.data.playerValueLater);
                let totalConsumptionQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.consumptionTimesOperator, vm.selectedProposal.data.consumptionTimesFormal, vm.selectedProposal.data.consumptionTimesLater);
                let bonusAmountQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.bonusAmountOperator, vm.selectedProposal.data.bonusAmountFormal, vm.selectedProposal.data.bonusAmountLater);
                let withdrawalTimesQueryString = vm.getNumberQueryStr(vm.selectedProposal.data.withdrawalTimesOperator, vm.selectedProposal.data.withdrawalTimesFormal, vm.selectedProposal.data.withdrawalTimesLater);

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("BulkExportPlayerData");
                proposalDetail["USER_TYPE"] = $translate(vm.selectedProposal.data.playerType) || " ";
                proposalDetail["BANNER TITLE"] = $translate(vm.selectedProposal.data.title) || " ";
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName || $translate("ALL");
                proposalDetail["CREDIBILITY"] = vm.selectedProposal.data.credibilityRemarkNames && vm.selectedProposal.data.credibilityRemarkNames.length > 0 ? vm.selectedProposal.data.credibilityRemarkNames.join(', ') : " ";
                proposalDetail["LAST_ACCESS_TILL_NOW"] = vm.selectedProposal.data.lastAccessTimeRangeString || " ";
                proposalDetail["FILTER_FEEDBACK_DAY"] = vm.selectedProposal.data.lastFeedbackTimeBefore || " ";
                proposalDetail["DEPOSIT_COUNT"] = depositCountQueryString || " ";
                proposalDetail["PLAYER_VALUE"] = playerValueQueryString || " ";
                proposalDetail["TOTAL_CONSUMPTION_TIMES"] = totalConsumptionQueryString || " ";
                proposalDetail["PLAYER_PROFIT_AMOUNT"] = bonusAmountQueryString || " ";
                proposalDetail["WITHDRAWAL_TIMES"] = withdrawalTimesQueryString || " ";
                proposalDetail["TOTAL_TOP_UP"] = topUpSumQueryString || " ";
                proposalDetail["GAME_LOBBY"] = vm.selectedProposal.data.gameProviderNames && vm.selectedProposal.data.gameProviderNames.length > 0 ? vm.selectedProposal.data.gameProviderNames.join(', ') : " ";
                proposalDetail["REGISTRATION_TIME_START"] = vm.selectedProposal.data.registrationTimeFrom ? $scope.timeReformat(new Date(vm.selectedProposal.data.registrationTimeFrom)) : " ";
                proposalDetail["REGISTRATION_TIME_END"] = vm.selectedProposal.data.registrationTimeTo ? $scope.timeReformat(new Date(vm.selectedProposal.data.registrationTimeTo)) : " ";
                proposalDetail["EXPORT_PLAYER_COUNT"] = vm.selectedProposal.data.exportCount || " ";
                proposalDetail["TARGET_SITE"] = vm.selectedProposal.data.targetExportPlatformName || " ";
                proposalDetail["expirationTime"] = vm.selectedProposal.expirationTime ? $scope.timeReformat(new Date(vm.selectedProposal.expirationTime)) : " ";

                proposalDetail["REMARKS"] = vm.selectedProposal.data.remark || "";
                proposalDetail["cancelBy"] = vm.selectedProposal.data.cancelBy || "";
            }
            // end region

            // region Update Player Info Partner Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "UpdatePlayerInfoPartner") {
                proposalDetail = {};
                let inputDevice = "";
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["oldPartnerName"] = vm.selectedProposal.data.oldPartnerName;
                proposalDetail["newPartnerName"] = vm.selectedProposal.data.newPartnerName;

                for (let i = 0; i < Object.keys(vm.inputDevice).length; i++){
                    if (vm.inputDevice[Object.keys(vm.inputDevice)[i]] == vm.selectedProposal.inputDevice ){
                        inputDevice =  $translate(Object.keys(vm.inputDevice)[i]);
                    }
                }

                proposalDetail["INPUT_DEVICE"] = inputDevice;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region

            // region Update Player Info Level Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "UpdatePlayerInfoLevel") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["oldLevelName"] = vm.selectedProposal.data.oldLevelName;
                proposalDetail["newLevelName"] = vm.selectedProposal.data.newLevelName;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region

            // region Update Player Info Acc Admin Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "UpdatePlayerInfoAccAdmin") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["oldAccAdmin"] = vm.selectedProposal.data.oldAccAdmin;
                proposalDetail["newAccAdmin"] = vm.selectedProposal.data.newAccAdmin;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region

            // region Player Bonus Doubled Reward Group Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && vm.selectedProposal.type.name === "PlayerBonusDoubledRewardGroup") {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                let providerGroupName;
                let timesHasApplied = vm.selectedProposal.data.timesHasApplied || "";
                let quantityLimitInInterval = vm.selectedProposal.data.quantityLimitInInterval || "";
                let transferInAmount = vm.selectedProposal.data.transferInAmount || "";
                let transferOutAmount = vm.selectedProposal.data.transferOutAmount || "";
                let transferInId = vm.selectedProposal.data.transferInId || "";
                let transferOutId = vm.selectedProposal.data.transferOutId || "";
                if (vm.selectedProposal.data && vm.selectedProposal.data.providerGroup) {
                    providerGroupName = vm.getProviderGroupNameById(vm.selectedProposal.data.providerGroup);
                } else {
                    providerGroupName = $translate("LOCAL_CREDIT");
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerId"] = vm.selectedProposal.data.playerId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.playerRealName || " ";
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.proposalPlayerLevel;
                proposalDetail["rewardAmount"] = vm.selectedProposal.data.rewardAmount;
                proposalDetail["spendingAmount"] = vm.selectedProposal.data.spendingAmount;
                proposalDetail["eventName"] = vm.selectedProposal.data.eventName;
                proposalDetail["eventCode"] = vm.selectedProposal.data.eventCode;
                proposalDetail["isIgnoreAudit"] = vm.selectedProposal.data.eventCode;
                proposalDetail["forbidWithdrawAfterApply"] = vm.selectedProposal.data.forbidWithdrawAfterApply;
                proposalDetail["forbidWithdrawIfBalanceAfterUnlock"] = vm.selectedProposal.data.forbidWithdrawIfBalanceAfterUnlock;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
                proposalDetail["useConsumption"] = vm.selectedProposal.data.useConsumption;
                proposalDetail["providerGroup"] = providerGroupName
                proposalDetail["rewardStartTime"] = vm.selectedProposal.data.rewardStartTime;
                proposalDetail["rewardEndTime"] = vm.selectedProposal.data.rewardEndTime;
                proposalDetail["rewardInterval"] = vm.selectedProposal.data.rewardInterval;
                proposalDetail["appliedQuantityOverApplicationLimit"] = timesHasApplied + '/' + quantityLimitInInterval;
                proposalDetail["transferInDetail"] = transferInAmount + ' (' + $translate("transferIn") + "ID" + ': ' + transferInId + ')';
                proposalDetail["transferOutDetail"] = transferOutAmount + ' (' + $translate("transferOut") + "ID" + ': ' + transferOutId  + ')';
                proposalDetail["winLoseAmount"] = vm.selectedProposal.data.winLoseAmount;
                proposalDetail["countWinLoseStartTime"] = vm.selectedProposal.data.countWinLoseStartTime;
                proposalDetail["countWinLoseEndTime"] = vm.selectedProposal.data.countWinLoseEndTime;
                proposalDetail["gameProviderInEvent"] = vm.selectedProposal.data.gameProviderInEvent;

                if (vm.selectedProposal.data.rewardPercent){
                    proposalDetail["rewardPercent"] = vm.selectedProposal.data.rewardPercent;
                }

                if (vm.selectedProposal.data.maxReward){
                    proposalDetail["maxReward"] = vm.selectedProposal.data.maxReward;
                }
            }
            // end region

            // region random reward Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && (vm.selectedProposal.type.name === "PlayerRandomRewardGroup")) {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                let rewardType = vm.selectedProposal.data.rewardType;
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("PlayerRandomRewardGroup");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                // proposalDetail["proposalPlayerLevel"] = vm.selectedProposal.data.proposalPlayerLevel;
                // proposalDetail["proposalPlayerLevelValue"] = vm.selectedProposal.data.proposalPlayerLevelValue;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realName || " ";
                proposalDetail["lastLoginIp"] = vm.selectedProposal.data.lastLoginIp || " ";
                proposalDetail["phoneNumber"] = vm.selectedProposal.data.phoneNumber || " ";
                proposalDetail["eventCode"] = vm.selectedProposal.data.eventCode;
                proposalDetail["eventId"] = vm.selectedProposal.data.eventId;
                proposalDetail["eventName"] = vm.selectedProposal.data.eventName;
                proposalDetail["rewardInterval"] = vm.selectedProposal.data.intervalType;
                proposalDetail["rewardAppearPeriod"] = getIntervalTime($scope, $translate, vm.selectedProposal.data.rewardAppearPeriod);
                proposalDetail["rewardType"] = $translate($scope.randomRewardType[rewardType]);
                proposalDetail["rewardName"] = vm.selectedProposal.data.rewardName;
                proposalDetail["applyTargetDate"] = vm.selectedProposal.data.applyTargetDate;
                proposalDetail["forbidWithdrawAfterApply"] = vm.selectedProposal.data.forbidWithdrawAfterApply;
                proposalDetail["forbidWithdrawIfBalanceAfterUnlock"] = vm.selectedProposal.data.forbidWithdrawIfBalanceAfterUnlock;
                proposalDetail["isDynamicRewardAmount"] = vm.selectedProposal.data.isDynamicRewardAmount;
                proposalDetail["isGroupReward"] = vm.selectedProposal.data.isGroupReward;
                proposalDetail["isIgnoreAudit"] = vm.selectedProposal.data.isIgnoreAudit;
                proposalDetail["providerGroup"] = vm.selectedProposal.data.providerGroup;
                // proposalDetail["realNameBeforeEdit"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["rewardAmount"] = vm.selectedProposal.data.rewardAmount;
                proposalDetail["spendingAmount"] = vm.selectedProposal.data.spendingAmount;
                proposalDetail["useConsumption"] = vm.selectedProposal.data.useConsumption;
                proposalDetail["useConsumptionAmount"] = vm.selectedProposal.data.useConsumptionAmount;
                proposalDetail["useTopUpAmount"] = vm.selectedProposal.data.useTopUpAmount;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region

            // region random reward Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && (vm.selectedProposal.type.name === "ReferralRewardGroup")) {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }
                let rewardType = vm.selectedProposal.data.rewardType;
                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["MAIN_TYPE"] = $translate("ReferralRewardGroup");
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.playerLevelName;
                proposalDetail["PLAYER_REAL_NAME"] = vm.selectedProposal.data.realName || " ";
                proposalDetail["eventCode"] = vm.selectedProposal.data.eventCode;
                proposalDetail["eventId"] = vm.selectedProposal.data.eventId;
                proposalDetail["eventName"] = vm.selectedProposal.data.eventName;
                proposalDetail["rewardInterval"] = vm.selectedProposal.data.intervalType;
                proposalDetail["forbidWithdrawAfterApply"] = vm.selectedProposal.data.forbidWithdrawAfterApply;
                proposalDetail["forbidWithdrawIfBalanceAfterUnlock"] = vm.selectedProposal.data.forbidWithdrawIfBalanceAfterUnlock;
                proposalDetail["isGroupReward"] = vm.selectedProposal.data.isGroupReward;
                proposalDetail["isIgnoreAudit"] = vm.selectedProposal.data.isIgnoreAudit;
                proposalDetail["providerGroup"] = vm.selectedProposal.data.providerGroup;
                proposalDetail["rewardAmount"] = vm.selectedProposal.data.rewardAmount;
                proposalDetail["spendingAmount"] = vm.selectedProposal.data.spendingAmount;
                proposalDetail["useConsumption"] = vm.selectedProposal.data.useConsumption;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
            }
            // end region

            // region auction product Proposal
            if (vm.selectedProposal && vm.selectedProposal.type && (vm.selectedProposal.type.name === "AuctionPromoCode" || vm.selectedProposal.type.name === "AuctionOpenPromoCode" ||
                vm.selectedProposal.type.name === "AuctionRewardPromotion" || vm.selectedProposal.type.name === "AuctionRealPrize" || vm.selectedProposal.type.name === "AuctionRewardPointChange")) {
                proposalDetail = {};
                if (!vm.selectedProposal.data) {
                    vm.selectedProposal.data = {};
                }

                proposalDetail["PRODUCT_NAME"] = vm.selectedProposal.data.platformId.name;
                proposalDetail["PROPOSAL_NO"] = vm.selectedProposal.proposalId;
                proposalDetail["playerName"] = vm.selectedProposal.data.playerName;
                proposalDetail["realNameBeforeEdit"] = vm.selectedProposal.data.realNameBeforeEdit;
                proposalDetail["remark"] = vm.selectedProposal.data.remark;
                proposalDetail["PLAYER_LEVEL"] = vm.selectedProposal.data.proposalPlayerLevel;
                proposalDetail["productName"] = vm.selectedProposal.data.productName;
                proposalDetail["Seller"] = vm.selectedProposal.data.seller;
                proposalDetail["startingPrice"] = vm.selectedProposal.data.startingPrice;
                proposalDetail["directPurchasePrice"] = vm.selectedProposal.data.directPurchasePrice;
                proposalDetail["isExclusive"] = vm.selectedProposal.data.isExclusive;
            }
            // end region


            if (vm.selectedProposal && vm.selectedProposal.data && vm.selectedProposal.data.rewardPeriod){
                proposalDetail["rewardPeriod"] =  $scope.timeReformat(vm.selectedProposal.data.rewardPeriod.startTime) + ' ~ ' + $scope.timeReformat(vm.selectedProposal.data.rewardPeriod.endTime);
            }
            if (vm.selectedProposal.data.hasOwnProperty("cancelRemark")) {
                proposalDetail["cancelRemark"] = vm.selectedProposal.data.cancelRemark;
            }
            if (vm.selectedProposal.data.hasOwnProperty("rejectRemark")) {
                proposalDetail["rejectRemark"] = vm.selectedProposal.data.rejectRemark;
            }
            if (vm.selectedProposal.data.hasOwnProperty("playerCancelRemark")) {
                proposalDetail["playerCancelRemark"] = vm.selectedProposal.data.playerCancelRemark;
            }

            return proposalDetail;
        };

        this.forcePairingWithReferenceNumber = ($scope, $translate, socketService, platformId, proposalObjId, proposalId, referenceNumber) => {
            if(platformId && proposalObjId && proposalId && referenceNumber) {
                console.log("forcePairingWithReferenceNumber ", platformId, proposalObjId, proposalId, referenceNumber);
                return $scope.$socketPromise("forcePairingWithReferenceNumber", {
                    platformId: platformId,
                    proposalObjId: proposalObjId,
                    proposalId: proposalId,
                    referenceNumber: referenceNumber
                }).then(
                    data=>{
                        console.log("data",data);
                        socketService.showConfirmMessage($translate("Force Pairing") + $translate("Success"),5000);
                    },
                    err=>{
                        console.log("err",err);
                    }
                );
            }
        };

        this.sortAndAddPlatformDisplayName = (platforms) => {
            platforms.sort((current, next)=>{
                let curId = parseInt(current.platformId);
                let nextId = parseInt(next.platformId);
                if(!isNaN(curId) && !isNaN(nextId)) {
                    return curId - nextId;
                } else {
                    return 1;
                }
            });
            platforms.forEach(platform=>{
                platform.name$ = `${platform.platformId}. ${platform.name}`;
            });
        };
    };

    let commonServiceApp = angular.module('commonService', []);

    //Must be a provider since it will be injected into module.config()
    commonServiceApp.provider('commonService', commonService);
});
