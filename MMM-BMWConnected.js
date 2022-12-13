Module.register("MMM-BMWConnected", {
  defaults: {
    apiBase: "cocoapi.bmwgroup.com",
    refresh: 15,
    vehicleOpacity: 0.75,
    distance: "miles",
    debug: false
  },

  getStyles: function () {
    return ["MMM-BMWConnected.css"];
  },

  getScripts: function () {
    return ["moment.js"];
  },

  capFirst: function (string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  },

  start: function () {
    Log.info("Starting module: " + this.name);
    this.sendSocketNotification("MMM-BMWCONNECTED-CONFIG", this.config);
    this.bmwInfo = {};
    this.getInfo();
    this.timer = null;
  },

  getInfo: function () {
    clearTimeout(this.timer);
    this.timer = null;
    this.sendSocketNotification("MMM-BMWCONNECTED-GET", {
	  instanceId: this.identifier,
	  vin: this.config.vin	
    });

    var self = this;
    this.timer = setTimeout(function () {
      self.getInfo();
    }, this.config.refresh * 60 * 1000);
  },

  socketNotificationReceived: function (notification, payload) {
    if (
      notification === "MMM-BMWCONNECTED-RESPONSE" + this.identifier &&
      Object.keys(payload).length > 0
    ) {
      this.bmwInfo = payload[this.config.vin];
      this.updateDom(1000);
    }
  },

  faIconFactory: function (icon) {
    var faIcon = document.createElement("i");
    faIcon.classList.add("fas");
    faIcon.classList.add(icon);
    return faIcon;
  },

  getDom: function () {
    var distanceSuffix = "mi";
    if (this.config.distance === "km") {
      distanceSuffix = "km";
    }

    var wrapper = document.createElement("div");
	  wrapper.classList.add("bmw-wrapper");

    if (this.config.email === "" || this.config.password === "") {
      wrapper.innerHTML = "Missing configuration.";
      return wrapper;
    }

    if (Object.keys(this.bmwInfo).length === 0) {
      wrapper.innerHTML = this.translate("LOADING");
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    if (!!this.bmwInfo.error) {
	  wrapper.innerHTML = this.bmwInfo.error;
      wrapper.className = "dimmed light small";
      return wrapper;
    }

    let info = this.bmwInfo;

    var carContainer = document.createElement("div");
    carContainer.classList.add("bmw-container");

    var imageContainer = document.createElement("span");
    var imageObject = document.createElement("img");
    imageObject.setAttribute('src', info.imageUrl);
    imageObject.setAttribute('style', 'opacity: ' + this.config.vehicleOpacity + ';');
    imageContainer.appendChild(imageObject);
    carContainer.appendChild(imageContainer);
    
    wrapper.appendChild(carContainer);

    var locked = document.createElement("span");
    locked.classList.add("locked");
	  var lockInfo = info.doorLock.toLowerCase();
    if (lockInfo === "secured" || lockInfo === "locked") {
      locked.appendChild(this.faIconFactory("fa-lock"));
    } else {
      locked.appendChild(this.faIconFactory("fa-lock-open"));
    }
    carContainer.appendChild(locked);

    var mileage = document.createElement("span");
    mileage.classList.add("mileage");
    if (this.config.showMileage) {
      mileage.appendChild(this.faIconFactory("fa-road"));
/*      if(distanceSuffix != info.mileage) {
        if(distanceSuffix == 'km') {
          info.mileage = Math.floor(info.mileage * 1.60934);
        } else {
          info.mileage = Math.floor(info.mileage * 0.621371);
        } 
      }  */
      mileage.appendChild(document.createTextNode(info.mileage + " " + distanceSuffix));
    } else {
      mileage.appendChild(document.createTextNode("\u00a0"));
    }
    carContainer.appendChild(mileage);
    wrapper.appendChild(carContainer);

    carContainer = document.createElement("div");
    carContainer.classList.add("bmw-container");

    var plugged = document.createElement("span");
    plugged.classList.add("plugged");
    if (info.connectorStatus) {
      plugged.appendChild(this.faIconFactory("fa-bolt"));
    } else {
      plugged.appendChild(this.faIconFactory("fa-plug"));
    }
    carContainer.appendChild(plugged);
    
    wrapper.appendChild(carContainer);

    carContainer = document.createElement("div");
    carContainer.classList.add("bmw-container");
    var battery = document.createElement("span");
    battery.classList.add("battery");
    
    switch (true) {
    case (info.chargingLevelHv < 25):
      battery.appendChild(this.faIconFactory("fa-battery-empty"));
      break;
    case (info.chargingLevelHv < 50):
      battery.appendChild(this.faIconFactory("fa-battery-quarter"));
      break;
    case (info.chargingLevelHv < 75):
      battery.appendChild(this.faIconFactory("fa-battery-half"));
      break;
    case (info.chargingLevelHv < 100):
      battery.appendChild(this.faIconFactory("fa-battery-three-quarters"));
      break;
    default:
      battery.appendChild(this.faIconFactory("fa-battery-full"));
      break;
    }

    if (this.config.showElectricPercentage) {
      battery.appendChild(document.createTextNode(info.chargingLevelHv + " %"));
    }
    carContainer.appendChild(battery);
    wrapper.appendChild(carContainer);
    
    carContainer = document.createElement("div");
    carContainer.classList.add("bmw-container");

    var elecRange = document.createElement("span");
    elecRange.classList.add("elecRange");
    if (this.config.showElectricRange) {
      elecRange.appendChild(this.faIconFactory("fa-charging-station"));
      elecRange.appendChild(document.createTextNode(info.electricRange + " " + distanceSuffix));
    } else {
      elecRange.appendChild(document.createTextNode("\u00a0"));
    }
    carContainer.appendChild(elecRange);
    
    var fuelRange = document.createElement("span");
    fuelRange.classList.add("fuelRange");
    if (this.config.showFuelRange) {
      fuelRange.appendChild(this.faIconFactory("fa-gas-pump"));
      fuelRange.appendChild(document.createTextNode(info.fuelRange + " " + distanceSuffix));
    } else {
      fuelRange.appendChild(document.createTextNode("\u00a0"));
    }
    carContainer.appendChild(fuelRange);
    wrapper.appendChild(carContainer);
    
    carContainer = document.createElement("div");
    carContainer.classList.add("bmw-container");
    carContainer.classList.add("updated");
    var updated = document.createElement("span");
    updated.classList.add("updated");
    updated.appendChild(this.faIconFactory("fa-info"));
    var lastUpdateText = this.config.lastUpdatedText + " " + moment(info.updateTime).fromNow();
    if (this.config.debug) {
      lastUpdateText += " [" + info.unitOfLength + "]";
    }
    updated.appendChild(document.createTextNode(lastUpdateText));
    carContainer.appendChild(updated);
    wrapper.appendChild(carContainer);
    
    return wrapper;
  }
});
