var test = require("nrtv-test")(require)

test.using(
  "provides a websocket interface in the browser",

  ["./socket", "nrtv-socket-server", "web-element", "nrtv-server", "browser-bridge", "nrtv-browse",],
  function(expect, done, socket, socketServer, element, server, BrowserBridge, browse) {


    socketServer.use(
      function(connection) {
        connection.on("data", haveExpectations)
      }
    )

    var bridge = new BrowserBridge()
    var send = bridge.defineFunction(
      [socket.defineGetOn(bridge)],
      function pontificate(getSocket) {
        getSocket(function(socket) {
          socket.send("you'll never be yourself again")
        })
      }
    )

    bridge.asap(send)

    server.addRoute("get", "/", bridge.sendPage())

    server.start(1104)

    var cleanUp
    var gotMessage = false

    browse("http://localhost:1104", function(browser) {
        cleanUp = function() {
          browser.done()
          server.stop()
          done()
        }
        if (gotMessage) { cleanUp() }
      }
    )

    function haveExpectations(message) {
      expect(message).to.equal("you'll never be yourself again")
      if (cleanUp) { cleanUp }
      else { gotMessage = true }
    }
  }
)
