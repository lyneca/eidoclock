import React from 'react';
import getFormattedTime from './js/clock.js';
import { clearInterval } from 'timers';

class App extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            time: getFormattedTime()
        };
    }

    tick() {
        this.setState({
            time: getFormattedTime()
        });
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    componentDidMount() {
        this.interval = setInterval(
            () => this.tick(),
            10
        );
    }

    render() {
        return (
            <Clock time={this.state.time} />
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

export default App;