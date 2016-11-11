var test = require("nrtv-test")(require)


test.using(
  "server receives data",
  ["./", "ws", "nrtv-server", "querystring"],
  function(expect, done, getSocket, WebSocket, Server, querystring) {

    var server = new Server()

    getSocket.handleConnections(
      server,
      function(socket, next) {
        var params = querystring.parse(socket.url.split("?")[1])

        var wantIt = params.__nrtvSingleUseSocketIdentifier == "102dk102ke2"

        if (wantIt) {
          socket.listen(expectSingle)
        } else {
          next()
        }
      }
    )

    server.start(8000)

    var ws = new WebSocket('ws://localhost:8000/echo/websocket?__nrtvSingleUseSocketIdentifier=102dk102ke2')

    ws.on("open", function() {
      ws.send("barf")
    })

    function expectSingle(data) {
      expect(data).to.equal("barf")
      done()
      server.stop()
    }

  }
)




test.using(
  "server sends data",
  ["./", "ws", "nrtv-server"],
  function(expect, done, getSocket, WebSocket, Server) {

    var server = new Server()

    getSocket.handleConnections(
      server,
      function(socket) {
        socket.send("i love you")
      }
    )

    server.start(8001)

    var ws = new WebSocket('ws://localhost:8001/echo/websocket')

    ws.on("open", function() {
      console.log("test opened")
    })

    ws.on("message", function(data) {
      expect(data).to.equal("i love you")
      server.stop()
      done()
    })

  }
)




test.using(
  "detecting socket close",
  ["./", "ws", "nrtv-server", "sinon"],
  function(expect, done, getSocket, WebSocket, Server, sinon) {

    var server = new Server()

    var record = sinon.spy()

    getSocket.handleConnections(
      server,
      function(socket) {
        socket.listen(record)
        socket.onClose(close)
      }
    )

    server.start(8002)

    var ws = new WebSocket('ws://localhost:8002/echo/websocket')

    ws.on("open", function() {
      ws.send("hi")
      ws.close()
    })

    function close() {
      expect(record).to.have.been.called
      server.stop()
      done()
    }

  }
)



test.using(
  "sending in the browser",

  ["./", "web-element", "nrtv-server", "browser-bridge", "nrtv-browse",],
  function(expect, done, getSocket, element, Server, BrowserBridge, browse) {

    var server = new Server()

    getSocket.handleConnections(
      server,
      function(socket) {
        socket.listen(haveExpectations)
      }
    )

    var bridge = new BrowserBridge()

    var send = bridge.defineFunction(
      [getSocket.defineOn(bridge)],
      function pontificate(getSocket) {
        getSocket(function(socket) {
          socket.send("you'll never be yourself again")
        })
      }
    )

    bridge.asap(send)

    server.addRoute("get", "/", bridge.sendPage())

    server.start(8003)

    var cleanUp
    var gotMessage = false

    var browser = browse(
      "http://localhost:8003",
      function(browser) {
        console.log("NOW BROWSER")
        cleanUp = function() {
          browser.done()
          server.stop()
          done()
        }

        if (gotMessage) {
          cleanUp()
        }
      }
    )

    function haveExpectations(message) {
      expect(message).to.equal("you'll never be yourself again")
      if (cleanUp) {
        console.log("ALREADY CLEANING!")
        cleanUp()
      } else {
        console.log("WAITING FOR BROWSER TO BE THERE")
        gotMessage = true
      }
    }
  }
)
