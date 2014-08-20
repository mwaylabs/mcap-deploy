'use strict';

var mcapDeploy = require('../lib/mcap-deploy.js');
var assert = require('should');
var Request = require('request');
var path = require('path');
var sinon = require('sinon');
var fs = require('fs');

var rootPath = path.resolve(__dirname, '../example/');


describe('getEndpoint', function () {

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

    it('should send a request', function (cb) {

        var request = Request.defaults({jar: true});
        sinon.stub(request, 'post', function (options, callback) {
            callback(null, {
                statusCode: 200
            });
        });

        sinon.stub(request, 'get', function (url, options, callback) {
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
            cb();
        });

    });
});


