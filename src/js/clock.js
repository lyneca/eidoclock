import moment from 'moment';
import request from 'request';

var lastSync = 0;
var syncTimeout = 60000;
var displayExpiryTime = 0;
var expiryTime = 0;

var hasLoaded = false;
var syncing = false;

/* eslint-disable no-console */

console.info('Clock of Eidolon v2.4.0');

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

function syncTimeFromFirebase() {
    if (syncing) return;
    if (moment.now().valueOf() - lastSync >= syncTimeout || !expiryTime) {
        syncing = true;
        lastSync = moment.now().valueOf();
        request.get('https://us-central1-eidoclock.cloudfunctions.net/getTime', { json: true }, function (err, res, body) {
            if (err) console.error(err);
            if (expiryTime != body.expiryDate) {
                expiryTime = body.expiryDate;
                window.localStorage.setItem('expiryTime', expiryTime);
                hasLoaded = true;
            }
            syncing = false;
        });
    }
}

// Get the 'cetus syndicate mission expiry time' from Warframe's servers,
//  or from a cached version
function getExpiryTime() {
    syncTimeFromFirebase();
    if (moment.now().valueOf() >= expiryTime) {
        displayExpiryTime = expiryTime + 150 * 60 * 1000;
    } else {
        displayExpiryTime = expiryTime;
    }
    return displayExpiryTime;
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

function isDay() {
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
        syncTimeFromFirebase();
        return '--:--:--';
    }
    return msToHMS(getTimeUntilNextEvent());
}

export { getFormattedTime, getNextNightTimes, isDay, getQuarter };