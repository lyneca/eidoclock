var has_notified = false;
var nice_background = true;
var daynight_cycles = true;
var scaled_layout = false;
var eido_timestamp = 1510884902;
var paused = false;

var interval;

const PRETTY_KEY = "PRETTY_KEY";
const CYCLES_KEY = "CYCLES_KEY";
const SCALED_KEY = "SCALE";
const SCALED_TIME_INTERVAL = 10;
const NO_SCALED_TIME_INTERVAL = 100;
const WARNING_MESSAGE = "Warning: unable to get time. Retrying soon.";

function pauseclock(enabled) {
    paused = enabled;
}

function calculateIrlMinutes(eido) {
    var now = new moment();
    var time = now.unix();
    // irlstart_s time is the start time of the day/night cycle that we originally retrieved from the API
    // it is an epoch time (in seconds)
    // TODO: Why not just use the activation time instead of the expiry time from the API?
    var irlstart_s = (eido_timestamp - 150 * 60)
    // irltime_m is how many real minutes we are into the current day/night cycle
    var irltime_m = ((time - irlstart_s)/60) % 150;  // 100m of day + 50m of night
    return irltime_m;
}

function defaultGetTimeCallback(t)
{
    eido_timestamp = t;

    // Calculate the time and fire the event to set our initial day
    // TODO: dont need this?
    // var irltime_m = calculateIrlMinutes(eido_timestamp);
    // $(document).trigger('clock-event', { cycle: 150 - irltime_m > 50 ? 'day' : 'night', minutes: irltime_m});
}

getCetusTime(1, defaultGetTimeCallback);

document.addEventListener('DOMContentLoaded', function () {

  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium.'); 
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();
});

// Configure local storage events and time interval adjustment on simple event.
$(function() {
    if(typeof(Storage) !== "undefined")
    {
        var b = localStorage.getItem(PRETTY_KEY);
        nice_background = b === "false" ? false : true;

        b = localStorage.getItem(CYCLES_KEY);
        daynight_cycles = b === "false" ? false : true;

        b = localStorage.getItem(SCALED_KEY);
        scaled_layout = b === "false" ? false : true;

        $('#background').prop('checked', nice_background);
        $('#cycles').prop('checked', daynight_cycles);
        $('#scale').prop('checked', scaled_layout);
    }

    $('#background').on('click', function(){
        nice_background = $('#background').is(':checked');
        if(typeof(Storage) !== "undefined")
            localStorage.setItem(PRETTY_KEY, nice_background == true ? "true" : "false");
    });

    $('#cycles').on('click', function(){
        daynight_cycles = $('#cycles').is(':checked');
        if(typeof(Storage) !== "undefined")
            localStorage.setItem(CYCLES_KEY, daynight_cycles == true ? "true" : "false");
    });

    $('#scale').on('click', function(){
        scaled_layout = $('#scale').is(':checked');
        if(typeof(Storage) !== "undefined")
            localStorage.setItem(SCALED_KEY, scaled_layout == true ? "true" : "false");

        // Adjust interval rate on a simple layout so the CPU is used less.
        clearInterval(interval);
        interval = setInterval(updateTime, scaled_layout == true ? SCALED_TIME_INTERVAL : NO_SCALED_TIME_INTERVAL);
    });

    interval = setInterval(updateTime, scaled_layout == true ? SCALED_TIME_INTERVAL : NO_SCALED_TIME_INTERVAL);
    $('body').css('background-size', "cover");
})

// Register for a custom event
$(document).on("clock-event", function(event, data) {
    console.log("It is now", data.cycle, data.minutes, data.eido);
    updateNextIrlDayNightTimes(new moment(), data.minutes);
});

var eidolon_sound = new Audio('eidolon.mp3');
var door_sound = new Audio('door.wav');
// eidolon_sound.play()
var has_played_night = false;
var has_played_day = false;
var first_run = true;

function notify(string) {
  if (Notification.permission !== "granted")
    Notification.requestPermission();
  else {
    var notification = new Notification('The Eidoclock', {
      icon: '',
      body: string
    });
  }
}
function pad(s) {
	if (s.toString().length == 1) return '0' + s.toString();
	return s.toString();
}

/**
 * @brief Sets the message that cetus time failed to be gotten and sets timeout to try again.
 * @param {bool} hasIssue True if time failed to be gotten, false otherwise 
 */
function setTimeFailure(hasIssue)
{
    var e = document.getElementById("warning-container");
    if(hasIssue)
    {
        e.innerHTML = WARNING_MESSAGE;
        setTimeout(getCetusTime, 30000, true, defaultGetTimeCallback);
    }
    else
        e.innerHTML = "";
}

// Credit to Wampa842 for this

// The first parameter defines whether the function should fetch the timestamp.
// If it's false or undefined, the function won't fetch anything - it'll instead use a static timestamp.
// On success, the time is passed to the callback function. On any error, the callback will receive the static timestamp and a warning is logged.
function getCetusTime(fetch, callback)
{
	var timestamp = 1522764301;	//Static timestamp to be returned in case of an error. Correct as of 2018-04-03, for PC version 22.17.0.1. Might not be accurate in the future.
	if(!fetch)
	{
		callback(timestamp);
		return;
	}

	var worldStateFileUrl = "http://content.warframe.com/dynamic/worldState.php";

	var worldStateCORSUrl = "https://whatever-origin.herokuapp.com/get?callback=?&url=" + encodeURIComponent(worldStateFileUrl);

	$.ajax(
	{
		url: worldStateCORSUrl,
		dataType: "json",
		mimeType: "application/json",
		success: function(data)
		{
			var worldStateData;
			try
			{
				worldStateData = JSON.parse(data.contents); //The data is returned as a string inside a JSON response and has to be parsed.
			}
			catch(e)
			{
				console.warn("Could not fetch Cetus time (", e.message, "). Using static timestamp. Accuracy not guaranteed.");
                callback(timestamp);
                setTimeFailure(true);
				return;
            }
            var syndicate = worldStateData["SyndicateMissions"].find(element => (element["Tag"] == "CetusSyndicate"));
            if(syndicate == undefined)
            {
                setTimeFailure(true);
                callback(timestamp);
                return;
            }
            setTimeFailure(false);
			timestamp = Math.floor(syndicate["Expiry"]["$date"]["$numberLong"] / 1000);	//The activation time, converted to whole seconds
			console.log("Fetched Cetus time: ", timestamp);
			callback(timestamp);
		},
		failure: function(xhr, status, error)
		{
            console.warn("Cound not fetch Cetus time:", status, error, ". Using static timestamp. Accuracy not guaranteed.");
            setTimeFailure(true);
			callback(timestamp);
		}
	});
}

function updateNextIrlDayNightTimes(now, minutes) {
    var nextNights = calculateNextIrlDayNightTimes(now, minutes);
    // Clear out any existing
    $('.cycles-sidebar>.future-night-start').remove();
    // Add the new ones
    nextNights.forEach(function(element, index, array) {
        var id = 'next-night-' + index;
        $('.cycles-sidebar>.future-night-label').after('<div id="' + id + '" class="future-night-start">' + element.format('MMM DD, h:mm a') + '</div>');
        $('#' + id).css('top', ((index+1)*8+5)  + '%').css('opacity', (100+array.length-index*5)/100);
    });
}

// Given a now and current minutes, calculates the next local times a night starts
function calculateNextIrlDayNightTimes(now, minutes) {
    var nextNights = [];
    var nextNightStart = new moment(now);
    
    // The night starts 100 minutes into a day
    nextNightStart.add(moment.duration(100-minutes, 'minutes'));
    
    // Only include the next night if its in the future. 
    // e.g. if its night time right now, dont include when the current night started
    if (nextNightStart.isAfter())
        nextNights.push(nextNightStart);

    // Now add all of the future nights, 11 day/night cycles will put us approx 24hrs out
    for(var i=nextNights.length; i<11; ++i) {
        nextNightStart = new moment(nextNightStart).add(moment.duration(150, 'minutes'));
        nextNights.push(nextNightStart);
    }

    return nextNights;
}

function updateTime() {
    if (paused) {
        return;
    }
    
	if (scaled_layout) {
		$('.until-container').css('opacity', 1);
	} else {
		$('.until-container').css('opacity', 0);
    }
    
    if (daynight_cycles) {
		$('.cycles-sidebar').css('opacity', 1);
	} else {
		$('.cycles-sidebar').css('opacity', 0);
    }
    
    var irltime_m = calculateIrlMinutes(eido_timestamp);

    var next_interval;
    // Night is from 9pm to 5am, eidotime
    // Day is from 5am to 9pm, eidotime
    if (150 - irltime_m > 50) {
        if (!has_played_day) {
            has_played_night = false;
            has_played_day = true;
            if (first_run) {
                first_run = false;
            } else {
                // Emit a custom event when the time changes. Allows lots of things to be wired up to this unique event
                $(document).trigger('clock-event', { cycle: 'day', minutes: irltime_m, eido: eido_timestamp });
                notify("It is day!");
            }
        }
        // Time is day
        if (nice_background) {
            $('body').css('background', "url(day_blur.jpg) no-repeat center center fixed");
        } else {
            $('body').css('background-image', "none");
            $('body').css('background-color', "black");
        }
        $('.day').addClass('night').removeClass('day');
        $('.night').text('night');
        next_interval = 21;
    } else {
        // Time is night
        if (!has_played_night) {
            has_played_night = true;
            has_played_day = false;
            if (first_run) {
                first_run = false;
            } else {
                // Emit a custom event when the time changes. Allows lots of things to be wired up to this unique event
                $(document).trigger('clock-event', { cycle: 'night', minutes: irltime_m, eido: eido_timestamp });
                notify("It is night!");
                eidolon_sound.play();
            }
        }
        if (nice_background) {
            $('body').css('background', "url(night_blur.jpg) no-repeat center center fixed");
        } else {
            $('body').css('background', "black");
            $('body').css('color', "white");
        }
        $('.night').addClass('day').removeClass('night');
        $('.day').text('day');
        next_interval = 5;
    }

    // update the irl timer
    var irl_until_in_m = 150 - irltime_m;
    if (irl_until_in_m > 50) irl_until_in_m -= 50 
    var irl_until_h = Math.floor(irl_until_in_m / 60);
    var irl_until_m = Math.floor(irl_until_in_m % 60);
    var irl_until_s = Math.floor((irl_until_in_m * 60) % 60);

    $('.time>.big-hour').text(pad(irl_until_h));
    $('.time>.big-minute').text(pad(irl_until_m));
    $('.time>.big-second').text(pad(irl_until_s));

    // update the current eidotime
    var eidotime_in_h = (irltime_m / 6.25) + 6;
    if (eidotime_in_h < 0) eidotime_in_h += 24;
    if (eidotime_in_h > 24) eidotime_in_h -= 24;
    var eidotime_h = Math.floor(eidotime_in_h);
    var eidotime_m = Math.floor((eidotime_in_h * 60) % 60);
    var eidotime_s = Math.floor((eidotime_in_h * 60 * 60) % 60);

    $('.eidolon .hour').text(pad(eidotime_h));
    $('.eidolon .minute').text(pad(eidotime_m));
    $('.eidolon .second').text(pad(eidotime_s));

    // Update the eido time until
    if (eidotime_h == 22) has_notified = false;
    var eido_until_h = next_interval - (eidotime_h % 24);
    if (eido_until_h < 0) eido_until_h += 24
    var eido_until_m = 60 - eidotime_m;
    var eido_until_s = 60 - eidotime_s;

    $('.irl .hour').text(pad(eido_until_h));
    $('.irl .minute').text(pad(eido_until_m));
    $('.irl .second').text(pad(eido_until_s));

    // update the slider along the line
    var wrapped_time = eidotime_in_h - 5;
    if (wrapped_time < 0) wrapped_time += 24;
    var slider_percent = wrapped_time / 24 * 90 + 5
    $('.slider').css('top', slider_percent + '%');

    // $('.time>.ampm').text(((eidotime_in_h >= 12) ? ' pm' : ' am'));
}


