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

      this.socket.on("connection", function(conn) {

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

    SocketServer.prototype.subscribe =
      function(key, callback) {
        if (!this.subscriptions[key]) {
          this.subscriptions[key] = []
        }

        this.subscriptions[key].push(callback)
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
    }

    Socket.prototype.publish = function() {}

    function publishFromBrowser(topic, data) {

      data = {topic: topic, data: data}

      var socket = new WebSocket("ws://"+window.location.host+"/echo/websocket")

      socket.onopen = function (event) {
        socket.send(JSON.stringify(data))
      }

      socket.onmessage = function (event) {
        console.log("server said", event.data);
      }
    }

    Socket.prototype.definePublishOnClient = 
      function() {
        return BrowserBridge.defineOnClient( publishFromBrowser).withArgs(this.topic)
      }

    function subscribeInBrowser(topic) {

    }

    Socket.prototype.subscribe =
      function(callback) {
        socketServer().subscribe(this.topic, callback)
      }

    Socket.prototype.defineSubscribeOnClient = function(func) {
        BrowserBridge.defineOnClient(
          subscribeInBrowser
        ).withArgs(this.topic)
      }


      BrowserBridge.defineOnClient.bind(BrowserBridge, subscribeInBrowser)

    return function(topic) {
      return new Socket(topic)
    }
  }
)