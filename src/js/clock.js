import moment from 'moment';
import axios from 'axios';

var lastSync = 0;
var syncTimeout = 60000;
var expiryTime = 0;

var hasLoaded = false;

const WORLDSTATE_URL = 'http://content.warframe.com/dynamic/worldState.php';
const CORS_URL = 'https://api.allorigins.ml/get?callback=?&url=' + encodeURIComponent(WORLDSTATE_URL);

moment.updateLocale('en', {
    longDateFormat : {
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

function getTimeFromWorldstate() {
    lastSync = moment.now().valueOf();
    axios.get(CORS_URL)
        .then(response => {
            var expiryTimeMS = response.data['SyndicateMissions'].find(
                element => (element['Tag'] === 'CetusSyndicate')
            )['Expiry']['$date']['$numberLong'];
            expiryTime = parseInt(expiryTimeMS);
            hasLoaded = true;
        });
}

// Get the 'cetus syndicate mission expiry time' from Warframe's servers,
//  or from a cached version
function getExpiryTime() {
    if (moment.now() >= expiryTime) {
        expiryTime += 150 * 60 * 1000;
        getTimeFromWorldstate();
    }
    if (moment.now().valueOf() - lastSync >= syncTimeout) {
        // Resync from server
        getTimeFromWorldstate();
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
    return Array.from({length: n}, (x, i) => i)
        .map(x => moment(getNthNight(x)).calendar());
}

function getFormattedTime() {
    if (!hasLoaded) {
        getTimeUntilNextEvent();
        return '--:--:--';
    }
    return msToHMS(getTimeUntilNextEvent());
}

export { getFormattedTime, getNextNightTimes };