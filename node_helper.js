var NodeHelper = require("node_helper");
const moment = require('moment');

var tokenmanager = require('./lib/tokenmanager.js');
var bmwrequest = require('./lib/bmwrequest.js');

module.exports = NodeHelper.create({

  start: function () {
    console.log("Starting node_helper for module: " + this.name);
    this.bmwInfo = null;
  },

  socketNotificationReceived: function (notification, payload) {

    var self = this;
    if (notification == "MMM-BMWCONNECTED-CONFIG") {
      self.config = payload;
    } else if (notification == "MMM-BMWCONNECTED-GET") {

      var credConfig = {
        'username': self.config.email,
        'password': self.config.password
      }

      tokenmanager.initialize(credConfig,
        function onSuccess(token, tokenType) {

          var vin;
          console.log("Token init completed: " + "\nToken: " + token + "\nTokenType: " + tokenType);

          bmwrequest.call(self.config.apiBase, '/api/me/vehicles/v2', '', token, tokenType,
            function (data) {
              try {
                var json = JSON.parse(data);
                vin = json[0].vin;
              } catch (err) {
                console.error("Failed to parse data " + data + ", error " + err);
              }

              var getInfoUri = '/api/vehicle/dynamic/v1/' + vin
              bmwrequest.call(self.config.apiBase, getInfoUri, '', token, tokenType,
                function (data) {
                  try {
                    var json = JSON.parse(data);
                    var attributes = json.attributesMap;

                    self.bmwInfo = {
                      updateTime: moment.unix(attributes.updateTime_converted_timestamp / 1000).format(),
                      doorLock: attributes.door_lock_state,
                      electricRange: Number(attributes.beRemainingRangeElectricMile).toFixed(),
                      fuelRange: Number(attributes.beRemainingRangeFuelMile).toFixed(),
                      mileage: Number(attributes.mileage).toFixed(),
                      connectorStatus: attributes.connectorStatus,
                      vin: vin,
                      chargingLevelHv: Number(attributes.chargingLevelHv).toFixed(),
                      imageUrl: null,
                      unitOfLength: attributes.unitOfLength
                    }

                    if (self.config.distance === "km") {
                      self.bmwInfo.electricRange = Number(attributes.beRemainingRangeElectricKm).toFixed();
                      self.bmwInfo.fuelRange = Number(attributes.beRemainingRangeFuelKm).toFixed();
                    }


                    var getImagesUri = '/api/vehicle/image/v1/' + vin + "?startAngle=0&stepAngle=10&width=640"
                    bmwrequest.call(self.config.apiBase, getImagesUri, '', token, tokenType, function (data) {
                        try {
                          var json = JSON.parse(data);
                          var angleUrls = json.angleUrls;
                          var picked = angleUrls.find(o => o.angle === self.config.vehicleAngle);
                        } catch (err) {
                          console.error("Failed to parse data " + data + ", error " + err);
                        }
                        self.bmwInfo.imageUrl = picked.url;
                        self.bmwInfo.instanceId = payload.instanceId;

                        self.parseCarInfo(payload);

                      },
                      function onError(err) {
                        console.error("Failed to read list of vehicle images:" + err);
                      });

                  } catch (err) {
                    console.error("Failed to parse data " + data + ", error " + err);
                  }
                },
                function onError(err) {
                  console.error("Failed to read vehicle info:" + err);
                });

            },
            function onError(err) {
              console.error("Failed to read list of vehicles:" + err);
            });
        },
        function onError(err) {
          console.error("Failed to read token:" + err);
        }
      );


    }
  },

  parseCarInfo: function (payload) {
    this.sendSocketNotification("MMM-BMWCONNECTED-RESPONSE" + payload.instanceId, this.bmwInfo);
  },

});