/* global Module */
/* Magic Mirror 2 module: Portfolio – display stock quotes for your portfolio */

"use strict";

Module.register("MMM-Portfolio", {
  result: {},
  defaults: {
    updateInterval: 300000,  // 5 minutes (Alpha Vantage free tier: 25 req/day – use sparingly)
    fadeSpeed: 1000,
    symbols: ["AAPL", "GOOGL", "MSFT"],
    apiKey: "",
    showChange: true,
    showPercent: true,
    decimals: 2,
    currency: "USD",
  },

  getStyles: function () {
    return ["MMM-Portfolio.css"];
  },

  isMarketOpen: function () {
    const now = new Date();
    const day = now.getDay(); // 0 = Sun, 6 = Sat
    if (day === 0 || day === 6) return false;
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const afterOpen = hours > 9 || (hours === 9 && minutes >= 30);
    const beforeClose = hours < 16;
    return afterOpen && beforeClose;
  },

  start: function () {
    this.result = {};
    this.getStocks();
    this.scheduleUpdate();
  },

  getDom: function () {
    const wrapper = document.createElement("div");
    wrapper.className = "mmm-portfolio";

    if (Object.keys(this.result).length === 0) {
      const loading = document.createElement("div");
      loading.className = "mmm-portfolio-loading";
      loading.innerHTML = "Loading portfolio…";
      wrapper.appendChild(loading);
      return wrapper;
    }

    const title = document.createElement("div");
    title.className = "mmm-portfolio-title";
    title.innerHTML = "Portfolio";
    wrapper.appendChild(title);

    const header = document.createElement("div");
    header.className = "mmm-portfolio-header";
    const headerLabels = ["SYM", "LOW", "HIGH", "LAST", "CHG"];
    headerLabels.forEach((label) => {
      const span = document.createElement("span");
      span.textContent = label;
      header.appendChild(span);
    });
    wrapper.appendChild(header);

    const list = document.createElement("ul");
    list.className = "mmm-portfolio-list";

    const data = this.result;
    for (const symbol of this.config.symbols) {
      const item = data[symbol];
      const hasData = !!item && item.price != null;
      const price = hasData ? parseFloat(item.price) : NaN;
      const low = hasData ? parseFloat(item.low) : NaN;
      const high = hasData ? parseFloat(item.high) : NaN;
      const change = hasData ? parseFloat(item.change) : NaN;
      const changePercent = hasData ? parseFloat(item.changePercent) : NaN;
      const isPositive = hasData ? change >= 0 : true;
      const isStale = !!item && item.stale;

      const li = document.createElement("li");
      li.className = "mmm-portfolio-item";

      const symSpan = document.createElement("span");
      symSpan.className = "mmm-portfolio-symbol";
      symSpan.textContent = symbol;

      const lowSpan = document.createElement("span");
      lowSpan.className = "mmm-portfolio-low" + (isStale ? " stale" : "");
      lowSpan.textContent = hasData && Number.isFinite(low) ? low.toFixed(this.config.decimals) : "—";

      const highSpan = document.createElement("span");
      highSpan.className = "mmm-portfolio-high" + (isStale ? " stale" : "");
      highSpan.textContent = hasData && Number.isFinite(high) ? high.toFixed(this.config.decimals) : "—";

      const priceSpan = document.createElement("span");
      priceSpan.className = "mmm-portfolio-price" + (isStale ? " stale" : "");
      priceSpan.textContent = hasData && Number.isFinite(price) ? price.toFixed(this.config.decimals) : "—";

      li.appendChild(symSpan);
      li.appendChild(lowSpan);
      li.appendChild(highSpan);
      li.appendChild(priceSpan);

      if (this.config.showChange || this.config.showPercent) {
        const changeSpan = document.createElement("span");
        changeSpan.className =
          "mmm-portfolio-change " +
          (isPositive ? "positive" : "negative") +
          (isStale ? " stale" : "");
        const parts = [];
        if (hasData && Number.isFinite(change) && this.config.showChange) parts.push((isPositive ? "+" : "") + change.toFixed(this.config.decimals));
        if (hasData && Number.isFinite(changePercent) && this.config.showPercent) parts.push((isPositive ? "+" : "") + changePercent.toFixed(2) + "%");
        changeSpan.textContent = parts.join(" ");
        li.appendChild(changeSpan);
      }

      list.appendChild(li);
    }

    wrapper.appendChild(list);
    return wrapper;
  },

  scheduleUpdate: function () {
    const that = this;
    setInterval(function () {
      that.getStocks();
    }, this.config.updateInterval);
  },

  getStocks: function () {
    if (!this.config.apiKey) {
      Log.error("MMM-Portfolio: apiKey is required. Get a free key at https://www.alphavantage.co/support/#api-key");
      return;
    }
    if (!this.isMarketOpen()) {
      Log.info("MMM-Portfolio: Market closed, skipping API call.");
      return;
    }
    this.sendSocketNotification("GET_STOCKS", {
      symbols: this.config.symbols,
      apiKey: this.config.apiKey,
    });
  },

  socketNotificationReceived: function (notification, payload) {
    if (notification === "STOCK_RESULT") {
      this.result = payload;
      this.updateDom(this.config.fadeSpeed);
    }
  },
});
