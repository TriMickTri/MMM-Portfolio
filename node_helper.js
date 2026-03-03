/* Magic Mirror 2 node helper: MMM-Portfolio – fetch stock quotes from Alpha Vantage */

const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
  start: function () {
    console.log(this.name + " helper started.");
  },

  fetchQuote: function (symbol, apiKey) {
    return new Promise((resolve) => {
      const path = "/query?function=GLOBAL_QUOTE&symbol=" + encodeURIComponent(symbol) + "&apikey=" + encodeURIComponent(apiKey);
      const options = {
        hostname: "www.alphavantage.co",
        path: path,
        method: "GET",
      };
      const req = https.request(options, (res) => {
        let body = "";
        res.on("data", (chunk) => { body += chunk; });
        res.on("end", () => {
          try {
            const data = JSON.parse(body);
            const quote = data["Global Quote"];
            if (quote && quote["01. symbol"]) {
              const rawPercent = quote["10. change percent"];
              const changePercent = rawPercent ? String(rawPercent).replace("%", "").trim() : "0";
              resolve({
                symbol: quote["01. symbol"],
                price: quote["05. price"],
                change: quote["09. change"],
                changePercent: changePercent,
              });
            } else {
              console.warn("MMM-Portfolio: No quote for " + symbol, data["Note"] || data["Error Message"] || "");
              resolve(null);
            }
          } catch (e) {
            console.error("MMM-Portfolio: Parse error for " + symbol, e.message);
            resolve(null);
          }
        });
      });
      req.on("error", (e) => {
        console.error("MMM-Portfolio: Request error for " + symbol, e.message);
        resolve(null);
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve(null);
      });
      req.end();
    });
  },

  fetchAll: async function (symbols, apiKey) {
    const result = {};
    for (const symbol of symbols) {
      const quote = await this.fetchQuote(symbol, apiKey);
      if (quote) result[quote.symbol] = quote;
      // Avoid rate limit (5 requests/min on free tier)
      await new Promise((r) => setTimeout(r, 12000));
    }
    return result;
  },

  socketNotificationReceived: function (notification, payload) {
    const self = this;
    if (notification === "GET_STOCKS") {
      const { symbols, apiKey } = payload;
      if (!symbols || !apiKey) {
        console.warn("MMM-Portfolio: GET_STOCKS missing symbols or apiKey");
        self.sendSocketNotification("STOCK_RESULT", {});
        return;
      }
      this.fetchAll(symbols, apiKey).then((result) => {
        self.sendSocketNotification("STOCK_RESULT", result);
      });
    }
  },
});
