import React, {Component} from 'react';
import {Line} from 'react-chartjs-2';
import $ from "jquery";

class LineChart extends Component{
    state = {

    }


        render(){
        return (
            <div className="row">
                <div className="col offset-md-3 col-md-6">
                    <Line
                        data= {this.props.data}
                        options={{
                            title:{
                                display:true,
                                text: this.props.title,
                                fontSize:25
                            },
                            legend:{
                                position:'bottom'
                            }

                        }}
                    />
                </div>
            </div>

        )
    }
}

export default LineChart;