const request = require('request');

module.exports = {
    /**
     * Check Is Numric
     * @param {number} n 
     */
    isNumeric: function (n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    hasOwnProperty: function (obj, key) {
        return hasOwnProperty.call(obj, key);
    },
    unshorten: function (uri) {
        let options = {
            url: uri,
            followRedirect: false,
            method: 'GET'
        };
        return new Promise(function (resolve, reject) {
            request.get(options, function (err, resp, body) {
                if (err) {
                    reject(err);
                } else {
                    resolve(resp.headers.location || uri);
                }
            })
        });
    }
};