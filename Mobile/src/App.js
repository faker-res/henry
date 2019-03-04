import React, { Component } from 'react';
import Login from './components/login';
import Dashboard from './components/dashboard';
import './App.css';
import { library } from '@fortawesome/fontawesome-svg-core';
import {faAngleDown, faSmile as fasFaSmile, faArrowAltCircleRight, faDollarSign, faUserPlus, faBars, faUserCircle, faEllipsisV, faTachometerAlt, faChartLine} from '@fortawesome/free-solid-svg-icons'
import {faSmile as farFaSmile, faMoneyBillAlt, faRegistered, faStopCircle} from '@fortawesome/free-regular-svg-icons'
import {Route, NavLink, HashRouter} from "react-router-dom";

library.add(faAngleDown, farFaSmile, fasFaSmile, faArrowAltCircleRight, faDollarSign, faMoneyBillAlt, faUserPlus, faRegistered, faStopCircle, faBars, faUserCircle, faEllipsisV, faTachometerAlt, faChartLine)

class App extends Component {

    render() {
        return (
            <HashRouter>
                <div>
                    <Route exact path="/" component={Login}/>
                    <Route path="/dashboard" component={Dashboard}/>
                </div>
            </HashRouter>
        );
    }
}

export default App;