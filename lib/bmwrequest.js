// Credits for original code to Nils Schneider: https://github.com/Lyve1981/BMW-ConnectedDrive-JSON-Wrapper

var https = require("https");

exports.call = function (_host, _path, _postData, _token, _tokenType, _callbackSuccess, _callbackError) {
	var hasToken = typeof (_token) === "string" && _token.length > 0;

	var options = {
		hostname: _host,
		port: '443',
		path: _path,
		method: hasToken ? 'GET' : 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Content-Length': Buffer.byteLength(_postData),
			'x-user-agent': 'android(v1.07_20200330);bmw;1.7.0(11152)',
		}
	};

	if (hasToken) {
		options.headers['Authorization'] = _tokenType + " " + _token;
	}

	const req = https.request(options, function (res) {
		var data = "";

		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function () {
			_callbackSuccess(data, res.headers);
		});
	});

	req.on('error', function (e) {
		_callbackError(e);
	});

	req.write(_postData);
	req.end();
};
