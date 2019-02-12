import React, { Component } from 'react';
import Login from './components/login';
import Dashboard from './components/dashboard';
import './App.css';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faAngleDown, faSmile as fasFaSmile, faArrowAltCircleRight, faDollarSign, faUserPlus } from '@fortawesome/free-solid-svg-icons'
import {faSmile as farFaSmile, faMoneyBillAlt, faRegistered, faStopCircle } from '@fortawesome/free-regular-svg-icons'

library.add(faAngleDown, farFaSmile, fasFaSmile, faArrowAltCircleRight, faDollarSign, faMoneyBillAlt, faUserPlus, faRegistered, faStopCircle )

class App extends Component {

    render() {
        return (
            <div>
                <Login/>
                <Dashboard/>

            </div>
        );
    }
}

export default App;