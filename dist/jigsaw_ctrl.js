System.register(["./leaflet/leaflet.js", "./leaflet/leaflet-heat.js", "moment", "app/core/app_events", "app/plugins/sdk", "./leaflet/leaflet.css!", "./partials/module.css!"], function (_export, _context) {
  "use strict";

  var L, heatLayer, moment, appEvents, MetricsPanelCtrl, panelDefaults, JigsawCtrl;

  function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

  function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

  function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

  function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

  function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

  function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

  function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

  function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

  function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

  function log(msg) {// uncomment for debugging
    //console.log(msg);
  }

  return {
    setters: [function (_leafletLeafletJs) {
      L = _leafletLeafletJs.default;
    }, function (_leafletLeafletHeatJs) {
      heatLayer = _leafletLeafletHeatJs.default;
    }, function (_moment) {
      moment = _moment.default;
    }, function (_appCoreApp_events) {
      appEvents = _appCoreApp_events.default;
    }, function (_appPluginsSdk) {
      MetricsPanelCtrl = _appPluginsSdk.MetricsPanelCtrl;
    }, function (_leafletLeafletCss) {}, function (_partialsModuleCss) {}],
    execute: function () {
      panelDefaults = {
        maxDataPoints: 500,
        autoZoom: true,
        scrollWheelZoom: false,
        defaultLayer: 'OpenStreetMap',
        lineColor: '#ffff',
        pointColor: 'royalblue'
      };

      _export("JigsawCtrl", JigsawCtrl =
      /*#__PURE__*/
      function (_MetricsPanelCtrl) {
        _inherits(JigsawCtrl, _MetricsPanelCtrl);

        function JigsawCtrl($scope, $injector) {
          var _this;

          _classCallCheck(this, JigsawCtrl);

          _this = _possibleConstructorReturn(this, _getPrototypeOf(JigsawCtrl).call(this, $scope, $injector));
          log("constructor");

          _.defaults(_this.panel, panelDefaults); // Save layers globally in order to use them in options


          _this.layers = {
            'OpenStreetMap': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
              maxZoom: 19
            }),
            'OpenTopoMap': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
              attribution: 'Map data: &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)',
              maxZoom: 17
            }),
            'Satellite': L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
              attribution: 'Imagery &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
              // This map doesn't have labels so we force a label-only layer on top of it
              forcedOverlay: L.tileLayer('https://stamen-tiles-{s}.a.ssl.fastly.net/toner-labels/{z}/{x}/{y}.png', {
                attribution: 'Labels by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a> &mdash; Map data &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
                subdomains: 'abcd',
                maxZoom: 20
              })
            })
          };
          _this.timeSrv = $injector.get('timeSrv');
          _this.coords = [];
          _this.leafMap = null;
          _this.polyline = null;
          _this.hoverMarker = null;
          _this.hoverTarget = null;
          _this.setSizePromise = null; // Panel events

          _this.events.on('panel-initialized', _this.onInitialized.bind(_assertThisInitialized(_this)));

          _this.events.on('view-mode-changed', _this.onViewModeChanged.bind(_assertThisInitialized(_this)));

          _this.events.on('init-edit-mode', _this.onInitEditMode.bind(_assertThisInitialized(_this)));

          _this.events.on('panel-teardown', _this.onPanelTeardown.bind(_assertThisInitialized(_this)));

          _this.events.on('panel-size-changed', _this.onPanelSizeChanged.bind(_assertThisInitialized(_this)));

          _this.events.on('data-received', _this.onDataReceived.bind(_assertThisInitialized(_this)));

          _this.events.on('data-snapshot-load', _this.onDataSnapshotLoad.bind(_assertThisInitialized(_this))); // Global events


          appEvents.on('graph-hover', _this.onPanelHover.bind(_assertThisInitialized(_this)));
          appEvents.on('graph-hover-clear', _this.onPanelClear.bind(_assertThisInitialized(_this)));
          return _this;
        }

        _createClass(JigsawCtrl, [{
          key: "onInitialized",
          value: function onInitialized() {
            log("onInitialized");
            this.render();
          }
        }, {
          key: "onInitEditMode",
          value: function onInitEditMode() {
            log("onInitEditMode");
            this.addEditorTab('Options', 'public/plugins/grafana-jigsaw-panel/partials/options.html', 2);
          }
        }, {
          key: "onPanelTeardown",
          value: function onPanelTeardown() {
            log("onPanelTeardown");
            this.$timeout.cancel(this.setSizePromise);
          }
        }, {
          key: "onPanelHover",
          value: function onPanelHover(evt) {
            log("onPanelHover");

            if (this.coords.length === 0) {
              return;
            } // check if we are already showing the correct hoverMarker


            var target = Math.floor(evt.pos.x);

            if (this.hoverTarget && this.hoverTarget === target) {
              return;
            } // check for initial show of the marker


            if (this.hoverTarget == null) {
              this.hoverMarker.addTo(this.leafMap);
            }

            this.hoverTarget = target; // Find the currently selected time and move the hoverMarker to it
            // Note that an exact match isn't always going to work due to rounding so
            // we clean that up later (still more efficient)

            var min = 0;
            var max = this.coords.length - 1;
            var idx = null;
            var exact = false;

            while (min <= max) {
              idx = Math.floor((max + min) / 2);

              if (this.coords[idx].timestamp === this.hoverTarget) {
                exact = true;
                break;
              } else if (this.coords[idx].timestamp < this.hoverTarget) {
                min = idx + 1;
              } else {
                max = idx - 1;
              }
            } // Correct the case where we are +1 index off


            if (!exact && idx > 0 && this.coords[idx].timestamp > this.hoverTarget) {
              idx--;
            }

            this.hoverMarker.setLatLng(this.coords[idx].position);
          }
        }, {
          key: "onPanelClear",
          value: function onPanelClear(evt) {
            log("onPanelClear"); // clear the highlighted circle

            this.hoverTarget = null;

            if (this.hoverMarker) {
              this.hoverMarker.removeFrom(this.leafMap);
            }
          }
        }, {
          key: "onViewModeChanged",
          value: function onViewModeChanged() {
            log("onViewModeChanged"); // KLUDGE: When the view mode is changed, panel resize events are not
            //         emitted even if the panel was resized. Work around this by telling
            //         the panel it's been resized whenever the view mode changes.

            this.onPanelSizeChanged();
          }
        }, {
          key: "onPanelSizeChanged",
          value: function onPanelSizeChanged() {
            log("onPanelSizeChanged"); // KLUDGE: This event is fired too soon - we need to delay doing the actual
            //         size invalidation until after the panel has actually been resized.

            this.$timeout.cancel(this.setSizePromise);
            var map = this.leafMap;
            this.setSizePromise = this.$timeout(function () {
              if (map) {
                log("Invalidating map size");
                map.invalidateSize(true);
              }
            }, 500);
          }
        }, {
          key: "applyScrollZoom",
          value: function applyScrollZoom() {
            var enabled = this.leafMap.scrollWheelZoom.enabled();

            if (enabled != this.panel.scrollWheelZoom) {
              if (enabled) {
                this.leafMap.scrollWheelZoom.disable();
              } else {
                this.leafMap.scrollWheelZoom.enable();
              }
            }
          }
        }, {
          key: "applyDefaultLayer",
          value: function applyDefaultLayer() {
            var _this2 = this;

            var hadMap = Boolean(this.leafMap);
            this.setupMap(); // Only need to re-add layers if the map previously existed

            if (hadMap) {
              this.leafMap.eachLayer(function (layer) {
                layer.removeFrom(_this2.leafMap);
              });
              this.layers[this.panel.defaultLayer].addTo(this.leafMap);
            }

            this.addDataToMap();
          }
        }, {
          key: "setupMap",
          value: function setupMap() {
            log("setupMap"); // Create the map or get it back in a clean state if it already exists

            if (this.leafMap) {
              if (this.polyline) {
                this.polyline.removeFrom(this.leafMap);
              }

              this.onPanelClear();
              return;
            } // Create the map


            this.leafMap = L.map('jigsaw-' + this.panel.id, {
              scrollWheelZoom: this.panel.scrollWheelZoom,
              zoomSnap: 0.5,
              zoomDelta: 1
            }); // Add layers to the control widget

            L.control.layers(this.layers).addTo(this.leafMap); // Add default layer to map

            this.layers[this.panel.defaultLayer].addTo(this.leafMap); // Initialize jigsaw array

            this.jigsaw = Array(); // Hover marker

            this.hoverMarker = L.circleMarker(L.latLng(0, 0), {
              color: 'white',
              fillColor: this.panel.pointColor,
              fillOpacity: 1,
              weight: 2,
              radius: 7
            }); // Events

            this.leafMap.on('baselayerchange', this.mapBaseLayerChange.bind(this));
            this.leafMap.on('boxzoomend', this.mapZoomToBox.bind(this));
          }
        }, {
          key: "mapBaseLayerChange",
          value: function mapBaseLayerChange(e) {
            // If a tileLayer has a 'forcedOverlay' attribute, always enable/disable it
            // along with the layer
            if (this.leafMap.forcedOverlay) {
              this.leafMap.forcedOverlay.removeFrom(this.leafMap);
              this.leafMap.forcedOverlay = null;
            }

            var overlay = e.layer.options.forcedOverlay;

            if (overlay) {
              overlay.addTo(this.leafMap);
              overlay.setZIndex(e.layer.options.zIndex + 1);
              this.leafMap.forcedOverlay = overlay;
            }
          }
        }, {
          key: "mapZoomToBox",
          value: function mapZoomToBox(e) {
            log("mapZoomToBox"); // Find time bounds of selected coordinates

            var bounds = this.coords.reduce(function (t, c) {
              if (e.boxZoomBounds.contains(c.position)) {
                t.from = Math.min(t.from, c.timestamp);
                t.to = Math.max(t.to, c.timestamp);
              }

              return t;
            }, {
              from: Infinity,
              to: -Infinity
            }); // Set the global time range

            if (isFinite(bounds.from) && isFinite(bounds.to)) {
              // KLUDGE: Create moment objects here to avoid a TypeError that
              //         occurs when Grafana processes normal numbers
              this.timeSrv.setTime({
                from: moment.utc(bounds.from),
                to: moment.utc(bounds.to)
              });
            }
          } // Add the circles and polyline to the map

        }, {
          key: "addDataToMap",
          value: function addDataToMap() {
            log("addDataToMap");
            this.polyline = L.polyline(this.coords.map(function (x) {
              return x.position;
            }, this), {
              color: this.panel.lineColor,
              weight: 3
            }).addTo(this.leafMap);
            this.zoomToFit();
          }
        }, {
          key: "zoomToFit",
          value: function zoomToFit() {
            log("zoomToFit");

            if (this.panel.autoZoom && this.polyline) {
              this.leafMap.fitBounds(this.polyline.getBounds());
            }

            this.render();
          }
        }, {
          key: "refreshColors",
          value: function refreshColors() {
            log("refreshColors");

            if (this.polyline) {
              this.polyline.setStyle({
                color: this.panel.lineColor
              });
            }

            if (this.hoverMarker) {
              this.hoverMarker.setStyle({
                fillColor: this.panel.pointColor
              });
            }

            this.render();
          }
        }, {
          key: "onDataReceived",
          value: function onDataReceived(data) {
            log("onDataReceived");
            this.setupMap();

            if (data.length === 0) {
              // No data or incorrect data, show a world map and abort
              this.leafMap.setView([0, 0], 1);
              return;
            } // Asumption is that there are an equal number of properly matched timestamps
            // TODO: proper joining by timestamp?


            this.coords.length = 0;
            var lats = data[0].datapoints;
            var lons = data[1].datapoints;
            var values = data[2].datapoints; // Get min/max lat/lon

            var lat_min = lats[0][0];
            var lat_max = lats[0][0];
            var lon_min = lons[0][0];
            var lon_max = lons[0][0];

            for (var _i = 0; _i < lats.length; _i++) {
              if (lats[_i][0] == null || lons[_i][0] == null || lats[_i][1] !== lons[_i][1]) {
                continue;
              }

              if (lat_min > lats[_i][0]) lat_min = lats[_i][0];
              if (lat_max < lats[_i][0]) lat_max = lats[_i][0];
              if (lon_min > lons[_i][0]) lon_min = lons[_i][0];
              if (lon_max < lons[_i][0]) lon_max = lons[_i][0];
              this.coords.push({
                position: L.latLng(lats[_i][0], lons[_i][0]),
                timestamp: lats[_i][1]
              });
            } // Build data grid and populate with average values


            var gridsquaresize_lat = 0.0014;
            var gridsquaresize_lon = 0.002;
            var gridsquarehalfsize_lat = gridsquaresize_lat / 2;
            var gridsquarehalfsize_lon = gridsquaresize_lon / 2;
            lat_min = parseInt((lat_min - gridsquarehalfsize_lat) / gridsquaresize_lat) * gridsquaresize_lat;
            lat_max = parseInt((lat_max + gridsquarehalfsize_lat) / gridsquaresize_lat) * gridsquaresize_lat;
            lon_min = parseInt((lon_min - gridsquarehalfsize_lon) / gridsquaresize_lon) * gridsquaresize_lon;
            lon_max = parseInt((lon_max + gridsquarehalfsize_lon) / gridsquaresize_lon) * gridsquaresize_lon;
            var dim_x = parseInt((lat_max - lat_min) / gridsquaresize_lat) + 2;
            var dim_y = parseInt((lon_max - lon_min) / gridsquaresize_lon) + 2; // console.log(lat_min, lat_max, lon_min, lon_max);

            function getGridFromLatLon(gridsquaresize, lat_min, lon_min, lat, lon) {
              var grid_lat = parseInt((lat - lat_min) / gridsquaresize.lat);
              var grid_lon = parseInt((lon - lon_min) / gridsquaresize.lon);
              return {
                'grid_lat': grid_lat,
                'grid_lon': grid_lon
              };
            }

            function getLatLonFromGrid(gridsquaresize, lat_min, lon_min, grid) {
              var lat = gridsquaresize.lat / 2 + lat_min + grid.grid_lat * gridsquaresize.lat;
              var lon = gridsquaresize.lon / 2 + lon_min + grid.grid_lon * gridsquaresize.lon;
              return {
                'lat': lat,
                'lon': lon
              };
            }

            var values_grid = Array.from(Array(dim_x), function () {
              return new Array(dim_y);
            });

            for (var i = 0; i < lats.length; i++) {
              var position_grid = getGridFromLatLon({
                'lat': gridsquaresize_lat,
                'lon': gridsquaresize_lon
              }, lat_min, lon_min, lats[i][0], lons[i][0]);
              var grid_latlon = getLatLonFromGrid({
                'lat': gridsquaresize_lat,
                'lon': gridsquaresize_lon
              }, lat_min, lon_min, position_grid); // console.log(position_grid.grid_lat, position_grid.grid_lon);

              if (values_grid[position_grid.grid_lat][position_grid.grid_lon] === undefined) {
                values_grid[position_grid.grid_lat][position_grid.grid_lon] = Array();
              }

              values_grid[position_grid.grid_lat][position_grid.grid_lon].push(values[i][0]); // L.marker([grid_latlon.lat, grid_latlon.lon]).addTo(this.leafMap);
            }

            for (var i = 0; i < this.jigsaw.length; i++) {
              this.leafMap.removeLayer(this.jigsaw[i]);
            }

            for (var i = 0; i < values_grid.length; i++) {
              for (var j = 0; j < values_grid[i].length; j++) {
                var allvalues = values_grid[i][j];

                if (allvalues !== undefined) {
                  var sum = allvalues.reduce(function (a, b) {
                    return a + b;
                  });
                  var avg = sum / allvalues.length;
                  var grid_latlon = getLatLonFromGrid({
                    'lat': gridsquaresize_lat,
                    'lon': gridsquaresize_lon
                  }, lat_min, lon_min, {
                    'grid_lat': i,
                    'grid_lon': j
                  });
                  grid_latlon.lat -= gridsquaresize_lat / 2;
                  grid_latlon.lon -= gridsquaresize_lon / 2; // Only fill square if more than 4 values

                  if (allvalues.length > 4) {
                    var latlngs = [[grid_latlon.lat, grid_latlon.lon], [grid_latlon.lat + gridsquaresize_lat, grid_latlon.lon + gridsquaresize_lon]];
                    var rectOptions = {
                      color: 'red',
                      fillOpacity: 0.8,
                      weight: 0
                    };
                    var rectangle = L.rectangle(latlngs, rectOptions).addTo(this.leafMap);
                    this.jigsaw.push(rectangle);
                  }
                }
              }
            }

            this.addDataToMap();
          }
        }, {
          key: "onDataSnapshotLoad",
          value: function onDataSnapshotLoad(snapshotData) {
            log("onSnapshotLoad");
            this.onDataReceived(snapshotData);
          }
        }]);

        return JigsawCtrl;
      }(MetricsPanelCtrl));

      JigsawCtrl.templateUrl = 'partials/module.html';
    }
  };
});
//# sourceMappingURL=jigsaw_ctrl.js.map
