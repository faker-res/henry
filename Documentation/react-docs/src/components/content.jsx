import React, {Component} from 'react';

class Content extends Component{
    state = {

    };

    render(){
        return (
            <div className="mb-5 p-2 ">
                <div>
                    <h2>{this.props.title} ({this.props.functionName})</h2>
                </div>

                <div>
                    <h5>{this.props.desc}</h5>


                    <h5>请求内容:</h5>
                    <table className="table table-bordered table-sm">
                        <tr>
                            <th>参数</th>
                            <th>必填</th>
                            <th>类别</th>
                            <th>内容</th>
                        </tr>
                        {this.props.requestContent}
                    </table>


                    {this.props.respondSuccess ? <h5>操作成功:</h5> : null}
                    <table className="table table-bordered table-sm">
                        {this.props.respondSuccess}
                    </table>
                    {this.props.respondFailure ? <h5>操作失败:</h5> : null}
                    <table className="table table-bordered table-sm">
                        {this.props.respondFailure}
                    </table>

                    </div>
            </div>
        )
    }
}

export default Content;



