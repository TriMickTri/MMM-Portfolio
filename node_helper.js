/* Magic Mirror 2 node helper: MMM-Portfolio – fetch stock quotes from Alpha Vantage */

const NodeHelper = require("node_helper");
const https = require("https");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
  start: function () {
    console.log(this.name + " helper started.");
    this.cache = {};
    this.logFile =
      this.logFile ||
      path.join(__dirname, "mmm-portfolio-events.log");
  },

  logEvent: function (entry) {
    try {
      const timestamp = new Date().toISOString();
      const line =
        "[" +
        timestamp +
        "] " +
        (entry.type || "event") +
        " " +
        (entry.message || "") +
        (entry.details ? " " + JSON.stringify(entry.details) : "") +
        "\n";
      fs.appendFile(this.logFile, line, (err) => {
        if (err) {
          console.error("MMM-Portfolio: Failed to write log:", err.message);
        }
      });
    } catch (e) {
      console.error("MMM-Portfolio: Log error:", e.message);
    }
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
            if (data && (data["Note"] || data["Information"])) {
              resolve({ symbol, rateLimited: true, message: data["Note"] || data["Information"] });
              return;
            }
            if (data && data["Error Message"]) {
              resolve({ symbol, notFound: true, message: data["Error Message"] });
              return;
            }
            const quote = data["Global Quote"];
            if (quote && quote["01. symbol"]) {
              const rawPercent = quote["10. change percent"];
              const changePercent = rawPercent ? String(rawPercent).replace("%", "").trim() : "0";
              resolve({
                symbol: quote["01. symbol"],
                price: quote["05. price"],
                high: quote["03. high"],
                low: quote["04. low"],
                change: quote["09. change"],
                changePercent: changePercent,
                asOf: new Date().toISOString(),
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
    let rateLimited = false;
    this.logEvent({
      type: "stock_api_call",
      message: "Fetching stock quotes",
      details: { symbols },
    });
    for (const symbol of symbols) {
      if (rateLimited) {
        if (this.cache[symbol]) result[symbol] = { ...this.cache[symbol], stale: true, staleReason: "rate_limited" };
        continue;
      }

      const quote = await this.fetchQuote(symbol, apiKey);
      if (quote && quote.rateLimited) {
        console.warn("MMM-Portfolio: Rate limited by Alpha Vantage. Returning cached results where available.");
        rateLimited = true;
        if (this.cache[symbol]) result[symbol] = { ...this.cache[symbol], stale: true, staleReason: "rate_limited" };
        continue;
      }

      if (quote && quote.notFound) {
        console.warn("MMM-Portfolio: Symbol not found: " + symbol);
        if (this.cache[symbol]) result[symbol] = { ...this.cache[symbol], stale: true, staleReason: "symbol_not_found" };
        continue;
      }

      if (quote && quote.symbol) {
        result[quote.symbol] = quote;
        this.cache[quote.symbol] = { ...quote, stale: false };
      } else if (this.cache[symbol]) {
        result[symbol] = { ...this.cache[symbol], stale: true, staleReason: "fetch_failed" };
      }

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
    } else if (notification === "LOG_EVENT") {
      // Generic event logger from front-end (calendar, weather, etc.)
      this.logEvent(payload || {});
    }
  },
});
