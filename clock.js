has_notified = false;

document.addEventListener('DOMContentLoaded', function () {
  if (!Notification) {
    alert('Desktop notifications not available in your browser. Try Chromium.'); 
    return;
  }

  if (Notification.permission !== "granted")
    Notification.requestPermission();
});

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

function updateTime() {
	var d = new Date();
	var time = d.getTime() / 1000;
	var start_time = 1508636310;  // Set this to the IRL unix time as soon as water demagnetizes
	var irltime_m = (time - start_time)/60 % 9000;  // 100m of day + 50m of night
	
	var eidotime_in_h = (irltime_m / 6.25) + 6;  // Assuming that 7am is when water demagnetizes
	if (eidotime_in_h < 0) eidotime_in_h += 24;
	if (eidotime_in_h > 24) eidotime_in_h -= 24;
	var eidotime_h = Math.floor(eidotime_in_h);
	var eidotime_m = Math.floor((eidotime_in_h * 60) % 60);
	var eidotime_s = Math.floor((eidotime_in_h * 60 * 60) % 60);

	$('.time>.big-hour').text(pad(eidotime_h));
	$('.time>.big-minute').text(pad(eidotime_m));
	$('.time>.big-second').text(pad(eidotime_s));
	$('.time>.ampm').text(((eidotime_in_h >= 12) ? ' pm' : ' am'));

	var next_interval;

	// Night is from 9pm to 5am
	// Day is from 5am to 9pm
	if (eidotime_in_h >= 5 && eidotime_in_h < 21) {
		// Time is day
		$('body').css('background', "url(day_blur.jpg) no-repeat center center fixed");
		$('.day').addClass('night').removeClass('day');
		$('.night').text('night');
		next_interval = 21;
	} else {
		// Time is night
		$('body').css('background', "url(night_blur.jpg) no-repeat center center fixed");
		$('.night').addClass('day').removeClass('night');
		$('.day').text('day');
		next_interval = 24 + 5;
	}
	$('body').css('background-size', "cover");

	if (eidotime_h == 21 && minute == 30) {
		if (!has_notified) {
			notify("Eidolons are spawning!");
			has_notified = true;
		}
	}
	if (eidotime_h == 22) has_notified = false;

	var eido_until_h = next_interval - eidotime_h;
	var eido_until_m = 60 - eidotime_m;
	var eido_until_s = 60 - eidotime_s;

	var irl_until_in_h = ((eido_until_h + eido_until_m / 60 + eido_until_s / 60 / 60) * 6.25) / 60;
	var irl_until_h = Math.floor(irl_until_in_h);
	var irl_until_m = Math.floor((irl_until_in_h * 60) % 60);
	var irl_until_s = Math.floor((irl_until_in_h * 60 * 60) % 60);
	
	$('.eidolon .hour').text(pad(eido_until_h));
	$('.eidolon .minute').text(pad(eido_until_m));
	$('.eidolon .second').text(pad(eido_until_s));

	$('.irl .hour').text(pad(irl_until_h));
	$('.irl .minute').text(pad(irl_until_m));
	$('.irl .second').text(pad(irl_until_s));
}

setInterval(updateTime, 1);
