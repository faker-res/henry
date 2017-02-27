module.exports = {

    channel: {

        getSMSChannelList: data => ({
            queryId: '1', channels: [2, 1]
        }),

        getChannelList: data => ({
            queryId: '1', channels: [2, 1]
        }),

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

    merchant: {

        getMerchantList: data => ({
            queryId: '2', merchants: []
        }),

    },

};