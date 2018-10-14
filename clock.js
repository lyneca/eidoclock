var has_notified = false;
var nice_background = true;
var daynight_cycles = true;
var scaled_layout = false;
var eido_timestamp = 1510884902;
var debug = false;

var interval;

const PRETTY_KEY = "PRETTY_KEY";
const CYCLES_KEY = "CYCLES_KEY";
const SCALED_KEY = "SCALE";
const SCALED_TIME_INTERVAL = 1;
const NO_SCALED_TIME_INTERVAL = 100;
const WARNING_MESSAGE = "Warning: unable to get time. Retrying soon.";

function debugclock(enabled) {
    debug = enabled;
}

function defaultGetTimeCallback(t)
{
    eido_timestamp = t;
    console.log(eido_timestamp);
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
})

$(function() {
    console.log('create future day/night markers');
    var now = new Date();
    calculateIrlDayNightTimes(now);
})

// Register for a custom event
$(document).on("clock-event", function(event, data) {
    console.log("It is now", data.cycle);
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

function calculateIrlDayNightTimes(now) {
    console.log('now', now);
}

function eidoToIrl(eido) {
    var m = (eido.h * 60.0) + (eido.m * 1.0) + (eido.s/60.0);
    return {h:0, m:0, s:0};
}

function irlToEido(irl) {

}

function getCurrentEidoTime(now) {
    var time = now.getTime() / 1000;
    var start_time = (eido_timestamp - 150 * 60);
    var irltime_m = ((time - start_time)/60) % 150;  // 100m of day + 50m of night
    var eidotime_in_h = (irltime_m / 6.25) + 6;
    if (eidotime_in_h < 0) eidotime_in_h += 24;
    if (eidotime_in_h > 24) eidotime_in_h -= 24;
    var eidotime_h = Math.floor(eidotime_in_h);
    var eidotime_m = Math.floor((eidotime_in_h * 60) % 60);
    var eidotime_s = Math.floor((eidotime_in_h * 60 * 60) % 60);
    return { h:eidotime_h, m:eidotime_m, s:eidotime_s };
}

function updateTime() {
    if (debug) {
        console.log('foo');
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
    
    var now = new Date();
    
    var time = now.getTime() / 1000;
    // This time is the end of night and start of day
    var start_time = (eido_timestamp - 150 * 60)
    var irltime_m = ((time - start_time)/60) % 150;  // 100m of day + 50m of night
    var eidotime_in_h = (irltime_m / 6.25) + 6;
    if (eidotime_in_h < 0) eidotime_in_h += 24;
    if (eidotime_in_h > 24) eidotime_in_h -= 24;
    var eidotime_h = Math.floor(eidotime_in_h);
    var eidotime_m = Math.floor((eidotime_in_h * 60) % 60);
    var eidotime_s = Math.floor((eidotime_in_h * 60 * 60) % 60);


    var eidoTime = getCurrentEidoTime(now);
    var irlTime = eidoToIrl(eidoTime);
    

    // wrapped_time is the current eidolon time in hours as percentage of hours
    var wrapped_time = (eidoTime.h - 5) + (eidoTime.m / 60) + (eidoTime.s / 3600);
    if (wrapped_time < 0) wrapped_time += 24;
    var slider_percent = wrapped_time / 24 * 90 + 5
    $('.slider').css('top', slider_percent + '%');

    var next_interval;

    // console.log('irl_m', irltime_m, irlTime.m, eidoTime);

    // Night is from 9pm to 5am
    // Day is from 5am to 9pm
    if (150 - irltime_m > 50) {
        if (!has_played_day) {
            has_played_night = false;
            has_played_day = true;
            if (first_run) {
                first_run = false;
            } else {
                // Emit a custom event when the time changes. Allows lots of things to be wired up to this unique event
                $(document).trigger('clock-event', { cycle: 'day' });
                // TODO: Can now wire this up to the event
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
                $(document).trigger('clock-event', { cycle: 'night' });
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
    $('body').css('background-size', "cover");

    if (eidotime_h == 22) has_notified = false;
    var eido_until_h = next_interval - (eidotime_h % 24);
    if (eido_until_h < 0) eido_until_h += 24
    var eido_until_m = 60 - eidotime_m;
    var eido_until_s = 60 - eidotime_s;

    var irl_until_in_h = ((eido_until_h + eido_until_m / 60 + eido_until_s / 60 / 60) * 6.25) / 60;

    var irl_until_in_m = 150 - irltime_m;

    if (irl_until_in_m > 50) irl_until_in_m -= 50 

    var irl_until_h = Math.floor(irl_until_in_m / 60);
    var irl_until_m = Math.floor(irl_until_in_m % 60);
    var irl_until_s = Math.floor((irl_until_in_m * 60) % 60);

    // var irl_until_h = Math.floor(irl_until_in_h);
    // var irl_until_m = Math.floor((irl_until_in_h * 60) % 60);
    // var irl_until_s = Math.floor((irl_until_in_h * 60 * 60) % 60);
    
    $('.time>.big-hour').text(pad(irl_until_h));
    $('.time>.big-minute').text(pad(irl_until_m));
    $('.time>.big-second').text(pad(irl_until_s));

    $('.eidolon .hour').text(pad(eidotime_h));
    $('.eidolon .minute').text(pad(eidotime_m));
    $('.eidolon .second').text(pad(eidotime_s));

    $('.irl .hour').text(pad(eido_until_h));
    $('.irl .minute').text(pad(eido_until_m));
    $('.irl .second').text(pad(eido_until_s));

    // $('.time>.ampm').text(((eidotime_in_h >= 12) ? ' pm' : ' am'));
}


