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
        mcapDeploy.getEndpoint('http://server.com/').should.equal('http://server.com/' + mcapDeploy.ENDPPOINT);
        mcapDeploy.getEndpoint('http://server.com').should.equal('http://server.com/' + mcapDeploy.ENDPPOINT);
    });

    it('should throw an error: missing options', function () {
        try{
            mcapDeploy.deploy();
        } catch (e){
            e.name.should.equal('AssertionError');
        }

        try{
            mcapDeploy.deploy({});
        } catch (e){
            e.name.should.equal('AssertionError');
        }

    });

    it('should send a request', function (cb) {

        var request = Request.defaults({jar: true});
        sinon.stub(request, 'post', function(options, callback) {
            callback(null, {
                statusCode: 200
            });
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

        mcapDeploy.deploy(options, request).then(function(data){
            assert.equal(fs.existsSync(data.zipPath), false, 'zip not deleted');
            cb();
        });

    });
});


