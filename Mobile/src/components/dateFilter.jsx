import React, {Component} from 'react';

class DateFilter extends Component{
    state = {

    }

    render(){
        return (
            <div>

                <form>
                    <input type="datetime-local" name="startTime"/>
                    <input type="datetime-local" name="endTime"/>
                    <input type="date" name="date"/>
                </form>


                <div className="form-group">
                    <select className="form-control">
                        <option>1</option>
                        <option>2</option>
                        <option>3</option>
                        <option>4</option>
                    </select>
                </div>

            </div>
        )
    }
}

export default DateFilter;