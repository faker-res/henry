import React, {Component} from 'react';
import {Line} from 'react-chartjs-2';

class LineChart extends Component{
    state = {

    }


    render(){
        return (
            <div className="col-12 col-md-6 col-xl-4">
                <Line
                    data = {this.props.data}
                    options = {{
                        title: {
                            display: true,
                            text: this.props.title,
                            fontSize: 25
                        },
                        legend: {
                            position: 'bottom'
                        }

                    }}
                />
            </div>

        )
    }
}

export default LineChart;