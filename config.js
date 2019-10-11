module.exports = {

  allowRegistration: true,

  mapDefaultCenter: {
    lat: 45.523,
    lon: -73.498
  },

  languages: ['fr', 'en'],
  
  languageNames: {
    fr: "Français",
    en: "English"
  },

  title: {
    fr: "p0022 RTL Existant",
    en: "p0022 RTL Existing"
  },
  
  defaultLocale: "fr",
  timezone: "America/Montreal",
  gtfs: {
    socketFileUploaderOptions: {
      uploadDirectory                : 'gtfs',
      fileExtension                  : 'zip',
      renamedFileNameWithoutExtension: 'import',
      acceptTypes                    : ['application/zip'],
      maxFileSizeMB                  : 256,
      chunckSizeMB                   : 10240000,
      overwriteExistingFile          : true
    }
  },

  defaultPreferences: {
    osrmRouting: {
      useContinueStraightForMapMatching: false,
      driving: {
        // set host to null when you want node to start osrm locally with the provided osrmPath and port
        // !!! Be careful: use your own server, since you may be blocked on the osrm demo server after too many queries
        port     : 7023, // set to null when using remote osrm server
        osrmPath : null, // set to null when using a remote osrm server
        autoStart: true,
        enabled  : true
      },
      cycling: {
        port     : 8023,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      walking: {
        port     : 5023,
        osrmPath : null,
        autoStart: true,
        enabled  : false
      },
      bus: {
        port     : 7123,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      bus_suburb: {
        port     : 7223,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      bus_urban: {
        port     : 7323,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      bus_congestion: {
        port     : 7423,
        osrmPath : null,
        autoStart: true,
        enabled  : true
      },
      rail: {
        port     : 9023,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      tram: {
        port     : 9123,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      tramTrain: {
        port     : 9223,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      metro: {
        port     : 9323,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      monorail: {
        port     : 9423,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      },
      cableCar: {
        port     : 9523,
        osrmPath : null,
        autoStart: false,
        enabled  : false
      }
    },
    transit: {
      showEvolutionaryAlgorithmsFields: true,
      nodes: {
        defaultDwellTimeSeconds: 20
      },
      paths: {
        defaultRoutingMode: 'bus_congestion',
        defaultDwellTimeSeconds: 10
      }
    }
    /*transit: {
      periods: {
        test: {
          name: {
            fr: "Test",
            en: "Test"
          },
          periods: [
            {
              shortname: "test",
              name: {
                fr: "Tet",
                en: "Test"
              },
              startAtHour: 4,
              endAtHour:   28
            }
          ]
        }
      }
    }*/
  }

};

