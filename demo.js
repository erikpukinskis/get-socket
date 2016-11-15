var http = require("http")
var getSocket = require("./")
var BrowserBridge = require("browser-bridge")

var server = http.createServer(function(request, response) {

  var bridge = new BrowserBridge()

  var listen = bridge.defineFunction(
    [getSocket.defineOn(bridge)],
    function(getSocket) {
      getSocket(function(socket) {
        socket.listen(function(message) {
          console.log("the server told the browser «"+ message+"»")
        })

        socket.send("greetings from the browser!")
      })
    }
  )

  bridge.asap(listen)

  response.writeHead(200)
  response.end(bridge.toHtml())
})

getSocket.handleConnections(
  server,
  function(socket, next) {
    socket.listen(function(message) {
      console.log("a client said «"+ message+"»")
      socket.send("hello from the server!")
    })
  }
)

server.listen(7654)

var socket = getSocket("ws://localhost:7654", function(socket) {

  socket.listen(function(message) {
    console.log("the server told Node «"+ message+"»")
  })

  socket.send("hello from Node!")
})

setTimeout(function() {
  console.log("\nOpen http://localhost:7654 in your browser to complete the demo!\n")
}, 1000)
