import React, {Component} from 'react';

class Content extends Component{
    state = {
    };


    render(){

        return (
            <div className="col-8">
                <div className="card">
                    <div className="card-header">
                        {this.props.linkBtn}
                    </div>
                    <div className="card-body" style={{height: "250px"}}>
                        <li>Description: {this.props.desc}</li>
                        Request Content:<ul> {this.props.requestContent}</ul>
                        <li>Status Of Success: {this.props.statusSuccess}</li>
                        <li>Status Of Failed: {this.props.statusFailed}</li>
                    </div>
                </div>

            </div>
        )
    }
}
//<li>Request Content: {this.props.requestContent}</li>
export default Content;



