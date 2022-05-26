Module.register("MMM-BMWConnected", {
  defaults: {
    apiBase: "www.bmw-connecteddrive.co.uk",
    refresh: 15,
    vehicleAngle: 300,
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
      instanceId: this.identifier
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
      this.bmwInfo = payload;
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

    let info = this.bmwInfo;

    let carImgContainer = document.createElement("div");
    carImgContainer.classList.add("bmw-container");
    let imageContainer = document.createElement("span");
    let imageObject = document.createElement("img");
    imageObject.setAttribute("src", info.imageUrl);
    imageContainer.appendChild(imageObject);
    carImgContainer.appendChild(imageContainer);
	wrapper.appendChild(carImgContainer);


    let carContainer = document.createElement("div");
    carContainer.classList.add("bmw-container");

    let locked = document.createElement("span");
    locked.classList.add("locked");
    if (info.doorLock === "Locked") {
      locked.appendChild(this.faIconFactory("fa-lock"));
    } else {
      locked.appendChild(this.faIconFactory("fa-lock-open"));
    }
    carContainer.appendChild(locked);

    let mileage = document.createElement("span");
    mileage.classList.add("mileage");
    mileage.appendChild(this.faIconFactory("fa-road"));
    mileage.appendChild(
      document.createTextNode(info.mileage + " " + distanceSuffix)
    );
    carContainer.appendChild(mileage);

    let fuelRange = document.createElement("span");
    fuelRange.classList.add("fuelRange");
    fuelRange.appendChild(this.faIconFactory("fa-gas-pump"));
    fuelRange.appendChild(
      document.createTextNode(info.fuelRange + " " + distanceSuffix)
    );
    carContainer.appendChild(fuelRange);

    wrapper.appendChild(carContainer);

    /**
     looks like for electric cars only, need to add check here
    var plugged = document.createElement("span");

    plugged.classList.add("plugged");
    if (info.connectorStatus == "CONNECTED") {
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

    carContainer.appendChild(battery);
    wrapper.appendChild(carContainer);

    carContainer = document.createElement("div");
    carContainer.classList.add("bmw-container");
    var elecRange = document.createElement("span");
    elecRange.classList.add("elecRange");
    elecRange.appendChild(this.faIconFactory("fa-charging-station"));
    elecRange.appendChild(document.createTextNode(info.electricRange + " " + distanceSuffix));
    carContainer.appendChild(elecRange);
     */

    //
    let carContainer2 = document.createElement("div");
    carContainer2.classList.add("bmw-container");

    let updated = document.createElement("span");
    updated.classList.add("updated");
    updated.appendChild(this.faIconFactory("fa-info"));
    let lastUpdateText = "Updated " + moment(info.updateTime).fromNow();
    if (this.config.debug) {
      lastUpdateText += " [" + info.unitOfLength + "]";
    }
    updated.appendChild(document.createTextNode(lastUpdateText));

    carContainer2.appendChild(updated);
    wrapper.appendChild(carContainer2); //


    return wrapper;
  }
});
