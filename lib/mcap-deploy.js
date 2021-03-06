/*
 * mcap-deploy
 * https://github.com/mwaylabs/mcap-deploy
 *
 * Copyright (c) 2014 mwaylabs
 * Licensed under the MIT license.
 */

'use strict';

var assert = require('assert');
var log = require('mcap-log');
var _ = require('lodash');
var ApplicationValidation = require('mcap-application-validation');
var os = require('os');
var path = require('path');
var formdata = require('node-formdata');
var ignore = require('fstream-ignore');
var request = require('request');
var archiver = require('archiver');
var VError = require('verror');

var ENDPPOINT = '/studio/upload';
var fs = require('fs');
var os = require('os');
var q = require('q');

var IGNORE_FILES = [".mcapignore", ".gitignore"];

function _request( params, customRequest ) {
    params = params || {};
    var deferred = q.defer();

    var defaults = {
        method: 'GET',
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json"
        },
        json: true
    };

    _.defaults(params, defaults);

    log.debug('[' + params.method + '] ' + params.url);
    log.debug(params);

    var req = customRequest || request;
    req(params, function( err, response, body ) {
        if ( err ) {
            return deferred.reject(new VError(err, 'Connection to %s failed', params.url));
        }
        var statusCode = parseInt(response.statusCode, 10);
        log.debug('_request response with statusCode %s and response', statusCode, body);

        if ( statusCode >= 400) {
            log.debug('_request reject');
            return deferred.reject(body, response);
        }
        deferred.resolve(body, response);
    });
    return deferred.promise;
}

function _validateProject(projectPath) {
  var deferred = q.defer();

  var validation = new ApplicationValidation();
  validation.run(projectPath, function(err) {
    if (err) {
      return deferred.reject(err);
    }
    deferred.resolve();
  });

  return deferred.promise;
}

var getEndpoint = function (baseUrl, endpoint) {
    var ret = '';
    if (baseUrl.lastIndexOf('/') !== baseUrl.length - 1) {
        ret += '/';
    }
    return baseUrl + ret + endpoint;
};

/**
 * Get the current authentication to get the group of the user.
 */
var currentAuthentication = function (options, customRequest) {

    var params = {
      method: 'GET',
      url: options.baseurl + 'gofer/system/security/currentAuthorization',
      auth: {
          user: options.username,
          pass: options.password
      }
    };

    return _request(params, customRequest).then(function(data) {
      if (data && data.organization && data.organization.uniqueName) {
          return data;
      }

      var deferred = q.defer();
      deferred.reject(new Error('Authentication failed'));
      return deferred.promise;
    });
};

/**
 * Get the organisation and test if it has defaultRoles. If not raise an error. If an application is generated by a user in a group that has no defaultRoles the application
 * doesn't work as expected.
 */
var getOrganization = function (orga, options, customRequest) {
    assert(orga, 'Missing first parameter orga');
    assert(orga.uuid, 'Missing uuid for organization');

    var params = {
      method: 'GET',
      url: options.baseurl + 'gofer/security/rest/organizations/' + orga.uuid,
      auth: {
          user: options.username,
          pass: options.password
      }
    };

    return _request(params, customRequest).then(function(data) {
      if (data && Array.isArray(data.defaultRoles) && data.defaultRoles.length > 0) {
          return data;
      }

      var deferred = q.defer();
      deferred.reject('Organization has no defaultRoles. This will cause problems creating applications. Operation not permitted.');
      return deferred.promise;
    });
};

/**
 *
 * @param {Object} options
 * @param {Object} request
 * @param {String} organization unique name
 * @config {String}   baseurl  mandatory
 * @config {String}   file
 * @config {Object}   fields {
 * @config {Function} progress
 * @config {String}   username
 * @config {String}   password
 * @config {String}   endpoint
 * @returns {promise|*|Q.promise|*|exports}
 */
var upload = function (options, request, organization) {
    // the options for the request
    var endpoint = options.endpoint || ENDPPOINT;
    // add an beginning slash to the endpoint if there is none
    if (endpoint[0] !== '/') {
        endpoint = '/' + endpoint;
    }
    var importOptions = {
        url: getEndpoint(options.baseurl, organization + endpoint),
        headers: {
            "Accept": "text/plain"
        },
        method: 'POST',
        file: options.file,
        fields: options.fields,
        progress: options.progress,
		configure: options.configure
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

    var archive = archiver('zip');
    var zipFilePath = path.resolve(os.tmpdir() + '/mcap_app_' + Date.now() + '.zip');
    var output = fs.createWriteStream(zipFilePath);

    ignore({ path: rootPath, ignoreFiles: IGNORE_FILES})
    .on('child', function (c) {
        var name = c.path.substr(c.root.path.length + 1);
        log.debug('Add file to zip %s', name);
        if (c.type === 'File') {
            archive.append(c, { name: name});
        } else if (c.type === 'Directory') {
            archive.append(null, { name: name + '/'});
        }

    }).on('end', function() {
        archive.finalize();
    });

    output.on('finish', function() {
      log.debug('Zip created at %s', zipFilePath);
      deferred.resolve(zipFilePath);
    });

    archive.pipe(output);

    return deferred.promise;
};

var deleteZip = function (zipPath) {
  log.debug('Delete zip file' + zipPath);
  var deferred = q.defer();
  fs.unlink(zipPath, function(err) {
    if (err) {
      return deferred.reject(err);
    }
    deferred.resolve();
  });
  return deferred.promise;
};

var getProjectData = function(rootPath, options) {
  var deferred = q.defer();

  var filePath = path.resolve(rootPath, 'mcap.json');
  fs.readFile(filePath, function(err, content) {
    if (err) {
      return deferred.reject(err);
    }
    try {
      var pkg = JSON.parse(content);
      options.fields = {
        name: pkg.name,
        uuid: pkg.uuid
      };
      options.baseAlias = pkg.baseAlias;
      deferred.resolve();
    } catch (err) {
      deferred.reject(err);
    }
  });

  return deferred.promise;
};

var deploy = function (options, request) {
    assert(options, 'Missing argument: options');
    assert(options.baseurl, 'Missing argument: options.baseurl');
    assert(options.rootPath, 'Missing argument: options.rootPath');

    var rootPath = options.rootPath;
    var organization;

    delete options.rootPath;

    if (options.baseurl.slice(-1) !== '/') {
        options.baseurl += '/';
    }
    return _validateProject(rootPath)
      .then(function() {
        return currentAuthentication(options, request);
      })
      .then(function(data) {
        organization = data.organization.uniqueName;
        return getOrganization(data.organization, options, request);
      })
      .then(function() {
        return getProjectData(rootPath, options);
      })
      .then(function() {
        return createZip(rootPath);
      })
      .then(function(zipPath) {
        options.file = zipPath;
		options.configure = function(r) {
			// redirect response stream to console,
			// could use on-data handler with chalk for highlighting...
			r.pipe(process.stdout, { 'end': false });
		};
        return upload(options, request, organization);
      })
      .then(function() {
        return deleteZip(options.file).then(function() {
          var result = options.baseurl + organization + options.baseAlias;
          if (result.slice(-1) !== '/') {
              result += '/';
          }
          return result;
        });
      }).catch(function(err) {
        var deferred = q.defer();
        if (err.body === '') {
          if (err.statusCode === 401) {
            err.body = 'Access denied.';
          } else {
            err.body = 'There is no body for statusCode ' + err.statusCode + ' set.';
          }
        }

        // VError does not allow access to the original error.
        // Therefore we could not use VErrors for our custom errors
        if (err.name !== 'LintError' || err.name !== 'ValidateError') {
          new VError('Upload failed: %s', err.body || err);
        }
        deferred.reject(err);
        return deferred.promise;
      });
};

// API
exports.deploy = deploy;

// API for Tests
exports.getEndpoint = getEndpoint;
exports.ENDPPOINT = ENDPPOINT;
exports.upload = upload;
exports.createZip = createZip;
exports.deleteZip = deleteZip;
