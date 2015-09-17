var library = require("nrtv-library")(require)

module.exports = library.export(
  "nrtv-socket",

  [library.collective({}), "sockjs", "nrtv-browser-bridge", "nrtv-server", "http"],
  function(collective, sockjs, BrowserBridge, Server, http) {


    /*  Socket Server */

    function SocketServer() {
      this.socket = sockjs.createServer()

      var subscriptions = this.subscriptions = {}

      var app = Server.express()

      var server = http.createServer(app);

      this.socket.installHandlers(server, {prefix: "/echo"})

      Server.relenquishControl(
        function start(port) {
          server.listen(port)
          console.log("listening on "+port+" (for websockets too)")
          return server
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

    function getServer() {
      if (!collective.socketServer) {
        collective.socketServer = new SocketServer()
      }

      return collective.socketServer
    }



    /* Client functions */

    var getClientSocket = BrowserBridge.defineOnClient(
      [BrowserBridge.collective({
        callbacks: []
      })],
      function getSocket(collective, callback) {

        if (collective.open) {
          return callback(collective.socket)
        }

        collective.callbacks.push(callback)

        if (collective.socket) {
          return
        }

        var socket = collective.socket = new WebSocket("ws://"+window.location.host+"/echo/websocket")

        socket.onopen = function () {
          collective.open = true
          collective.callbacks.forEach(
            function(callback) {
              callback(socket)
            }
          )
        }

      }
    )

    var publishFromBrowser = BrowserBridge.defineOnClient(
      [getClientSocket],
      function publish(getSocket, topic, data) {

        getSocket(function(socket) {
          socket.send(JSON.stringify({
            topic:topic,
            data: data
          }))
        })
      }
    )

    var subscribeInBrowser = BrowserBridge.defineOnClient(
        [
          BrowserBridge.collective({
            subscriptions: {}
          }),
          getClientSocket
        ],

        function subscribe(collective, getSocket, topic, callback) {

          if (!collective.subscriptions[topic]) {
            collective.subscriptions[topic] = []
          }

          collective.subscriptions[topic].push(callback)

          if (!collective.listening) {
            getSocket(
              function(socket) {
                socket.onmessage = handleMessage
                collective.listening = true
              }
            )
          }

          function handleMessage(message) {

            if (!collective.subscriptions) { return }

            var message = JSON.parse(message.data)

            collective.subscriptions[message.topic].forEach(
              function(callback) {
                callback(message.data)
              }
            )
          }

        }
      )



    /* Interface */

    function Socket(topic) {
      this.topic = topic
      this.publishQueue = []
    }

    Socket.prototype.publish =
      function(data) {
        getServer().publish(this.topic, data)
      }

    Socket.prototype.subscribe =
      function(callback) {
        getServer().subscribe(this.topic, callback)
      }

    Socket.prototype.definePublishOnClient =
      function() {
        return publishFromBrowser.withArgs(this.topic)
      }
  
    Socket.prototype.defineSubscribeOnClient =
      function(callback) {
        return subscribeInBrowser.withArgs(this.topic)
      }

    return Socket
  }
)