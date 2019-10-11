import React, {Component} from 'react';
import {Bar} from 'react-chartjs-2';

class BarChart extends Component{

    render() {
        return (

            <div className="row col-12 col-md-6 col-xl-6">
                <Bar
                    data = {this.props.data}
                    options = {{
                        title: {
                            display: false,
                            text: this.props.title,
                            fontSize: 25
                        },
                        legend: {
                            position:'bottom'
                        }
                    }}
                    height = {400}
                />
            </div>


        )
    }
}

export default BarChart;
