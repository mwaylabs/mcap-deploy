# mcap-deploy 

node.js implementation to deploy an app against the studio API.


## Install

```bash
$ npm install --save mcap-deploy
```

## Usage

```javascript
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
```

## Ignore files

To ignore files just create a `.mcapignore` file inside the root of the deploy folder, like how git ignores files based on a .gitignore file.

**Example:**

```
log.txt
server/node_modules
```

