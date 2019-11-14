import React, {Component} from 'react';

class Content extends Component{
    state = {

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
                        {this.props.respondSuccessContent}
                    </table>
                </div>
            )
        } else {
            return null;
        }
    }

    render(){
        let newText = this.props.desc.split('\n').map(i => {
            return <p>{i}</p>
        });

        return (
            <div className="mb-5 p-2 ">
                <div className="mt-3">
                    <h2><b>{this.props.title}</b></h2>
                </div>

                <div className="mt-3">
                    {newText}
                </div>

                <div className="mt-3">
                    <h5><b>服务:</b> {this.props.serviceName}</h5>
                    <h5><b>接口:</b> {this.props.functionName}</h5>
                </div>

                <div className="mt-3">
                    <h5><b>请求内容:</b></h5>
                    <table className="table table-bordered table-sm">
                        <tr>
                            <th>参数</th>
                            <th>必填</th>
                            <th>类别</th>
                            <th>内容</th>
                        </tr>
                        {this.props.requestContent}
                    </table>
                </div>

                <div className="mt-3 text-monospace">
                    {this.props.respondSuccess ? <h5><b>操作成功:</b></h5> : null}
                    <div className="bg-light p-1 pl-2 mb-1">
                        {this.props.respondSuccess}
                    </div>
                    {this.drawRespondSuccessContent()}
                </div>

                <div className="mt-3 text-monospace">
                    {this.props.respondFailure ? <h5><b>操作失败:</b></h5> : null}
                    <div className="bg-light p-1 pl-2">
                        {this.props.respondFailure}
                    </div>
                </div>
            </div>
        )
    }
}

export default Content;



