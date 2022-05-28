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
			'x-user-agent': 'android(SP1A.210812.016.C1);bmw;2.5.2(14945);row',
		}
	};

	if (hasToken) {
		console.log("has token "+_tokenType)
		options.headers['Authorization'] = _tokenType + " " + _token;
	}

	const req = https.request(options, function (res) {
		var data = "";

		res.setEncoding('utf8');
		res.on('data', function (chunk) {
			data += chunk;
		});

		res.on('end', function () {
			console.log("end"+JSON.stringify(res.statusMessage))
			_callbackSuccess(data, res.headers);
		});
	});

	req.on('error', function (e) {
		console.log("ERRROR"+e)
		_callbackError(e);
	});

	req.write(_postData);
	req.end();
};
