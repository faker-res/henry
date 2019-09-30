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
                <a href={this.props.urlList}>
                    <p>{this.props.urlList}</p>
                </a>
            </div>
        )
    }
}
/*<a href={this.state.linkList.url}>
    <p>{this.state.linkList.url}</p>
</a>*/
export default Content;



