import React, { Component } from 'react';
import Login from './components/login';
import './App.css';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faIgloo, faAngleDown, faCheckSquare, faCoffee } from '@fortawesome/free-solid-svg-icons';

library.add(faIgloo, faAngleDown, faCheckSquare, faCoffee)

class App extends Component {
    render() {
        return (
            <div>
                <Login/>
            </div>
        );
    }
}

export default App;