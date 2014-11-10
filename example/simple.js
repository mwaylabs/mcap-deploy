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

//var request = Request.defaults({jar: true});
//request.post = function(data){
//    console.error(data);
//};

var options = {
    baseurl: 'http://localhost:18080',
    username: 'sbuck',
    password: 'sbuck123',
    rootPath: path.resolve(__dirname, '../test/fixtures/MyTestApp/client'),
    progress: function(percent, chunkSize, totalSize){
        console.log(percent, chunkSize, totalSize);
    }
};

mcapDeploy.deploy(options).then(function(){
    console.log('succ uploaded');
    console.log(arguments);
}, function(){
    console.log('something bad happend');
    console.log(arguments);
});
