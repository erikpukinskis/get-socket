The interfaces for using WebSockets can vary a lot between Node libraries, socket servers, and the browser. It can be tricky getting both ends to talk to each other.

GetSocket provides a consistent interface you can use everywhere.

Set up a server to listen for socket connections:

    var http = require("http")
    var getSocket = require("get-socket")
    var server = http.createServer()

    getSocket.handleConnections(
      server,
      function(socket, next) {
        socket.listen(function(message) {
          console.log(message)
        })
      }
    )

    server.start(4040)

Then use getSocket to send a message:

    getSocket("ws://localhost:4040",
      function(socket) {
        socket.send("hello, server!")
      }
    )

Or listen for messages from the server:

    getSocket.handleConnections(
      server,
      function(socket, next) {
        socket.listen(function(message) {
          console.log(message)
        })

        socket.send("hello, client!")
      }
    )

Or use browser-bridge to do the same from the browser:

    var http = require("http")
    var getSocket = require("get-socket")
    var BrowserBridge = require("browser-bridge")

    var server = http.createServer(sendPage)

    function sendPage(request, response) {
      var bridge = new BrowserBridge()

      var listen = bridge.defineFunction(
        [getSocket.defineOn(bridge)],
        function(getSocket) {
          getSocket(function(socket) {
            socket.send("greetings from the browser!")

            socket.listen(console.log)
          })
        }
      )

      bridge.asap(listen)

      response.writeHead(200)
      response.end(bridge.toHtml())
    }

Check out [demo.js](demo.js) for the complete example.

!! Also recommended

GetSocket lets you set up generic connection handlers for all incoming connections, but if you want to set up different listeners for different clients in advance, consider [single-use-socket](https://www.npmjs.com/package/single-use-socket).
