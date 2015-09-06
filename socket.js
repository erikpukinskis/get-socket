var library = require("nrtv-library")(require)

module.exports = library.export(
  "socket",

  [library.collective({echo: undefined}), "sockjs", "nrtv-browser-bridge", "nrtv-server", "http"],
  function(collective, sockjs, BrowserBridge, Server, http) {

    function Socket(identifier) {
      this.identifier = identifier

      echo().on("connection", function(conn) {

        conn.on("data", function(message) {
          console.log("client said:", message)
          conn.write("yo client!")
        })

      })
    }

    var port

    function echo() {
      if (!collective.echo) {

        collective.echo = sockjs.createServer()

        var app = Server.express()

        var server = http.createServer(app);

        collective.echo.installHandlers(server, {prefix: "/echo"})

        Server.overrideStart(function(assignedPort) {
          port = assignedPort
          server.listen(port)
        })
      }

      return collective.echo
    }

    Socket.prototype.publish = function() {}

    function publishFromBrowser(identifier, port) {

      var socket = new WebSocket("ws://"+window.location.host+"/echo/websocket")

      socket.onopen = function (event) {
        socket.send("Here's some text that the server is urgently awaiting!"); 
      }

      socket.onmessage = function (event) {
        console.log("server said", event.data);
      }
    }

    Socket.prototype.publish.defineOnClient = 
      function() {
        return BrowserBridge.defineOnClient( publishFromBrowser).withArgs(this.identifier)
      }

    Socket.prototype.subscribe =
      function() {

      }

    function subscribeInBrowser() {}

    Socket.prototype.subscribe.defineOnClient = BrowserBridge.defineOnClient.bind(BrowserBridge, subscribeInBrowser)

    return function(identifier) {
      return new Socket(identifier)
    }
  }
)