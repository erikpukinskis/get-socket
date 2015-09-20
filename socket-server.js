var library = require("nrtv-library")(require)

module.exports = library.export(
  "socket-server",
  ["sockjs", "nrtv-server", "http"],
  function(sockjs, nrtvServer, http) {

    function SocketServer() {
      this.socket = sockjs.createServer()

      var subscriptions = this.subscriptions = {}

      var app = nrtvServer.express()

      var httpServer = http.createServer(app);

      this.socket.installHandlers(httpServer, {prefix: "/echo"})

      nrtvServer.relenquishControl(
        function start(port) {
          httpServer.listen(port)
          console.log("listening on "+port+" (for websockets too)")
          return httpServer
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

    return SocketServer
  }  
)