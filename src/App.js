import React from 'react';
import { getFormattedTime, getNextNightTimes, getQuarter, isDay, getWorldState } from './js/clock.js';
import { clearInterval } from 'timers';
import morning from './img/morning.png';
import day from './img/day.png';
import evening from './img/evening.png';
import night from './img/night.png';
import black from './img/black.png';
import icon_192 from './img/icon_192.png';
import icon_512 from './img/icon_512.png';

class App extends React.Component {
    constructor(props) {
        super(props);
        getWorldState();
        this.backgrounds = [
            morning,
            day,
            evening,
            night,
            black
        ];
        this.state = {
            time: getFormattedTime(),
            nights: getNextNightTimes(10)
        };
    }

    tick() {
        this.setState({
            time: getFormattedTime(),
            nights: getNextNightTimes(10),
            background: {
                backgroundImage: 'url(' + this.backgrounds[getQuarter()] + ')'
            },
            day_night: isDay() ? 'night' : 'day'
        });
    }

    updateWorldState() {
        getWorldState();
    }

    componentWillUnmount() {
        clearInterval(this.tickInterval);
        clearInterval(this.worldStateInterval);
    }

    componentDidMount() {
        this.tickInterval = setInterval(
            () => this.tick(),
            500
        );
        this.worldStateInterval = setInterval(
            () => this.updateWorldState(),
            60 * 1000
        );
    }

    render() {
        return (
            <div className='container' style={this.state.background}>
                <Clock time={this.state.time} day_night={this.state.day_night} />
                <NextNights nights={this.state.nights} />
                <About />
            </div>
        );
    }
}

function Clock(props) {
    return (
        <div className='clock'>
            <div className='clock-header'>Time until {props.day_night}</div>
            {props.time}
        </div>
    );
}

function NextNights(props) {
    var opacities = props.nights.map((_, index) => {return {opacity: 0.5 * ((10-index)/10) + 0.5};});

    return (
        <div className='nights-container'>
            <div className='nights-header'>
                Upcoming Nights
            </div>
            <div className='nights'>
                {
                    props.nights.map(
                        (time, index) => (
                            // <div key={index} className='night-time' style={opacities[index]}>{time}</div>
                            <div key={index} className='night-time'>{time}</div>
                        )
                    )
                }
            </div>
        </div>
    );
}

function About(props) {
    return (
        <div className="about">
            Made by <a href="https://reddit.com/u/lyneca">/u/lyneca</a> and <a href="https://github.com/lyneca/eidoclock/graphs/contributors">others</a><br/>
            Hosted on <a href="https://github.com/lyneca/eidoclock">GitHub</a><br/>
        </div>
    );
}

export default App;