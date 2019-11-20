const sampleData = {
    getWithdrawalInfo: `{
        freeTimes: 免手续费提款剩余次数
        serviceCharge: 手续费
        currentFreeAmount: 免手续费提款额
        freeAmount: 可提款金额
        ximaWithdraw: 可提款洗码金额
        lockList: [{ 现有锁大厅
        name: 大厅名字
        lockAmount: 锁定额度
        currentLockAmount: 锁定额度余额
        }]
}`,
    updatePlayerQQSuccess: `{
        //第一次绑定，没填qq
        {}
        
        //编辑，有填qq
        {提案资料........}
}`,
    updatePlayerQQFailure: `{ 
        //编辑，没有有填qq
        "name": "DataError",
        "message": "INVALID_DATA",
        "errorMessage": "数据无效"
        
}`,
    updatePlayerWeChatSuccess: `{
        //第一次绑定，没填wechat
        {}
        
        //编辑，有填wechat
        {提案资料........}

}`,
    updatePlayerWeChatFailure: `{
        //编辑，没有有填wechat
        "name": "DataError",
        "message": "INVALID_DATA",
        "errorMessage": "数据无效"
        
}`,
    updatePlayerEmailSuccess: `{
        //第一次绑定，没填email
        {}
        
        //编辑，有填email
        {提案资料........}
}`,
    updatePlayerEmailFailure: `{
        //编辑，没有有填email
        "name": "DataError",
        "message": "INVALID_DATA",
        "errorMessage": "数据无效"
        
}`,


}

let information = {
    name: "玩家信息/资料",
    func: {
        get: {
            title: "获取玩家基本信息",
            serviceName: "player",
            functionName: "get",
            desc: "客户端获取玩家的基本信息，包括邮箱，地址，以及玩家等级详细信息。通过这个接口，还会返回更多的玩家信息。",
            requestContent: [
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
            ],
            respondSuccess: {
                status: 200,
                data: "玩家对象 hasPassword: 玩家是否有修改过密码",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        getWithdrawalInfo: {
            title: "登入后获取提款信息",
            serviceName: "player",
            functionName: "getWithdrawalInfo",
            desc: "获取提款信息",
            requestContent: [
                {param: "platformId", mandatory: "是", type: 'String', content: '平台ID'},
            ],
            respondSuccess: {
                status: 200,
                data: sampleData.getWithdrawalInfo,
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        updatePaymentInfo: {
            title: "修改玩家的支付信息",
            serviceName: "player",
            functionName: "updatePaymentInfo",
            desc: "提供一个修改玩家的支付信息的接口",
            requestContent: [
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
                {param: "bankName", mandatory: "是", type: 'String', content: '银行名称ID'},
                {param: "bankAccount", mandatory: "是", type: 'String', content: '银行账号'},
                {param: "bankAccountType", mandatory: "否", type: 'String', content: '账号类型 -- 1:信用卡 , 2:借记卡（默认2）'},
                {param: "bankAccountProvince", mandatory: "否", type: 'String', content: '开户省 "130000" (河北省）'},
                {param: "bankAccountCity", mandatory: "否", type: 'String', content: '开户城市"130700"（张家口）'},
                {param: "bankAccountDistrict", mandatory: "否", type: 'String', content: '开户地区"130734"（其它区）'},
                {param: "bankAddress", mandatory: "否", type: 'String', content: '银行地址'},
                {param: "remark", mandatory: "否", type: 'String', content: '备注'},
                {param: "smsCode", mandatory: "否", type: 'String', content: '短信验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        updatePassword: {
            title: "修改玩家登录密码",
            serviceName: "player",
            functionName: "updatePassword",
            desc: "提供一个用于修改玩家密码的接口",
            requestContent: [
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
                {param: "oldPassword", mandatory: "是", type: 'String', content: '旧密码'},
                {param: "newPassword", mandatory: "是", type: 'String', content: '新密码'},
                {param: "smsCode", mandatory: "否", type: 'String', content: 'SMS验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "",
            },
            respondFailure: {
                status: "40x",
                data: "-",
                errorMessage: "错误信息",
            }
        },
        updatePhoneNumberWithSMS: {
            title: "修改玩家电话",
            serviceName: "player",
            functionName: "updatePhoneNumberWithSMS",
            desc: "",
            requestContent: [
                {param: "platformId", mandatory: "是", type: 'String', content: '平台ID'},
                {param: "playerId", mandatory: "是", type: 'String', content: '玩家ID'},
                {param: "smsCode", mandatory: "是", type: 'String', content: 'SMS验证码 '},
                {param: "newPhoneNumber", mandatory: "否", type: 'String', content: '手机号 - 若只验证旧号码或无验证'},
            ],
            respondSuccess: {
                status: 200,
                data: "",
            },
            respondFailure: {
                status: "4xx",
                data: "-",
                errorMessage: "",
            }
        },
        updatePlayerQQ: {
            title: "编辑玩家QQ",
            serviceName: "player",
            functionName: "updatePlayerQQ",
            desc: "",
            requestContent: [
                {param: "qq", mandatory: "否", type: 'String', content: '(第一次绑定可选择不填写,第二次修改必填)'},
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.updatePlayerQQSuccess ,
            },
            respondFailure: {
                status: "420 / 405",
                data: sampleData.updatePlayerQQFailure,
                errorMessage: "验证失败, 请先登录",
            }
        },
        updatePlayerWeChat: {
            title: "编辑玩家wechat",
            serviceName: "player",
            functionName: "updatePlayerWeChat",
            desc: "",
            requestContent: [
                {param: "wechat", mandatory: "否", type: 'String', content: '(第一次绑定可选择不填写,第二次修改必填)'},
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.updatePlayerWeChatSuccess ,
            },
            respondFailure: {
                status: "420 / 405",
                data: sampleData.updatePlayerWeChatFailure,
                errorMessage: "验证失败, 请先登录",
            }
        },
        updatePlayerEmail: {
            title: "编辑玩家email",
            serviceName: "player",
            functionName: "updatePlayerEmail",
            desc: "",
            requestContent: [
                {param: "wechat", mandatory: "否", type: 'String', content: '(第一次绑定可选择不填写,第二次修改必填)'},
            ],
            respondSuccess: {
                status: 200,
                data:sampleData.updatePlayerEmailSuccess ,
            },
            respondFailure: {
                status: "420 / 405",
                data: sampleData.updatePlayerEmailFailure,
                errorMessage: "验证失败, 请先登录",
            }
        },
        changeBirthdayDate: {
            title: "修改生日日期",
            serviceName: "player",
            functionName: "changeBirthdayDate",
            desc: "",
            requestContent: [
                {param: "date", mandatory: "是", type: 'Date', content: '生日日期 (需登入)'},
            ],
            respondSuccess: {
                status: 200,
                data:"玩家对象",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        updatePasswordWithToken: {
            title: "令牌更新密码",
            serviceName: "player",
            functionName: "updatePasswordWithToken",
            desc: "",
            requestContent: [
                {param: "token", mandatory: "是", type: 'String', content: ''},
                {param: "password", mandatory: "是", type: 'String', content: '玩家要更换的密码'},
            ],
            respondSuccess: {
                status: 200,
                data:"true",
            },
            respondFailure: {
                status: "40x",
                data: "null",
                errorMessage: "",
            }
        },
        updatePasswordByPhoneNumber: {
            title: "通过电话号码重置密码",
            serviceName: "player",
            functionName: "updatePasswordByPhoneNumber",
            desc: "",
            requestContent: [
                {param: "platformId", mandatory: "否", type: 'String', content: '平台ID'},
                {param: "phoneNumber", mandatory: "是", type: 'String', content: '玩家电话号码'},
                {param: "newPassword", mandatory: "是", type: 'String', content: '新密码'},
                {param: "smsCode", mandatory: "是", type: 'String', content: '短信验证码'},
            ],
            respondSuccess: {
                status: 200,
                data: "{text:'密码修改成功'}",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
        updatePlayerAvatar: {
            title: "设置头像信息",
            serviceName: "player",
            functionName: "updatePlayerAvatar",
            desc: "",
            requestContent: [
                {param: "avatar", mandatory: "否", type: 'String', content: '头像'},
                {param: "avatarFrame", mandatory: "否", type: 'String', content: '头像框'},
            ],
            respondSuccess: {
                status: 200,
                data:"玩家资料",
            },
            respondFailure: {
                status: "4xx",
                data: "null",
                errorMessage: "",
            }
        },
    }

};
export default information;