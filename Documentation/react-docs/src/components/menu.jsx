import React, {Component} from 'react';

class Menu extends Component{
    render(){
        return (
            <div className="navBar">
                <ul className="navbar-nav mt-3 mb-3">
                    {this.props.nav}
                </ul>
            </div>

        )
    }
}

export default Menu;



