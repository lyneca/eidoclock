import React from 'react';
import { getFormattedTime, getNextNightTimes } from './js/clock.js';
import { clearInterval } from 'timers';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            time: getFormattedTime(),
            nights: getNextNightTimes(10)
        };
    }

    tick() {
        this.setState({
            time: getFormattedTime(),
            nights: getNextNightTimes(10)
        });
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    componentDidMount() {
        this.interval = setInterval(
            () => this.tick(),
            500
        );
    }

    render() {
        return (
            <div>
                <Clock time={this.state.time} />
                <NextNights nights={this.state.nights} />
            </div>
        );
    }
}

function Clock(props) {
    return (
        <div className='clock'>
            {props.time}
        </div>
    );
}

function NextNights(props) {
    return (
        <div className='nights-container'>
            <div className='nights-header'>
                Upcoming Nights
            </div>
            <div className='nights'>
                {
                    props.nights.map(
                        (time, index) => (
                            <div key={index} className='night-time'>{time}</div>
                        )
                    )
                }
            </div>
        </div>
    );
}

export default App;