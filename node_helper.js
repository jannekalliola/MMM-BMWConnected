var NodeHelper = require("node_helper");
const moment = require('moment');
const fs = require("fs");

var tokenmanager = require('./lib/tokenmanager.js');
var bmwrequest = require('./lib/bmwrequest.js');

module.exports = NodeHelper.create({

  start: function () {
    console.log("Starting node_helper for module: " + this.name);
    this.bmwInfo = {};
    this.config = {};
  },

  socketNotificationReceived: function (notification, payload) {

    var self = this;
    var vin = payload.vin;
      
    if (notification == "MMM-BMWCONNECTED-CONFIG") {
      self.config[vin] = payload;
      self.bmwInfo[vin] = null;
    } else if (notification == "MMM-BMWCONNECTED-GET") {
      var config = self.config[vin];  
      var credConfig = {
        'username': self.config.email,
        'password': self.config.password
      }

      tokenmanager.initialize(credConfig,
        function onSuccess(token, tokenType) {

//          console.log("Token init completed: " + "\nToken: " + token + "\nTokenType: " + tokenType);
          bmwrequest.call(self.config[vin].apiBase, '/eadrax-vcs/v2/vehicles', '', token, tokenType,
            function (data) {
              try {
                var json = JSON.parse(data);
                var car = json.find(o => o.vin === vin);
                if(!car) {
                  console.log("No vin " + vin + " found on results.");
                  self.bmwInfo[vin] = {
                    error: "No matching vin found."
                  };
                  return;
                }
              } catch (err) {
                console.error("Failed to parse vehicle list data " + data + ", error " + err);
                self.bmwInfo[vin] = {
                  error: "Failed to parse vehicle data."
                };
                return;
              }

              var getInfoUri = `/eadrax-vcs/v2/vehicles/${vin}/state?apptimezone=0&appDateTime=${new Date().getTime()}&tireGuardMode=ENABLED`;

              bmwrequest.call(self.config[vin].apiBase, getInfoUri, '', token, tokenType,
                function (data) {
					        try {
                    var json = JSON.parse(data);
                    var attributes = json.state;
                    self.bmwInfo[vin] = {
						          updateTime: attributes.lastUpdatedAt,
						          doorLock: attributes.doorsState.combinedSecurityState,
						          fuelRange: attributes.combustionFuelLevel.range,
						          electricRange: attributes.electricChargingState.range,
						          chargingLevelHv: attributes.electricChargingState.chargingLevelPercent,
						          mileage: attributes.currentMileage,
//						          mileageUnits: attributes.currentMileage.units,
						          connectorStatus: attributes.electricChargingState.isChargerConnected,
						          vin: vin,
						          imageUrl: null
//						          unitOfLength: attributes.fuelIndicators.rangeUnits
                    }
                    var imageFile = 'modules/MMM-BMWConnected/car-' + vin + '.png';
                    var imageFileExists = fs.existsSync(imageFile);
                    if(imageFileExists) {
                      self.bmwInfo[vin].imageUrl = imageFile;
                      self.parseCarInfo(payload);
                      return;
                    }
                    var getImagesUri = '/eadrax-ics/v3/presentation/vehicles/' + vin + '/images?carView=VehicleStatus';
                    bmwrequest.download(imageFile, self.config[vin].apiBase, getImagesUri, '', token, tokenType,
                      function (data) {
                        self.bmwInfo[vin].imageUrl = imageFile;
                        self.parseCarInfo(payload);
                      },
                      function onError(err) {
                        console.error("Failed to read list of vehicle images:" + err);
                      });
                  } catch (err) {
                    console.error("Failed to parse vehicle data " + data + ", error " + err);
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
