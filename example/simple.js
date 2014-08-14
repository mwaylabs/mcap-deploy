/*
 * mcap-deploy
 * https://github.com/mwaylabs/mcap-deploy
 *
 * Copyright (c) 2014 mwaylabs
 * Licensed under the MIT license.
 */

'use strict';

var mcapDeploy = require('../');
var path = require('path');
var Request = require('request');

//var request = Request.defaults({jar: true});
//request.post = function(data){
//    console.error(data);
//};

var options = {
    baseurl: '<URL>',
    username: '<USERNAME>',
    password: '<PASSWORD>',
    fields: {
        name: 'TestApp1',
        uuid: '5fc00ddc-292a-4084-8679-fa8a7fadf1db'
    },
    rootPath: path.resolve(__dirname, '../example/apps/MyTestApp'),
    progress: function(percent, chunkSize, totalSize){
        console.log(percent, chunkSize, totalSize);
    }
};
mcapDeploy.deploy(options/*, request*/).then(function(){
    console.log('succ uploaded');
    console.log(arguments);
}, function(){
    console.log('something bad happend');
    console.log(arguments);
});