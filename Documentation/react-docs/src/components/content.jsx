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
const htmlTags = ['<img','<b>','<u>','<i>','<h1>','<h2>','<h3>','<h4>','<h5>','<h6>'];

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
                let nbsp = '';
                for (let c = 0; c < v.length; c++) {
                    if(v.charAt(c)!==" ") {
                        break;
                    }
                    nbsp += "\u00a0";
                }
                v = nbsp + v.trim();
                
                if(isHTML) {
                    return (
                        <div key={i} dangerouslySetInnerHTML={{__html: v}}></div>
                    )
                } else {
                    return <div key={i} className="text-justify">{v}<br/></div>
                }
            });
        } else {
            return <p></p>
        }
    };

    drawExampleCode = () => {
        let area = [];
        if(this.props.exampleCode) {
            for(let key in this.props.exampleCode) {
                area.push(this.drawExampleCodeArea(key, this.props.exampleCode[key]));
            }
            return (
                <div>
                <h4><b>示例：</b></h4>
                    {area}
                </div>
            )
        }
    }

    drawRequestContent = () => {
        if(this.props.requestContent && this.props.requestContent.length) {
            let rowData = this.props.requestContent;
            let fields = Object.keys(this.props.requestContent[0])
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
                            {this.drawTableRows(rowData, fields, "param")}
                        </tbody>
                    </table>
                </div>
            )
        } else if(this.props.requestContent && this.props.requestContent.length === 0) {
            return (
                <div>
                    <h5><b>请求内容:</b></h5>
                    <div className="bg-light p-1 pl-2">此函数不需要请求内容</div>
                </div>
            )
        }
    };

    drawRespondSucess = () => {
        if(this.props.respondSuccess && Object.keys(this.props.respondSuccess)) {
            return (
                <div>
                    <h5><b>操作成功:</b></h5>
                    <div className="respond-area bg-light p-1 pl-2 mb-1">
                        {this.drawRespondArea(this.props.respondSuccess)}
                    </div>
                </div>
            )
        }
    };

    drawRespondSuccessContent = () => {
        if(this.props.respondSuccessContent && this.props.respondSuccessContent.length) {
            let rowData = this.props.respondSuccessContent;
            let fields = Object.keys(this.props.respondSuccessContent[0])
            return (
                <div className="ml-4">
                    <h6><b>响应内容:</b></h6>
                    <table className="table table-bordered table-sm">
                        <tr>
                            <th>参数</th>
                            <th>内容</th>
                        </tr>
                        <tbody>
                            {this.drawTableRows(rowData, fields, "param")}
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

    drawExampleCodeArea = (name, content) => {
        let rows = [];
        let lines = content.split(/\r?\n/);
        lines.forEach((line, index) => {
            line = line.replace(/\s/g, "\u00a0");
            rows.push(
                <div key={index}>{line}</div>
            )
        });
        return (
            <div key={name}>
                <div className="code-area bg-light p-1 pl-2 mb-1">
                    {rows}
                </div>
                <div>{name}</div>
                <br /><br />
            </div>
        );
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
                            <div key={index}>{line}</div>
                        )
                    }
                });
            } else {
                rows.push(
                    <div key={key}>{key}: {inputObj[key]}</div>
                )
            }
        }
        return rows;
    };

    drawTableRows = (inputArr, fields, listKeyProperty) => {
        let rows = [];
        if(inputArr && inputArr.length) {
            rows = inputArr.map((item) => {
                listKeyProperty = listKeyProperty || Object.keys(item)[0];

                let cells = fields.map(field => {
                    if(item[field]) {
                        let inCell = [];
                        let lines = item[field].split(/\r?\n/);
                        lines.forEach((line, index) => {
                            inCell.push(
                                <div key={index}>{line}</div>
                            )
                        });
                        return (
                            <td key={field}>{inCell}</td>
                        )
                    } else {
                        return (
                            <td key={field}></td>
                        )
                    }
                })

                return (
                    <tr key={item[listKeyProperty]}>
                        {cells}
                    </tr>
                )
            });
        }
        return rows;
    };

    drawDefinitionData = () => {
        if(this.props.fields && this.props.definitionData && this.props.definitionData.length) {
            let rowData = this.props.definitionData;
            let fields = Object.keys(this.props.fields)
            return (
                <div>
                    <table className="table table-bordered table-sm w-auto">
                        <thead>
                            <tr>
                                {this.props.fields.hasOwnProperty("name") ? <th>{this.props.fields.name}</th> : null}
                                {this.props.fields.hasOwnProperty("value") ? <th>{this.props.fields.value}</th> : null}
                                {this.props.fields.hasOwnProperty("desc") ? <th>{this.props.fields.desc}</th> : null}
                            </tr>
                        </thead>
                        <tbody>
                            {this.drawTableRows(rowData, fields, 'name')}
                        </tbody>
                    </table>
                </div>
            )
        }
    };

    render() {
        return (
            <div id={this.props.functionName} className="mb-5 p-2 ">
                <div className="mt-3">
                    <h3><b>{this.props.title}</b></h3>
                </div>

                <div className="mt-3">
                    {this.drawDescription()}
                </div>

                <div className="mt-3">
                    {this.drawExampleCode()}
                </div>

                <div className="mt-3">
                    {this.drawDefinitionData()}
                </div>

                <div className="mt-3">
                    {
                        this.props.serviceName && this.props.functionName ? 
                        <h5><b>请求函数:</b> FPMS.{this.props.serviceName}.{this.props.functionName}(请求内容)</h5> : 
                        null
                    }
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



