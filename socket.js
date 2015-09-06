var library = require("nrtv-library")(require)

module.exports = library.export(
  "socket",

  [library.collective({socket: undefined}), "sockjs", "nrtv-browser-bridge", "nrtv-server", "http"],
  function(collective, sockjs, BrowserBridge, Server, http) {


    /*  Socket Server */

    function SocketServer() {
      this.socket = sockjs.createServer()

      var subscriptions = this.subscriptions = {}

      var app = Server.express()

      var server = http.createServer(app);

      this.socket.installHandlers(server, {prefix: "/echo"})

      Server.overrideStart(function(port) {
        server.listen(port)
      })

      var socketServer = this

      this.socket.on("connection", function(conn) {

        socketServer.conn = conn

        conn.on("data", handleData)

        function handleData(message) {
          message = JSON.parse(message)

          var callbacks = subscriptions[message.topic] || []

          callbacks.forEach(function(callback) {
            callback(message.data)
          })

        }
      })
    }

    SocketServer.prototype.publish =
      function(topic, data) {
        if (!this.conn) {
          throw new Error("Tried to publish to socket but it isn't connected yet.")
        }

        this.conn.write(JSON.stringify({topic: topic, data:data}))
      }


    SocketServer.prototype.subscribe =
      function(topic, callback) {
        if (!this.subscriptions[topic]) {
          this.subscriptions[topic] = []
        }

        this.subscriptions[topic].push(callback)
      }

    function socketServer() {
      if (!collective.socketServer) {
        collective.socketServer = new SocketServer()
      }

      return collective.socketServer
    }


    /* Socket */

    function Socket(topic) {
      this.topic = topic
      this.publishQueue = []
    }

    Socket.prototype.publish =
      function(data) {
        socketServer().publish(this.topic, data)
      }

    function publishFromBrowser(topic, data) {

      data = {topic: topic, data: data}

      var socket = new WebSocket("ws://"+window.location.host+"/echo/websocket")

      socket.onopen = function (event) {
        socket.send(JSON.stringify(data))
      }
    }

    Socket.prototype.subscribe =
      function(callback) {
        socketServer().subscribe(this.topic, callback)
      }

    function subscribeInBrowser(topic) {

      socket.onmessage = function (event) {
        console.log("server said", event.data);
      }

    }

    Socket.prototype.definePublishOnClient = 
      function() {
        return BrowserBridge.defineOnClient( publishFromBrowser).withArgs(this.topic)
      }
    Socket.prototype.defineSubscribeOnClient = function(func) {
        BrowserBridge.defineOnClient(
          subscribeInBrowser
        ).withArgs(this.topic)
      }

    return Socket
  }
)