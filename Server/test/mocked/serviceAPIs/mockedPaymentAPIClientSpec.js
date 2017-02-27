module.exports = {

    connection: {

    },

    foundation: {

        getProvinceList: data => ({

        })

    },

    platform: {

        add: data => ({code: '1470216200663', status: 200}),

        update: data => ({code: '1470217601365', status: 200}),

        delete: data => undefined,   // From what I can tell, this doesn't actually respond!,

        syncData: data => ({}),   // @todo Provide sensible response

    },

    bankcard: {

        getBankTypeList: data => ({
            data: [
                {
                    id: '1',
                    bankTypeId: '0',
                    name: '中国工商银行',
                    iconURL: 'http://aeson.neweb.me:9036/http/pss/getImg?id=1473388168407'
                },
                {
                    id: '2',
                    bankTypeId: '1',
                    name: '中国农业银行',
                    iconURL: 'http://aeson.neweb.me:9036/http/pss/getImg?id=1473388168407'
                },
                {
                    id: '3',
                    bankTypeId: '2',
                    name: '中国银行',
                    iconURL: 'http://aeson.neweb.me:9036/http/pss/getImg?id=1473388168407'
                },
                {
                    id: '4',
                    bankTypeId: '3',
                    name: '中国建设银行',
                    iconURL: 'http://aeson.neweb.me:9036/http/pss/getImg?id=1473388168407'
                },
            ]
        }),

    },

    bonus: {

        getBonusList: data => ({
            status: 200,
            bonuses: [
                {
                    bonus_id: 1,
                    code: 'code1',
                    name: 'test1',
                    credit: 100,
                    description: 'test bonus 1',
                    createtime: 'Jul 26, 2016 12:00:00 AM'
                },
                {
                    bonus_id: 2,
                    code: 'code2',
                    name: 'test2',
                    credit: 50,
                    description: 'test bonus 2',
                    createtime: 'Jul 26, 2016 12:00:00 AM'
                }
            ]
        }),

        applyBonus: data => ({
            status: 200,
            proposalId: data.proposalId,
            bonusTaskId: data.bonusId,
        })

    },

    payment: {
        requestManualBankCard: data => ({
            result: {
                cardOwner: 'testbankca',
                createTime: '2016-08-05 16:43:01',
                validTime: '2016-08-05 16:43:01'
            },
            status: 200,
            requestId: 'ManualTopUpRequest_3',
        }),

        requestOnlineMerchant: req => ({
            status: 200,
            result: {
                requestId: 'OnlineMerchantRequest_4',
                proposalId: req.proposalId,
                platformId: req.platformId,
                userName: req.userName,
                topupType: req.topupType,
                merchantUseType: req.merchantUseType,
                clientType: req.clientType,
                amount: req.amount,
                groupMerchantList: req.groupMerchantList,   // [5896765,5487694, 567346,55467454]
            }
        }),
    }

};