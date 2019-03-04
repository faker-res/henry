import React, {Component} from 'react';
import SelectServer from './selectServer';
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";



class NavBar extends Component{

    state = {
        path: 'navbar'
    }

    openNav () {
       const a = document.getElementById("myNav");
       a.style.height ="100%";
    }
    closeNav = () => {
        const a = document.getElementById("myNav");
        a.style.height ="0%";

    }
    render(){
        return (
            <div>
                <nav className="nav-bar">
                    <FontAwesomeIcon icon="bars" size="2x" color="white" onClick={this.openNav}/>
                    <FontAwesomeIcon className="float-right" icon="user-circle" size="2x" color="white" />
                </nav>

                <div id="myNav" className="overlay" >
                <a href="javascript:void(0)" className="closebtn" onClick={this.closeNav}>&times;</a>
                    <div className="overlay-header">

                        <div className="form-group">
                            <select className="form-control">
                                <option>1</option>
                                <option>2</option>
                                <option>3</option>
                                <option>4</option>
                            </select>
                        </div>

                        <SelectServer
                         path={this.state.path}
                        />

                        {/*<div className="form-group">*/}
                            {/*<select className="form-control">*/}
                                {/*<option>1</option>*/}
                                {/*<option>2</option>*/}
                                {/*<option>3</option>*/}
                                {/*<option>4</option>*/}
                            {/*</select>*/}
                        {/*</div>*/}
                    </div>

                    <div className="overlay-content">
                        <a href="#"> <FontAwesomeIcon icon="tachometer-alt"/> 面板</a>
                        <a href="#"> <FontAwesomeIcon icon="chart-line" /> 分析</a>
                    </div>
                </div>
            </div>
        )
    }
}

export default NavBar;


