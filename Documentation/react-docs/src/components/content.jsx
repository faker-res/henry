import React, {Component} from 'react';

class Content extends Component{
    state = {

    };

    render(){
        return (
            <div className="col-7">
                <div className="card">
                    <div className="card-header">
                        {this.props.linkBtn}
                    </div>
                    <div className="card-body" >
                        <h2>{this.props.title}</h2>
                        <br></br>
                        <h5>functionName: {this.props.functionName}</h5>
                        <h5>{this.props.desc}</h5>
                        <h5>请求内容:</h5>
                        <table className="table table-bordered table-sm">
                            {this.props.requestContent}
                        </table>
                        <h5>操作成功:</h5>
                        <table className="table table-bordered table-sm">
                            {this.props.statusOfSuccess}
                        </table>
                        <h5>操作失败:</h5>
                        <table className="table table-bordered table-sm">
                            {this.props.statusOfFailed}
                        </table>


                        {/*{this.props.data}*/}
                    </div>
                </div>
                {/*<a href={this.props.url}>*/}
                    {/*<h4>{this.props.name}</h4>*/}
                {/*</a>*/}
            </div>
        )
    }
}

export default Content;



