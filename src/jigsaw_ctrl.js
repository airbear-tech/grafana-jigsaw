import L from './leaflet/leaflet.js';
import heatLayer from './leaflet/leaflet-heat.js';

import moment from 'moment';

import appEvents from 'app/core/app_events';
import {MetricsPanelCtrl} from 'app/plugins/sdk';

import './leaflet/leaflet.css!';
import './partials/module.css!';

const panelDefaults = {
  maxDataPoints: 500,
  autoZoom: true,
  scrollWheelZoom: false,
  defaultLayer: 'OpenStreetMap',
  lineColor: '#ffff',
  pointColor: 'royalblue',
}

function log(msg) {
  // uncomment for debugging
  //console.log(msg);
}

export class JigsawCtrl extends MetricsPanelCtrl {
  constructor($scope, $injector) {
    super($scope, $injector);

    log("constructor");

    _.defaults(this.panel, panelDefaults);

    // Save layers globally in order to use them in options
    this.layers = {
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
          maxZoom: 20,
        })
      })
    };

    this.timeSrv = $injector.get('timeSrv');
    this.coords = [];
    this.leafMap = null;
    this.polyline = null;
    this.hoverMarker = null;
    this.hoverTarget = null;
    this.setSizePromise = null;

    // Panel events
    this.events.on('panel-initialized', this.onInitialized.bind(this));
    this.events.on('view-mode-changed', this.onViewModeChanged.bind(this));
    this.events.on('init-edit-mode', this.onInitEditMode.bind(this));
    this.events.on('panel-teardown', this.onPanelTeardown.bind(this));
    this.events.on('panel-size-changed', this.onPanelSizeChanged.bind(this));
    this.events.on('data-received', this.onDataReceived.bind(this));
    this.events.on('data-snapshot-load', this.onDataSnapshotLoad.bind(this));

    // Global events
    appEvents.on('graph-hover', this.onPanelHover.bind(this));
    appEvents.on('graph-hover-clear', this.onPanelClear.bind(this));
  }

  onInitialized(){
    log("onInitialized");
    this.render();
  }

  onInitEditMode() {
    log("onInitEditMode");
    this.addEditorTab('Options', 'public/plugins/grafana-jigsaw-panel/partials/options.html', 2);
  }

  onPanelTeardown() {
    log("onPanelTeardown");
    this.$timeout.cancel(this.setSizePromise);
  }

  onPanelHover(evt) {
    log("onPanelHover");
    if (this.coords.length === 0) {
      return;
    }

    // check if we are already showing the correct hoverMarker
    let target = Math.floor(evt.pos.x);
    if (this.hoverTarget && this.hoverTarget === target) {
      return;
    }

    // check for initial show of the marker
    if (this.hoverTarget == null){
      this.hoverMarker.addTo(this.leafMap);
    }

    this.hoverTarget = target;

    // Find the currently selected time and move the hoverMarker to it
    // Note that an exact match isn't always going to work due to rounding so
    // we clean that up later (still more efficient)
    let min = 0;
    let max = this.coords.length - 1;
    let idx = null;
    let exact = false;
    while (min <= max) {
      idx = Math.floor((max + min) / 2);
      if (this.coords[idx].timestamp === this.hoverTarget) {
        exact = true;
        break;
      }
      else if (this.coords[idx].timestamp < this.hoverTarget) {
        min = idx + 1;
      }
      else {
        max = idx - 1;
      }
    }

    // Correct the case where we are +1 index off
    if (!exact && idx > 0 && this.coords[idx].timestamp > this.hoverTarget) {
      idx--;
    }
    this.hoverMarker.setLatLng(this.coords[idx].position);
  }

  onPanelClear(evt) {
    log("onPanelClear");
    // clear the highlighted circle
    this.hoverTarget = null;
    if (this.hoverMarker) {
      this.hoverMarker.removeFrom(this.leafMap);
    }
  }

  onViewModeChanged(){
    log("onViewModeChanged");
    // KLUDGE: When the view mode is changed, panel resize events are not
    //         emitted even if the panel was resized. Work around this by telling
    //         the panel it's been resized whenever the view mode changes.
    this.onPanelSizeChanged();
  }

  onPanelSizeChanged() {
    log("onPanelSizeChanged");
    // KLUDGE: This event is fired too soon - we need to delay doing the actual
    //         size invalidation until after the panel has actually been resized.
    this.$timeout.cancel(this.setSizePromise);
    let map = this.leafMap;
    this.setSizePromise = this.$timeout(function(){
      if (map) {
        log("Invalidating map size");
        map.invalidateSize(true);
      }}, 500
    );
  }

  applyScrollZoom() {
    let enabled = this.leafMap.scrollWheelZoom.enabled();
    if (enabled != this.panel.scrollWheelZoom){
      if (enabled){
        this.leafMap.scrollWheelZoom.disable();
      }
      else{
        this.leafMap.scrollWheelZoom.enable();
      }
    }
  }

  applyDefaultLayer() {
    let hadMap = Boolean(this.leafMap);
    this.setupMap();
    // Only need to re-add layers if the map previously existed
    if (hadMap){
      this.leafMap.eachLayer((layer) => {
        layer.removeFrom(this.leafMap);
      });
      this.layers[this.panel.defaultLayer].addTo(this.leafMap);
    }
    this.addDataToMap();
  }

  setupMap() {
    log("setupMap");
    // Create the map or get it back in a clean state if it already exists
    if (this.leafMap) {
      if (this.polyline) {
        this.polyline.removeFrom(this.leafMap);
      }
      this.onPanelClear();
      return;
    }

    // Create the map
    this.leafMap = L.map('jigsaw-' + this.panel.id, {
      scrollWheelZoom: this.panel.scrollWheelZoom,
      zoomSnap: 0.5,
      zoomDelta: 1,
    });

    // Add layers to the control widget
    L.control.layers(this.layers).addTo(this.leafMap);

    // Add default layer to map
    this.layers[this.panel.defaultLayer].addTo(this.leafMap);

    // Initialize jigsaw array
    this.jigsaw = Array();

    // Hover marker
    this.hoverMarker = L.circleMarker(L.latLng(0, 0), {
      color: 'white',
      fillColor: this.panel.pointColor,
      fillOpacity: 1,
      weight: 2,
      radius: 7
    });

    // Events
    this.leafMap.on('baselayerchange', this.mapBaseLayerChange.bind(this));
    this.leafMap.on('boxzoomend', this.mapZoomToBox.bind(this));
  }

  mapBaseLayerChange(e) {
    // If a tileLayer has a 'forcedOverlay' attribute, always enable/disable it
    // along with the layer
    if (this.leafMap.forcedOverlay) {
      this.leafMap.forcedOverlay.removeFrom(this.leafMap);
      this.leafMap.forcedOverlay = null;
    }
    let overlay = e.layer.options.forcedOverlay;
    if (overlay) {
      overlay.addTo(this.leafMap);
      overlay.setZIndex(e.layer.options.zIndex + 1);
      this.leafMap.forcedOverlay = overlay;
    }
  }

  mapZoomToBox(e) {
    log("mapZoomToBox");
    // Find time bounds of selected coordinates
    const bounds = this.coords.reduce(
      function(t, c) {
        if (e.boxZoomBounds.contains(c.position)) {
          t.from = Math.min(t.from, c.timestamp);
          t.to = Math.max(t.to, c.timestamp);
        }
        return t;
      },
      {from: Infinity, to: -Infinity}
    );

    // Set the global time range
    if (isFinite(bounds.from) && isFinite(bounds.to)) {
      // KLUDGE: Create moment objects here to avoid a TypeError that
      //         occurs when Grafana processes normal numbers
      this.timeSrv.setTime({
        from: moment.utc(bounds.from),
        to: moment.utc(bounds.to)
      });
    }
  }

  // Add the circles and polyline to the map
  addDataToMap() {
    log("addDataToMap");
    this.polyline = L.polyline(
      this.coords.map(x => x.position, this), {
        color: this.panel.lineColor,
        weight: 3,
      }
    ).addTo(this.leafMap);

    this.zoomToFit();
  }

  zoomToFit(){
    log("zoomToFit");
    if (this.panel.autoZoom && this.polyline){
      this.leafMap.fitBounds(this.polyline.getBounds());
    }
    this.render();
  }

  refreshColors() {
    log("refreshColors");
    if (this.polyline) {
      this.polyline.setStyle({
        color: this.panel.lineColor
      });
    }
    if (this.hoverMarker){
      this.hoverMarker.setStyle({
        fillColor: this.panel.pointColor,
      });
    }
    this.render();
  }

  onDataReceived(data) {
    log("onDataReceived");
    this.setupMap();

    if (data.length === 0) {
      // No data or incorrect data, show a world map and abort
      this.leafMap.setView([0, 0], 1);
      return;
    }

    // Asumption is that there are an equal number of properly matched timestamps
    // TODO: proper joining by timestamp?
    this.coords.length = 0;
    const lats = data[0].datapoints;
    const lons = data[1].datapoints;
    const values = data[2].datapoints;

    // Get min/max lat/lon

    var lat_min = lats[0][0];
    var lat_max = lats[0][0];
    var lon_min = lons[0][0];
    var lon_max = lons[0][0];

    for (let i = 0; i < lats.length; i++) {
      if (lats[i][0] == null || lons[i][0] == null ||
          lats[i][1] !== lons[i][1]) {
        continue;
      }

      if (lat_min > lats[i][0]) lat_min = lats[i][0];
      if (lat_max < lats[i][0]) lat_max = lats[i][0];
      if (lon_min > lons[i][0]) lon_min = lons[i][0];
      if (lon_max < lons[i][0]) lon_max = lons[i][0];

      this.coords.push({
        position: L.latLng(lats[i][0], lons[i][0]),
        timestamp: lats[i][1]
      });
    }

    // Build data grid and populate with average values

    var gridsquaresize_lat = 0.0014;
    var gridsquaresize_lon = 0.002;
    var gridsquarehalfsize_lat = gridsquaresize_lat / 2;
    var gridsquarehalfsize_lon = gridsquaresize_lon / 2;

    lat_min = parseInt((lat_min - gridsquarehalfsize_lat) / gridsquaresize_lat) * gridsquaresize_lat;
    lat_max = parseInt((lat_max + gridsquarehalfsize_lat) / gridsquaresize_lat) * gridsquaresize_lat;
    lon_min = parseInt((lon_min - gridsquarehalfsize_lon) / gridsquaresize_lon) * gridsquaresize_lon;
    lon_max = parseInt((lon_max + gridsquarehalfsize_lon) / gridsquaresize_lon) * gridsquaresize_lon;

    var dim_x = parseInt((lat_max - lat_min) / gridsquaresize_lat) + 2;
    var dim_y = parseInt((lon_max - lon_min) / gridsquaresize_lon) + 2;

    // console.log(lat_min, lat_max, lon_min, lon_max);

    function getGridFromLatLon(gridsquaresize, lat_min, lon_min, lat, lon)
    {
      var grid_lat = parseInt((lat - lat_min) / gridsquaresize.lat);
      var grid_lon = parseInt((lon - lon_min) / gridsquaresize.lon);
  
      return {'grid_lat': grid_lat, 'grid_lon': grid_lon};
    }

    function getLatLonFromGrid(gridsquaresize, lat_min, lon_min, grid)
    {
      var lat = ((gridsquaresize.lat / 2) + lat_min + (grid.grid_lat * gridsquaresize.lat));
      var lon = ((gridsquaresize.lon / 2) + lon_min + (grid.grid_lon * gridsquaresize.lon));

      return {'lat': lat, 'lon': lon};
    }

    var values_grid = Array.from(Array(dim_x), () => new Array(dim_y));

    for (var i = 0; i < lats.length; i++) {
      var position_grid = getGridFromLatLon({'lat': gridsquaresize_lat, 'lon': gridsquaresize_lon}, lat_min, lon_min, lats[i][0], lons[i][0]);
      var grid_latlon = getLatLonFromGrid({'lat': gridsquaresize_lat, 'lon': gridsquaresize_lon}, lat_min, lon_min, position_grid);

      // console.log(position_grid.grid_lat, position_grid.grid_lon);

      if (values_grid[position_grid.grid_lat][position_grid.grid_lon] === undefined)
      {
        values_grid[position_grid.grid_lat][position_grid.grid_lon] = Array();
      }

      values_grid[position_grid.grid_lat][position_grid.grid_lon].push(values[i][0]);

      // L.marker([grid_latlon.lat, grid_latlon.lon]).addTo(this.leafMap);
    }

    for(var i = 0; i < this.jigsaw.length; i++)
    {
      this.leafMap.removeLayer(this.jigsaw[i]);
    }

    for(var i = 0; i < values_grid.length; i++)
    {
      for(var j = 0; j < values_grid[i].length; j++)
      {
        var allvalues = values_grid[i][j];

        if (allvalues !== undefined)
        {
          var sum = allvalues.reduce(function(a, b) { return a + b; });
          var avg = sum / allvalues.length;

          var grid_latlon = getLatLonFromGrid({'lat': gridsquaresize_lat, 'lon': gridsquaresize_lon}, lat_min, lon_min, {'grid_lat': i, 'grid_lon': j});
          grid_latlon.lat -= (gridsquaresize_lat / 2);
          grid_latlon.lon -= (gridsquaresize_lon / 2);

          // Only fill square if more than 4 values
          if (allvalues.length > 4)
          {
            var latlngs = [[grid_latlon.lat, grid_latlon.lon], [grid_latlon.lat + gridsquaresize_lat, grid_latlon.lon + gridsquaresize_lon]];
            var rectOptions = {color: 'red', fillOpacity: 0.8, weight: 0}
            var rectangle = L.rectangle(latlngs, rectOptions).addTo(this.leafMap);
            this.jigsaw.push(rectangle);
          }
        }
      }
    }
    
    this.addDataToMap();
  }

  onDataSnapshotLoad(snapshotData) {
    log("onSnapshotLoad");
    this.onDataReceived(snapshotData);
  }
}

JigsawCtrl.templateUrl = 'partials/module.html';
