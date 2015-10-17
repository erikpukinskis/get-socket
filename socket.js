var library = require("nrtv-library")(require)




module.exports = library.export(
  "nrtv-socket",
  ["nrtv-browser-bridge"],
  function(bridge) {

    function getSocket(collective, callback, queryString) {

      var url = "ws://"+window.location.host+"/echo/websocket"+(queryString || "")

      if (!collective[url]) {
        collective[url] = {callbacks: []}
      }
      collective = collective[url]

      if (collective.open) {
        return callback(collective.socket)
      }

      collective.callbacks.push(callback)

      if (collective.socket) {
        return
      }

      var socket = collective.socket = new WebSocket(url)

      socket.onopen = function () {
        collective.open = true
        collective.callbacks.forEach(
          function(callback) {
            callback(socket)
          }
        )
      }

    }

    return {
      defineGetInBrowser: function () {
        return bridge.defineFunction(
          [bridge.collective({})],
          getSocket
        )
      }
    }

  }
)