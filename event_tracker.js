function uuidv4() {
	return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
		(c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
	)
}

function createCORSRequest(method, url) {
	var xhr = new XMLHttpRequest();
	if ("withCredentials" in xhr) {
		xhr.open(method, url, true); // XHR for Chrome/Firefox/Opera/Safari.
	} else if (typeof XDomainRequest != "undefined") {
		xhr = new XDomainRequest(); // XDomainRequest for IE.
		xhr.open(method, url);
	} else {
		xhr = null; // CORS not supported.
	}
	return xhr;
}

function getDeviceType(userAgent) {
	var deviceType = "";
	if( /Mobi|Android/i.test(navigator.userAgent) ) {
		deviceType = "Mobile"
	} else {
		deviceType = "Desktop"
	};
	return deviceType;
}

function sendEvent(eventContext, eventObject, eventObjectId, eventAction, schemaVersion, eventContent) {
	const url = "https://input.data-for.me:1337/events";

	var xhr = createCORSRequest("POST", url);
	if (!xhr) {
		return;
	};

	eventId = uuidv4();

	var deviceId = document.cookie.replace(/(?:(?:^|.*;\s*)devId\s*\=\s*([^;]*).*$)|^.*$/, "$1");
	if (deviceId == "") {
		deviceId = eventId;
		document.cookie = "devId=" + deviceId + "; expires=Fri, 31 Dec 9999 23:59:59 GMT";
	}

	var sessionId = document.cookie.replace(/(?:(?:^|.*;\s*)sesId\s*\=\s*([^;]*).*$)|^.*$/, "$1");
	if (sessionId == "") {
		sessionId = eventId;
	}
	document.cookie = "sesId=" + sessionId + "; max-age=1800"; // 30 minutes

	var currentTimestamp = new Date().toISOString();

	var timezoneOffsetHours = (new Date().getTimezoneOffset() / -60).toString();

	var event = {
		context: eventContext,
		object: eventObject,
		object_id: eventObjectId,
		action: eventAction,
		origin: "BROWSER",
		origin_id: deviceId,
		session_id: sessionId,
		event_id: eventId,
		event_timestamp: currentTimestamp,
		timezone_offset: timezoneOffsetHours,
		schema_version: schemaVersion,
		content_type: "application/json",
		content: eventContent
	};

	if (typeof otherAttributes == "object") {
		eventContent = Object.assign(otherAttributes, eventContent);
	}

	xhr.setRequestHeader(
		"Content-Type", "application/vnd.kafka.json.v1+json"
	);

	xhr.send(JSON.stringify(event));
}

function sendPageEvent(eventContext, eventObject, eventObjectId, eventAction, schemaVersion, additionalContent) {
	var eventContent = {
		url: window.location.href,
		url_protocol: window.location.protocol,
		url_domain_name: window.location.hostname,
		url_port: window.location.port,
		url_path: window.location.pathname,
		url_referral: document.referrer,
		app_user_agent: navigator.userAgent,
		app_language: navigator.language,
		app_platform: navigator.platform,
		device_type: getDeviceType(navigator.userAgent),
		device_screen_width: (window.screen.width * window.devicePixelRatio).toString(),
		device_screen_height: (window.screen.height * window.devicePixelRatio).toString()
	};

	if (typeof additionalContent == "object") {
		eventContent = Object.assign(additionalContent, eventContent);
	}

	sendEvent(eventContext, eventObject, eventObjectId, eventAction, schemaVersion, eventContent);
}

function onPageLoad(e) {
	sendPageEvent("WEBSITE", "PAGE", window.location.href, "VIEW", "v.1");
}

if (window.attachEvent) {
	window.attachEvent("onload", onPageLoad);
} else {
	if (window.onload) {
		var curronload = window.onload;
		var newonload = function(evt) {
			curronload(evt);
			onPageLoad(evt);
		};
		window.onload = newonload;
	} else {
		window.onload = onPageLoad;
	}
}
