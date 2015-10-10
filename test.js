var test = require("nrtv-test")(require)

test.using(
  "sending a message from the browser",

  ["./socket", "nrtv-element", "nrtv-server", "nrtv-browser-bridge", "nrtv-browse"],
  function(expect, done, Socket, element, server, bridge, browse) {

    var orders = new Socket("burger order")
    var burgers = new Socket("burger")

    orders.subscribe(
      function(message) {

        if (message.notes == "finish the test") {
          return runChecks()
        }

        expect(message.holdThe).to.have.members(["mayo"])

        burgers.publish({
          tastiness: "hardly"
        })

      }
    )

    // orders.publish.inBrowser.withArgs() #todo



    var orderBurger = orders.publish.defineInBrowser()

    var burgerNoMayo = orderBurger.withArgs({holdThe: ["mayo"]}).evalable()

    var button = element(
      "button",
      {onclick: burgerNoMayo},
      "Burger me bro!"
    )

    var subscribe = burgers.subscribe.defineInBrowser()

    var tellServerToFinishTest = orderBurger.withArgs({notes: "finish the test"})

    var showTastiness = bridge.defineFunction(
      [tellServerToFinishTest],

      function tasty(finish, burger) {

        document.getElementsByTagName("body")[0].innerHTML = "That was a "+burger.tastiness+" tasty burger!"

        finish()
      }
    )

    bridge.asap(subscribe.withArgs(showTastiness))

    server.get("/", bridge.sendPage(button))

    server.start(4110)

    var browser = browse(
      "http://localhost:4110",

      function(browser) {
        browser.pressButton("button")
      }
    )

    function runChecks() {
      browser.assert.text("body", /a hardly tasty burger/)
      server.stop()
      done()
    }

  }
)
