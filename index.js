'use strict';

var http = require('http'),
fs = require('fs'),
aws = require('./aws');

http.createServer(function(req, res) {
  // AJAX call to sign policy
  if (req.url === '/sign') {
    var data = '';
    req.on('data', function(chunk) {
      data += chunk;
    });

    req.on('end', function() {
      var resp = JSON.stringify({
        policy: new Buffer(data).toString('base64'),
        signature: aws.signRequest(JSON.parse(data))
      });

      res.writeHead(200, {
        'Content-Length': resp.length,
        'Content-Type': 'application/json; charset=utf-8'
      });
      res.end(resp);
    });

  } else {
    fs.createReadStream('upload.html').pipe(res);
  }
}).listen(process.env.PORT || 8000);
