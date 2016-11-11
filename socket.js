var library = require("nrtv-library")(require)




module.exports = library.export(
  "nrtv-socket",
  ["browser-bridge"],
  function(bridge) {

    function getSocket(collective, callback, queryString) {

      var match = document.cookie.match(/nrtvMinionId=([a-z0-9]*)/)

      var minionId = match && match[1]
      var isOutside = !!document.isOutsideNrtvMinionIframe

      if (minionId && !isOutside) {
        var addendum = "__nrtvMinionId="+minionId
        if (queryString) {
          queryString += "&"+addendum
        } else {
          queryString = "?"+addendum
        }
      }

      var url = "ws://"+window.location.host+"/echo/websocket"+(queryString)

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
      defineGetOn: function (bridge) {
        var binding = bridge.__getSocketBinding
        if (binding) {
          return binding
        }

        binding = bridge.__getSocketBinding = bridge.defineFunction(
          [bridge.collective({})],
          getSocket
        )

        return binding
      }
    }

  }
)