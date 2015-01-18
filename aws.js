var crypto = require('crypto');

/*
* converts a basic ISO8601 string (YYYYMMDDTHHMMSSZ) to a dateString
* @param basicISOString - e.g. 19750101T123456Z
* @returns String - e.g. 1975-01-01T12:34:56.000Z
*/
function convertBasicISOStringToDateString(basicISOString) {
  var matches = basicISOString.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  return matches[1] + '-' + matches[2] + '-' + matches[3] + 'T' + matches[4] + ':' + matches[5] + ':' + matches[6] + '.000Z';
}

var utils = {
  /*
  * get hmac digest
  * @param key
  * @param data - what to encode
  * @param algorithm [Optional] - dependent on OpenSSL. defaults to 'sha256'
  * @param encoding [Optional] - encoding for digest. defaults to 'base64'
  */
  hmac: function(key, data, algorithm, encoding) {
    if (algorithm == null) {
      algorithm = 'sha256';
    }
    if (encoding == null) {
      encoding = 'base64';
    }
    return crypto.createHmac(algorithm, key).update(data).digest(encoding);
  },

  /*
  * creates Base64 encoded signature to use in REST API requests
  * @param secret - most likely process.env.AWS_SECRET_ACCESS_KEY
  * @param date - YYYYMMDD
  * @param region [Optional] - valid AWS Region. defaults to 'us-east-1'
  * @param service [Optional] - valid AWS Service abbr. defaults to 's3'
  */
  signature: function(secret, date, region, service) {
    var dataToSign, dateKey, dateRegionKey, dateRegionServiceKey;
    if (region == null) {
      region = 'us-east-1';
    }
    if (service == null) {
      service = 's3';
    }
    dateKey = this.hmac('AWS4' + secret, date);
    dateRegionKey = this.hmac(dateKey, region);
    dateRegionServiceKey = this.hmac(dateRegionKey, service);
    return dataToSign = this.hmac(dateRegionServiceKey, 'aws4_request');
  }
};

module.exports = {
  signRequest: function(manifest) {
    var d = new Date(convertBasicISOStringToDateString(manifest['x-amz-date']));

    d.setHours(d.getHours() + 1); // allow upload for next hour

    var YYYYMMDD = manifest['x-amz-date'].split('T')[0],
    signingKey = utils.signature(process.env.AWS_SECRET_ACCESS_KEY, YYYYMMDD),
    strToSign = new Buffer(JSON.stringify({
      expiration: d.toISOString(),
      conditions: [
        { acl: manifest.acl},
        { bucket: manifest.bucket},
        ['content-length-range', 1, 1024 * 1024 * 100], // 100 MB limit
        { key: manifest.key},
        {'x-amz-algorithm': manifest['x-amz-algorithm']},
        {'x-amz-credential': manifest['x-amz-credential']},
        {'x-amz-date': manifest['x-amz-date']}
      ]
    })).toString('base64');

    return utils.hmac(signingKey, strToSign, null, 'hex');
  }
}
