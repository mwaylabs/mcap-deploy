/*
 * mcap-deploy
 * https://github.com/mwaylabs/mcap-deploy
 *
 * Copyright (c) 2014 mwaylabs
 * Licensed under the MIT license.
 */

'use strict';

var formdata = require('node-formdata');
var path = require('path');
var assert = require('assert');
var ENDPPOINT = 'mway/mystudio/upload';
var fs = require('fs');
var os = require('os');
var q = require('q');
var mcapEasyZip = require('mcap-easy-zip');

var getEndpoint = function (baseUrl) {
    var ret = '';
    if (baseUrl.lastIndexOf('/') !== baseUrl.length - 1) {
        ret += '/';
    }
    return baseUrl + ret + ENDPPOINT;
};

/**
 *
 * @param {Object} options
 * @config {String}   baseurl  mandatory
 * @config {String}   file
 * @config {Object}   fields {
 * @config {Function} progress
 * @config {String}   username
 * @config {String}   password
 * @returns {promise|*|Q.promise|*|exports}
 */
var upload = function (options, request) {
    // the options for the request
    var importOptions = {
        url: getEndpoint(options.baseurl),
        headers: {
            "Accept": "application/json"
        },
        method: 'POST',
        file: options.file,
        fields: options.fields,
        progress: options.progress
    };
    if (options.username && options.password) {
        importOptions.auth = {
            "user": options.username,
            "pass": options.password
        };
    }

    return formdata(importOptions, request);
};

var createZip = function (rootPath) {
    var deferred = q.defer();

    var zipFilePath = path.resolve(os.tmpdir() + '/mcap_app_' + Date.now() + '.zip');

    mcapEasyZip(rootPath, zipFilePath, {}, function (err, files) {
        if (err) {
            deferred.reject(err);
        }
        deferred.resolve(zipFilePath, files);
    });
    return deferred.promise;
};

var deleteZip = function (zipPath) {
    var deferred = q.defer();
    fs.unlink(zipPath, function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(zipPath);
        }
    });
    return deferred.promise;
};

var deploy = function (options, request) {
    assert(options, 'Missing argument: options');
    assert(options.baseurl, 'Missing argument: options.baseurl');
    assert(options.rootPath, 'Missing argument: options.rootPath');

    return createZip(options.rootPath).then(function (zipPath) {
        delete options.rootPath;
        options.file = zipPath;
        return upload(options, request).then(function () {
            deleteZip(zipPath);
            return {
                zipPath: zipPath,
                options: options
            };
        });
    });
};

// API
exports.deploy = deploy;

// API for Tests
exports.getEndpoint = getEndpoint;
exports.ENDPPOINT = ENDPPOINT;
exports.upload = upload;
exports.createZip = createZip;
