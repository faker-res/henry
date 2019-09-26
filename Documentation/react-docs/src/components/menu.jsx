import React, {Component} from 'react';

class Menu extends Component{
    render(){
        return (
            <div className="col-2">
                <div className="card">
                    <div className="card-body" style={{height: "100%"}}>
                        <ul>
                            {this.props.list}
                        </ul>
                    </div>
                </div>

            </div>
        )
    }
}

export default Menu;



