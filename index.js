/*const http = require('http');

const server = http.createServer((request, response) => {
    response.writeHead(200, {"Content-Type": "text/plain"});
    response.end("Hello World!");
});

const port = process.env.PORT || 1337;
server.listen(port); */

const http = require('http');

const server = http.createServer((request, response) => {
  fs.readFile('home.html', function(err, data) {
    response.writeHead(200, {"Content-Type": "text/html"});
    response.write(data);
    response.end();
    return res.end();
  }
});

const port = process.env.PORT || 1337;
server.listen(port);

console.log("Server running at http://localhost:%d", port); 

