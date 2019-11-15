import React, {Component} from 'react';

/*
props as follows:
title: function title/name in chinese and navigation
desc: function description
serviceName: service name where this function resides (exact, case sensitive)
functionName: functin name (exact, case sensitive)
requestContent: table description for expected API request payload
respondSuccess: text/JSON description for API response payload in the event of successful operation
respondSuccessContent: table description for API response payload (related to respondSuccess)
respondFailure: text/JSON description for API response payload in the event of failed operation
*/
const htmlTags = ['<img','<b>','<u>','<i>','<h1>','<h2>','<h3>'];

class Content extends Component{
    state = {};
    drawDescription = () => {
        if(this.props.desc) {
            return this.props.desc.split(/\r?\n/).map((v,i) => {
                let isHTML = false;
                htmlTags.forEach(tag => {
                    if(v.toLowerCase().indexOf(tag) > -1) {
                        isHTML = true;
                    }
                })
                if(isHTML) {
                    return (
                        <div key={i} dangerouslySetInnerHTML={{__html: v}}></div>
                    )
                } else {
                    return <p key={i} className="text-justify">{v}</p>
                }
            });
        } else {
            return <p></p>
        }
    };

    drawRequestContent = () => {
        if(this.props.requestContent && Object.keys(this.props.requestContent)) {
            return (
                <div>
                    <h5><b>请求内容:</b></h5>
                    <table className="table table-bordered table-sm">
                        <thead>
                            <tr>
                                <th>参数</th>
                                <th>必填</th>
                                <th>类别</th>
                                <th>内容</th>
                            </tr>
                        </thead>
                        <tbody>
                            {this.drawTableRows(this.props.requestContent)}
                        </tbody>
                    </table>
                </div>
            )
        }
    };

    drawRespondSucess = () => {
        if(this.props.respondSuccess && Object.keys(this.props.respondSuccess)) {
            return (
                <div>
                    <h5><b>操作成功:</b></h5>
                    <div className="bg-light p-1 pl-2 mb-1">
                        {this.drawRespondArea(this.props.respondSuccess)}
                    </div>
                </div>
            )
        }
    };

    drawRespondSuccessContent = () => {
        if(this.props.respondSuccessContent && this.props.respondSuccessContent.length) {
            return (
                <div className="ml-4">
                    <h6><b>响应内容:</b></h6>
                    <table className="table table-bordered table-sm">
                        <tr>
                            <th>参数</th>
                            <th>内容</th>
                        </tr>
                        <tbody>
                            {this.drawTableRows(this.props.respondSuccessContent)}
                        </tbody>
                    </table>
                </div>
            )
        } else {
            return null;
        }
    };

    drawRespondFailure = () => {
        if(this.props.respondFailure && Object.keys(this.props.respondFailure)) {
            return (
                <div>
                    <h5><b>操作失败:</b></h5>
                    <div className="bg-light p-1 pl-2">
                        {this.drawRespondArea(this.props.respondFailure)}
                    </div>
                </div>
            )
        }
    };

    drawRespondArea = (inputObj) => {
        let rows = [];
        for(let key in inputObj){
            if(key === "data") {
                let lines = inputObj[key].split(/\r?\n/);
                rows.push(
                    <div key={key}>data: {lines[0]}</div>
                )
                lines.forEach((line, index) => {
                    if(index > 0) {
                        line = line.replace(/\s/g, "\u00a0");
                        rows.push(
                            <div>{line}</div>
                        )
                    }
                });
            } else {
                rows.push(
                    <div key={key}>{key} : {inputObj[key]}</div>
                )
            }
        }
        return rows;
    };

    drawTableRows = (inputArr) => {
        let rows = [];
        if(inputArr && inputArr.length) {
            rows = inputArr.map((item) => {
                return (
                    <tr key={item.param}>
                        {item.hasOwnProperty("param") ? <td>{item.param}</td> : null}
                        {item.hasOwnProperty("mandatory") ? <td>{item.mandatory}</td> : null}
                        {item.hasOwnProperty("type") ? <td>{item.type}</td> : null}
                        {item.hasOwnProperty("content") ? <td>{item.content}</td> : null}
                    </tr>
                )
            });
        }
        return rows;
    };

    render() {
        return (
            <div className="mb-5 p-2 ">
                <div className="mt-3">
                    <h2><b>{this.props.title}</b></h2>
                </div>

                <div className="mt-3">
                    {this.drawDescription()}
                </div>

                <div className="mt-3">
                    {this.props.serviceName ? <h5><b>服务:</b> {this.props.serviceName}</h5> : null}
                    {this.props.functionName ? <h5><b>接口:</b> {this.props.functionName}</h5> : null}
                </div>

                <div className="mt-3">
                    {this.drawRequestContent()}
                </div>

                <div className="mt-3 text-monospace">
                    {this.drawRespondSucess()}
                    {this.drawRespondSuccessContent()}
                </div>

                <div className="mt-3 text-monospace">
                    {this.drawRespondFailure()}
                </div>
            </div>
        )
    }
}

export default Content;



