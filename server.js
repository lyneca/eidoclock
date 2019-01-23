var static = require('node-static');
 
var fileServer = new static.Server('./build');

console.log(process.env.PORT);
 
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        fileServer.serve(request, response);
    }).resume();
}).listen(process.env.PORT);