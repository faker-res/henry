import React, {Component} from 'react';

class Content extends Component{
    state = {

    };



    render(){
        return (
            <div>
                <div className="card">
                    <div className="card-header" id={this.props.contentId}>
                        <h2>{this.props.contentTitle}</h2>
                    </div>
                    <div className="card-body">


                    </div>
                </div>
            </div>
        )
    }
}

export default Content;



