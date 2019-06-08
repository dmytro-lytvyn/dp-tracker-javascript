// Use obfuscator.io to compress and obfuscate the code, add onLinkClick and onButtonClick to Reserved Names

// Simple UUID generator, from https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
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

// Main event sending function, generates or obtains existing cookies
function sendEvent(subjectId, subjectType, subjectAttributes, actionType, actionAttributes) {
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

	var actionAttributesMerged = {
		session_id: sessionId,
		action_timestamp: currentTimestamp,
		timezone_offset: timezoneOffsetHours
	};

	if (typeof actionAttributes == "object") {
		actionAttributesMerged = Object.assign(actionAttributes, actionAttributesMerged);
	}

	var event = {
		event_id: eventId,
		event_timestamp: currentTimestamp,
		origin: {
			id: deviceId,
			type: "website_browser"
		},
		actor: { // Can be replaced with a logged in user info if available
			id: deviceId,
			type: "website_visitor"
		},
		subject: {
			id: subjectId,
			type: subjectType,
			attributes: subjectAttributes
		},
		action: {
			type: actionType,
			attributes: actionAttributesMerged
		}
	};

	xhr.setRequestHeader(
		"Content-Type", "application/vnd.kafka.json.v1+json"
	);

	xhr.send(JSON.stringify(event));
}

// Generic page event wrapper, adds default page action attributes to the event
function sendPageEvent(subjectId, subjectType, subjectAttributes, actionType, actionAttributes) {
	var actionAttributesMerged = {
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

	if (typeof actionAttributes == "object") {
		actionAttributesMerged = Object.assign(actionAttributes, actionAttributesMerged);
	}

	sendEvent(subjectId, subjectType, subjectAttributes, actionType, actionAttributesMerged);
}

// Wrappers for specific types of page events
function onLinkClick(linkId) {
	sendPageEvent(linkId, "website_link", undefined, "click", undefined);
}

function onButtonClick(buttonId) {
	sendPageEvent(buttonId, "website_button", undefined, "click", undefined);
}

function onPageLoad(e) {
	sendPageEvent(window.location.href, "website_page", undefined, "view", undefined);
}

// Assigning onPageLoad function, trying not to replace any existing functions
if (window.attachEvent) {
	window.attachEvent("onload", onPageLoad);
} else {
	if (window.onload) {
		var currentOnLoad = window.onload;
		var newOnLoad = function(evt) {
			currentOnLoad(evt);
			onPageLoad(evt);
		};
		window.onload = newOnLoad;
	} else {
		window.onload = onPageLoad;
	}
}
