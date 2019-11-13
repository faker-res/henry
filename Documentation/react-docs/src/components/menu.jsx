import React, {Component} from 'react';
import apiData from '../data/apiDocumentation';

class Menu extends Component{
    render(){
        return (
            <div className="col-4 col-sm-4 col-md-3 col-lg-2">
                <div className="card">
                    <div className="card-body" style={{height: "100%"}}>
                        <ul className="nav flex-column">
                            {this.props.list}
                        </ul>
                    </div>
                </div>

            </div>
        )
    }
}

export default Menu;



