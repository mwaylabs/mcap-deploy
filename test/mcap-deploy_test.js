'use strict';

var mcapDeploy = require('../lib/mcap-deploy.js');
var assert = require('should');
var Request = require('request');
var path = require('path');
var sinon = require('sinon');
var fs = require('fs');

var rootPath = path.resolve(__dirname, '../example/');

var getCurrentAuthentication = function (callback) {
    var body = JSON.stringify({
        "user": {},
        "organization": {
            "name": "mway",
            "uuid": "df211e58-17ea-4223-8d34-dbbc4b5b76c0",
            "uniqueName": "mway"
        },
        "roles": []
    });
    callback(null, {
        statusCode: 200,
        body: body
    }, body);
};

var getCurrentAuthenticationFail = function (callback) {
    var body = JSON.stringify({
        "user": null,
        "organization": null,
        "roles": null
    });
    callback(null, {
        statusCode: 200,
        body: body
    }, body);
};

var getOrganization = function (callback, roles) {
    var body = JSON.stringify({
        "uuid": "26450af7-4e14-4c23-8f3f-07084efc5740",
        "aclEntries": [
            "user.authenticated:r"
        ],
        "name": "system",
        "uniqueName": "system",
        "address": {},
        "billingSettings": {
            "billingAddress": {},
            "billingPerson": {},
            "currency": "EUR"
        },
        "technicalPerson": {},
        "defaultRoles": roles || [],
        "version": 1,
        "effectivePermissions": "*"
    });
    callback(null, {
        statusCode: 200,
        body: body
    }, body);
};

describe('Deploy', function () {

    it('should be valid url', function () {
        mcapDeploy.getEndpoint('http://server.com/', mcapDeploy.ENDPPOINT).should.equal('http://server.com/' + mcapDeploy.ENDPPOINT);
        mcapDeploy.getEndpoint('http://server.com', mcapDeploy.ENDPPOINT).should.equal('http://server.com/' + mcapDeploy.ENDPPOINT);
    });

    it('should throw an error: missing options', function () {
        try {
            mcapDeploy.deploy();
        } catch (e) {
            e.name.should.equal('AssertionError');
        }

        try {
            mcapDeploy.deploy({});
        } catch (e) {
            e.name.should.equal('AssertionError');
        }

    });

    it('not permitted', function (cb) {
        var request = Request.defaults({jar: true});

        sinon.stub(request, 'get', function (url, options, callback) {
            if (url.match(/currentAuthorization/)) {
                return getCurrentAuthentication(callback);
            } else if (url.match(/security\/rest\/organizations/)) {
                return getOrganization(callback, []);
            }
        });

        var options = {
            baseurl: 'http://localhost:3030/',
            password: 'pass',
            username: 'user',
            fields: {
                name: 'TestApp1',
                uuid: '5fc00ddc-292a-4084-8679-fa8a7fadf1db'
            },
            rootPath: path.resolve(__dirname, '../example/')
        };

        mcapDeploy.deploy(options, request).then(function (data) {
        }, function (err) {
            assert.equal(err, 'Organization has no defaultRoles. This will cause problems creating applications. Operation not permitted.');
            cb();
        });

    });


    it('should send a request', function (cb) {

        var request = Request.defaults({jar: true});
        sinon.stub(request, 'post', function (options, callback) {
            callback(null, {
                statusCode: 200
            }, null, null);
        });

        sinon.stub(request, 'get', function (url, options, callback) {
            if (url.match(/currentAuthorization/)) {
                return getCurrentAuthentication(callback);
            } else if (url.match(/security\/rest\/organizations/)) {
                return getOrganization(callback, ['5e88474e-5d14-447c-8834-f09c336b2cbd']);
            }
        });


        var options = {
            baseurl: 'http://localhost:3030/',
            password: 'pass',
            username: 'user',
            fields: {
                name: 'TestApp1',
                uuid: '5fc00ddc-292a-4084-8679-fa8a7fadf1db'
            },
            rootPath: path.resolve(__dirname, '../example/')
        };

        mcapDeploy.deploy(options, request).then(function (data) {
            assert.equal(fs.existsSync(data.zipPath), false, 'zip not deleted');
            assert.equal(data.endpoint, 'http://localhost:3030/mway', 'wrong response');
            cb();
        });

    });


    it('should send a request to the given endpoint', function (cb) {

        var request = Request.defaults({jar: true});
        var endpoint = '/my/awesome/endpoint';
        var baseurl = 'http://localhost:3030/';
        sinon.stub(request, 'post', function (options, callback) {
            var expect = baseurl + 'mway' + endpoint;
            console.error(options.url);
            console.error(expect);
            assert.equal(options.url, expect, 'zip not deleted');
            cb();
        });

        var options = {
            baseurl: baseurl,
            password: 'pass',
            username: 'user',
            endpoint: endpoint,
            fields: {
                name: 'TestApp1',
                uuid: '5fc00ddc-292a-4084-8679-fa8a7fadf1db'
            },
            rootPath: path.resolve(__dirname, '../example/')
        };

        mcapDeploy.upload(options, request);

    });

    it('should send a request to the given endpoint and add a /', function (cb) {

        var request = Request.defaults({jar: true});
        var endpoint = 'my/awesome/endpoint';
        var baseurl = 'http://localhost:3030/';
        sinon.stub(request, 'post', function (options, callback) {
            var expect = baseurl + 'mway' + endpoint;
            assert.equal(options.url, baseurl + 'mway/' + endpoint, 'zip not deleted');
            cb();
        });

        var options = {
            baseurl: baseurl,
            password: 'pass',
            username: 'user',
            endpoint: endpoint,
            fields: {
                name: 'TestApp1',
                uuid: '5fc00ddc-292a-4084-8679-fa8a7fadf1db'
            },
            rootPath: path.resolve(__dirname, '../example/')
        };

        mcapDeploy.upload(options, request);

    });

    it('authentication failed', function (cb) {
        var request = Request.defaults({jar: true});

        sinon.stub(request, 'get', function (url, options, callback) {
            if (url.match(/currentAuthorization/)) {
                return getCurrentAuthenticationFail(callback);
            } else if (url.match(/security\/rest\/organizations/)) {
                return getOrganization(callback, []);
            }
        });

        var options = {
            baseurl: 'http://localhost:3030/',
            password: 'pass',
            username: 'user',
            fields: {
                name: 'TestApp1',
                uuid: '5fc00ddc-292a-4084-8679-fa8a7fadf1db'
            },
            rootPath: path.resolve(__dirname, '../example/')
        };

        mcapDeploy.deploy(options, request).then(function (data) {
        }, function (err) {
            assert.equal(err.message, 'Authentication failed');
            cb();
        });
    });

    it('getGlobPattern', function () {
        assert.deepEqual(mcapDeploy.getGlobPattern(), ['**/*']);
        var globule = require('globule');
        var rootPath =  path.resolve(__dirname, 'apps/MyTestApp');
        var pattern = mcapDeploy.getGlobPattern(rootPath);
        assert.deepEqual(pattern, [ '**/*', '!ignore.txt', '!**/**/ignore.txt', '!**/**/ignore' ]);
        var files = globule.find(pattern, {cwd: rootPath});
        assert.deepEqual(files, [ 'mcap.json', 'server' ]);
    });

});


