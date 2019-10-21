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

                    </div>
                </div>
                <a href={this.props.url}>
                    <h4>{this.props.name}</h4>
                </a>
            </div>
        )
    }
}

export default Content;



