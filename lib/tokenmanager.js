// Credits for original code to Nils Schneider: https://github.com/Lyve1981/BMW-ConnectedDrive-JSON-Wrapper

var fs = require("fs");
const fetch = require("node-fetch");
const tokenFile = "modules/MMM-BMWConnected/bmwtoken.json";

/**
 * Helper function which generate a random string.
 *
 * @static
 * @param {number} length - The number of symbols to generate.
 * @returns {string} A generated random string.
 * @memberof Bmw
 */
function _randomString(length = 25) {
	const characters = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-._~";
	const charactersLength = characters.length;

	let randomString = "";
	for (let i = 0; i < length; i++) {
		randomString += characters.charAt(Math.floor(Math.random() * charactersLength));
	}
	return randomString;
}

function requestNewToken(_config, _success, _error) {
	// Delete old token file
	if (fs.existsSync(tokenFile)) {
		fs.unlinkSync(tokenFile);
	}

	const client_id = "31c357a0-7a1d-4590-aa99-33b97244d048";
	const client_password = "c0e3393d-70a2-4f6f-9d3c-8530af64d552";
	const code_challenge = _randomString(86);
	const state = _randomString(22);

	fetch(`https://customer.bmwgroup.com/gcdm/oauth/authenticate`, {
		method: "POST",
		body: new URLSearchParams({
			"client_id": client_id,
			"response_type": "code",
			"scope": "openid profile email offline_access smacc vehicle_data perseus dlm svds cesim vsapi remote_services fupo authenticate_user",
			"redirect_uri": "com.bmw.connected://oauth",
			"state": state,
			"nonce": "login_nonce",
			"code_challenge": code_challenge,
			"code_challenge_method": "plain",
			"username": _config.username,
			"password": _config.password,
			"grant_type": "authorization_code"
		}),
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Mobile/15E148 Safari/604.1"
		}
	}).then(res => res.json()).then(result1 => {

			if (!result1.redirect_to) {
				_error(`Missing redirect_to on stage 1`);
			}

			const authorization = new URLSearchParams(result1.redirect_to).get("authorization");
			if (!authorization) {
				_error(`Missing authorization token on stage 1`);
			}
			fetch(`https://customer.bmwgroup.com/gcdm/oauth/authenticate`, {
				method: "POST",
				body: new URLSearchParams({
					"client_id": client_id,
					"response_type": "code",
					"scope": "openid profile email offline_access smacc vehicle_data perseus dlm svds cesim vsapi remote_services fupo authenticate_user",
					"redirect_uri": "com.bmw.connected://oauth",
					"state": state,
					"nonce": "login_nonce",
					"code_challenge": code_challenge,
					"code_challenge_method": "plain",
					"authorization": authorization
				}),
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.3 Mobile/15E148 Safari/604.1",
					"Cookie": `GCDMSSO=${authorization}`
				},
				redirect: "manual"
			}).then(result2 => {
				const location = result2.headers.get("location");
				if (!location) {
					_error(`Missing location on stage 2`);
				}

				const code = new URLSearchParams(location).get("com.bmw.connected://oauth?code");
				if (!code) {
					_error(`Missing code on stage 2`);
				}
				fetch(`https://customer.bmwgroup.com/gcdm/oauth/token`, {
					method: "POST",
					body: new URLSearchParams({
						"code": code,
						"code_verifier": code_challenge,
						"redirect_uri": "com.bmw.connected://oauth",
						"grant_type": "authorization_code"
					}),
					headers: {
						"Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
						"Authorization": "Basic " + Buffer.from(`${client_id}:${client_password}`).toString("base64")
					},
					redirect: "manual"
				}).then(result3 => result3.json()).then(data3 => {
					readTokenData(_config, JSON.stringify(data3), _success, _error);
				});
			});
		}
	).catch(error => _error(JSON.stringify(error)));
}

function readTokenData(_config, _data, _success, _error) {
	var json;

	try {
		json = JSON.parse(_data);
	} catch (err) {
		_error(err);
		return;
	}

	if (typeof (json.error) !== "undefined") {
		_error(json.error + ": " + json.error_description);
		return;
	}

	if (typeof (json.token_type) === "undefined" || typeof (json.access_token) === "undefined") {
		_error("Couldn't find token in response");
		return;
	}

	var tokenType = json.token_type;
	var token = json.access_token;
	// CDP server seems to be picky, so be save and let the token expire two minutes earlier
	var tokenExpiresInSeconds = json.expires_in - 120;
	var expireDate;
	var tokenFileExists = fs.existsSync(tokenFile);
	var now = new Date();

	if (tokenFileExists) {
		var stat = fs.statSync(tokenFile);
		expireDate = new Date(stat.mtime);
	} else {
		expireDate = now;
	}

	var expireTimestamp = expireDate.valueOf() + tokenExpiresInSeconds * 1000;
	var nowTimestamp = now.valueOf();
	var expired = nowTimestamp > expireTimestamp;

	if (expired) {
		console.log("Token expired, requesting a new one");
		requestNewToken(_config, _success, _error);
	} else {
		if (!tokenFileExists) {
			fs.writeFile(tokenFile, _data, function() {
				console.log("New token file has been written to file " + tokenFile);
			});
		}
		_success(token, tokenType);
	}
}

exports.initialize = function(_config, _success, _error) {
	// The token gets cached. We try to read it here. If it is not available,
	// or the parsing fails, we request a new one.
	fs.readFile(tokenFile, "utf8", function(err, data) {
		if (err) {
			console.log("Failed to read file: " + err);
			requestNewToken(_config, _success, _error);
		} else {
			readTokenData(_config, data, _success, function(err) {
				console.log("Failed to use existing token from file, error " + err + ", will request a new one");
				requestNewToken(_config, _success, _error);
			});
		}
	});
};
