import moment from 'moment';
import axios from 'axios';

var lastSync = 0;
var syncTimeout = 60000;
var expiryTime = 0;

const WORLDSTATE_URL = 'http://content.warframe.com/dynamic/worldState.php';

function pad(n) {
    if (n.toString().length == 1)
        return '0' + n.toString();
    return n
}

function getTimeFromWorldstate() {
    lastSync = moment.now().valueOf();
    axios.get(WORLDSTATE_URL)
        .then(response => {
            var expiryTimeMS = response.data['SyndicateMissions'].find(
                element => (element['Tag'] === 'CetusSyndicate')
            )['Expiry']['$date']['$numberLong'];
            expiryTime = parseInt(expiryTimeMS);
            console.log(expiryTime);
            console.log(moment.now().valueOf());
        })
        .catch(response => console.log(response));
}

// Get the 'cetus syndicate mission expiry time' from Warframe's servers,
//  or from a cached version
function getExpiryTime() {
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

// Return a list of the next n night times
function getNextNightTimes() {
    return [];
}

function getFormattedTime() {
    return msToHMS(getTimeUntilNextEvent());
}

export default getFormattedTime;