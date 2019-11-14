import React, {Component} from 'react';

class Content extends Component{
    state = {

    };

    render(){
        let newText = this.props.desc.split('\n').map(i => {
            return <p>{i}</p>
        });

        return (
            <div className="mb-5 p-2 ">
                <div className="mt-3">
                    <h2>{this.props.title} ({this.props.functionName})</h2>
                </div>

                <div className="mt-3">
                    {newText}
                </div>

                <div className="mt-3">
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
                </div>

                <div className="mt-3">
                    {this.props.respondSuccess ? <h5>操作成功:</h5> : null}
                    <div className="bg-light p-1 pl-2">
                        {this.props.respondSuccess}
                    </div>
                </div>

                <div className="mt-3">
                    {this.props.respondFailure ? <h5>操作失败:</h5> : null}
                    <div className="bg-light p-1 pl-2">
                        {this.props.respondFailure}
                    </div>
                </div>
            </div>
        )
    }
}

export default Content;



