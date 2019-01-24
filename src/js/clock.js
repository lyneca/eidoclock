import moment from 'moment';
import request from 'request';

var lastSync = 0;
var syncTimeout = 60000;
var expiryTime = 0;

var worldState = {};

var hasLoaded = false;

const WORLDSTATE_URL = 'http://content.warframe.com/dynamic/worldState.php';
const CORS_URL = 'https://cors-anywhere.herokuapp.com/' + WORLDSTATE_URL;

moment.updateLocale('en', {
    longDateFormat: {
        LT: 'HH:mm A',
        LTS: 'HH:mm:ss A',
        L: 'MM/DD/YYYY',
        l: 'M/D/YYYY',
        LL: 'MMMM Do YYYY',
        ll: 'MMM D YYYY',
        LLL: 'MMMM Do YYYY LT',
        lll: 'MMM D YYYY LT',
        LLLL: 'dddd, MMMM Do YYYY LT',
        llll: 'ddd, MMM D YYYY LT'
    }
});

function pad(n) {
    if (n.toString().length == 1)
        return '0' + n.toString();
    return n;
}

function getWorldState() {
    if (moment.now().valueOf() - lastSync >= syncTimeout) {
        lastSync = moment.now().valueOf();
        request.get(CORS_URL, { json: true }, function (err, res, body) {
            if (err || typeof body == 'string') {
                worldState = window.localStorage.getItem('worldState');
                if (worldState) worldState = JSON.parse(worldState);
            } else {
                worldState = body;
                window.localStorage.setItem('worldState', JSON.stringify(worldState));
            }
            hasLoaded = true;
        });
    }
    return worldState;
}

function getTimeFromWorldState(waitForNew) {
    var expiryTimeMS = worldState['SyndicateMissions'].find(
        element => (element['Tag'] === 'CetusSyndicate')
    )['Expiry']['$date']['$numberLong'];
    if (waitForNew && parseInt(expiryTimeMS) != expiryTime - (150 * 60 * 1000))
        expiryTime = parseInt(expiryTimeMS);
}

// Get the 'cetus syndicate mission expiry time' from Warframe's servers,
//  or from a cached version
function getExpiryTime() {
    if (moment.now().valueOf() >= expiryTime) {
        expiryTime += 150 * 60 * 1000;
        getTimeFromWorldState(true);
    } else if (moment.now().valueOf() - lastSync >= syncTimeout) {
        // Resync from server
        lastSync = moment.now().valueOf();
        getTimeFromWorldState();
    }
    return expiryTime;
}

// Get the time until the next dawn
function getTimeUntilDay() {
    return getExpiryTime() - moment.now().valueOf();
}

// Get the time until the next dawn or dusk
function getTimeUntilNextEvent() {
    var timeUntilDay = getTimeUntilDay();
    if (timeUntilDay > (50 * 60 * 1000))
        return timeUntilDay - (50 * 60 * 1000);

    return timeUntilDay;
}

// Convert a time to HH:MM:SS format for display
function msToHMS(ms) {
    var total_s = ms / 1000;
    var total_m = total_s / 60;
    var h = pad(Math.floor(total_m / 60));
    var m = pad(Math.floor(total_m % 60));
    var s = pad(Math.floor(total_s % 60));
    return h + ':' + m + ':' + s;
}

function getNthNight(n) {
    return getExpiryTime() - (50 * 60 * 1000) + (150 * 60 * 1000) * n;
}

// Return a list of the next n night times
function getNextNightTimes(n) {
    if (!hasLoaded) return [];
    return Array.from({ length: n }, (x, i) => i)
        .map(x => moment(getNthNight(x)).calendar());
}

function isDay(n) {
    if (!hasLoaded) return true;
    var timeUntilDay = getTimeUntilDay();
    if (timeUntilDay > (50 * 60 * 1000))
        return true;
    return false;
}

function getQuarter() {
    if (!hasLoaded) return 4;
    var slice = Math.floor(15 * (getTimeUntilDay() / (150 * 60 * 1000)));
    if (slice <= 4) return 3;
    if (slice <= 7) return 2;
    if (slice <= 13) return 1;
    return 0;
}

function getFormattedTime() {
    if (!hasLoaded) {
        return '--:--:--';
    }
    return msToHMS(getTimeUntilNextEvent());
}

export { getFormattedTime, getNextNightTimes, isDay, getQuarter, getWorldState };