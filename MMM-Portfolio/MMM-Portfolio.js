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

    const list = document.createElement("ul");
    list.className = "mmm-portfolio-list";

    const data = this.result;
    for (const symbol of this.config.symbols) {
      if (!data[symbol]) continue;

      const item = data[symbol];
      const price = parseFloat(item.price);
      const change = parseFloat(item.change);
      const changePercent = parseFloat(item.changePercent);
      const isPositive = change >= 0;

      const li = document.createElement("li");
      li.className = "mmm-portfolio-item";

      const symSpan = document.createElement("span");
      symSpan.className = "mmm-portfolio-symbol";
      symSpan.textContent = symbol;

      const priceSpan = document.createElement("span");
      priceSpan.className = "mmm-portfolio-price";
      priceSpan.textContent = price.toFixed(this.config.decimals);

      li.appendChild(symSpan);
      li.appendChild(priceSpan);

      if (this.config.showChange || this.config.showPercent) {
        const changeSpan = document.createElement("span");
        changeSpan.className = "mmm-portfolio-change " + (isPositive ? "positive" : "negative");
        const parts = [];
        if (this.config.showChange) parts.push((isPositive ? "+" : "") + change.toFixed(this.config.decimals));
        if (this.config.showPercent) parts.push((isPositive ? "+" : "") + changePercent.toFixed(2) + "%");
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
