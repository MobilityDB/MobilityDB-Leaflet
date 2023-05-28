import React, {useEffect, useRef, useState} from "react";
import L from "leaflet";
import "leaflet.vectorgrid";
import {VectorTile} from 'vector-tile';
import Pbf from "pbf";
import Slider from "./Slider";


L.CustomVectorGrid = L.VectorGrid.Protobuf.extend({

  setTimestamp: function (timestamp) {
    this._timestamp = timestamp;
    this.redraw();
  },
  clearCache: function () {
    this._jsons = {};
    this.redraw();
  },
  initialize: function (url, timestamp, cachedWindowSize, cacheWindowSetter, options) {
    this._jsons = {};
    this._cachedWindowSetter = cacheWindowSetter;
    this.cacheWindowSize = cachedWindowSize;
    this._timestamp = timestamp;
    L.VectorGrid.Protobuf.prototype.initialize.call(this, url, options);
  },
  checkCache(z) {
    let testTimestamp = false;
    let cachedKeys = Object.keys(this._jsons);
    let cachedJson = cachedKeys.filter((key) => this._jsons[key].cached);
    this._cachedWindowSetter(cachedJson.length);
    if (cachedJson.length >= this.cacheWindowSize) {
      let deleteOptions = cachedJson.filter((key) => this._keyToTileCoords(key).z !== z);
      if (deleteOptions.length === 0) {
        deleteOptions = cachedJson;
        testTimestamp = true
      }
      let deleteJson = null;
      let tmpUses = Number.POSITIVE_INFINITY;
      for (let key of deleteOptions) {
        let toTest = this._jsons[key].uses;
        if (testTimestamp) {
          toTest = this._jsons[key].lastTimestamp;
        }
        if (toTest < tmpUses) {
          tmpUses = toTest;
          deleteJson = this._jsons[key];
        }
      }
      deleteJson.cached = false;
      deleteJson.json = null;
    }
  },
  setUrl: function (url, noRedraw) {
    this._url = url;

    if (!noRedraw) {
      this._jsons = {};
      this.redraw();
    }
    return this;
  },

  extract_geom: function (json, timestamp, z) {
    for (var layerName in json.layers) {
      var feats = [];

      for (var i = 0; i < json.layers[layerName].length; i++) {
        var times = json.layers[layerName].feature(i).properties.times;
        times = times.slice(1, -1).split(',').map(Number);
        var geom = json.layers[layerName].feature(i).loadGeometry();
        // if geom is a list of list, concat it
        if (geom[0] instanceof Array) {
          geom = [].concat.apply([], geom);
        }
        var feat = json.layers[layerName].feature(i);
        feat.type = 1
        if (times.includes(timestamp)) {
          feat.geometry = [geom[times.indexOf(timestamp)]];
        } else {
          var previous = 0;
          for (var j = 1; j < times.length; j++) {
            if (times[j] > timestamp) {
              previous = j - 1;
              break;
            }
          }
          // compute the interpolation factor
          var factor = (timestamp - times[previous]) / (times[previous + 1] - times[previous]);
          // compute the interpolated point
          var x = geom[previous].x + factor * (geom[previous + 1].x - geom[previous].x);
          var y = geom[previous].y + factor * (geom[previous + 1].y - geom[previous].y);
          feat.geometry = [{x: x, y: y}];
        }
        feat.properties.radius = z / 3;

        feats.push(feat);
      }
      json.layers[layerName].features = feats;
    }
    return json;
  },
  _getVectorTilePromise: function (coords) {
    var data = {
      s: this._getSubdomain(coords),
      x: coords.x,
      y: coords.y,
      z: coords.z
    };
    if (this._map && !this._map.options.crs.infinite) {
      var invertedY = this._globalTileRange.max.y - coords.y;
      if (this.options.tms) { // Should this option be available in Leaflet.VectorGrid?
        data['y'] = invertedY;
      }
      data['-y'] = invertedY;
    }
    this._currentZ = coords.z;

    var tileUrl = L.Util.template(this._url, L.extend(data, this.options));
    const timestamp = this._timestamp;
    var _this = this;
    if (this._jsons[this._tileCoordsToKey(coords)] === undefined || this._jsons[this._tileCoordsToKey(coords)].cached === false) {
      var t = Date.now();
      return fetch(tileUrl, this.options.fetchOptions).then(function (response) {
        if (!response.ok) {
          return {layers: []};
        }

        return response.blob().then(function (blob) {
          var reader = new FileReader();
          return new Promise(function (resolve) {
            reader.addEventListener("loadend", function () {
              // reader.result contains the contents of blob as a typed array

              // blob.type === 'application/x-protobuf'
              var pbf = new Pbf(reader.result);

              return resolve(new VectorTile(pbf));

            });
            reader.readAsArrayBuffer(blob);
          });
        });
      }).then(function (json) {
        _this.checkCache(data.z)
        // Normalize feature getters into actual instanced features
        _this.extract_geom(json, timestamp, data.z);
        let uses = 1
        if (_this._jsons[_this._tileCoordsToKey(coords)] !== undefined) {
          uses = _this._jsons[_this._tileCoordsToKey(coords)].uses += 1;
        }
        _this._jsons[_this._tileCoordsToKey(coords)] = {json: json, uses: uses, cached: true, lastTimestamp: timestamp};


        return json;
      });
    } else {
      return new Promise(function (resolve) {
        const res = _this.extract_geom(_this._jsons[_this._tileCoordsToKey(coords)].json, timestamp, data.z)
        _this._jsons[_this._tileCoordsToKey(coords)].uses += 1;
        _this._jsons[_this._tileCoordsToKey(coords)].lastTimestamp = timestamp;
        return resolve(res);
      });
    }
  }

});

export default function LVectorGrid() {
  const mapRef = useRef(null);
  const vectorTileLayerRef = useRef(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [startSimulation, setStartSimulation] = useState(false);
  const [cachedWindow, setCachedWindow] = useState(0);
  const [cachedWindowMax, setCachedWindowMax] = useState(10000);
  const [timez, setTimez] = useState("1970-01-01 00:00:00");
  const [limit, setLimit] = useState(200)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [fps, setFps] = useState(0)
  const [startTime, setStartTime] = useState(Date.now())
  const [averageFps, setAverageFps] = useState(0)
  const [updateCount, setUpdateCount] = useState(0)
  const [intervalTime, setIntervalTime] = useState(null)
  const [timestamp, setTimestamp] = useState(0)
  const [minMaxTimestamp, setMinMaxTimestamp] = useState([0, 86000])

  const options = {
    opacity: 1,
    rendererFactory: L.canvas.tile,
    keepBuffer: 2,

    vectorTileLayerStyles: {
      reduced: function (properties, zoom) {
        return {
          radius: properties.radius,
          weight: 2,
          fill: true,
          fillColor: "black",
          fillOpacity: 1,
          color: "black",
        };
      },
    },
  }

  async function extractMinMaxTimestamp() {
    const res = await fetch(`http://192.168.0.171:8000/minmaxts?db_name=ais`).then(res => res.json())
    setMinMaxTimestamp([res.min, res.max])
    setTimestamp(res.min)
  }

  useEffect(() => {
    setTimez(new Date(timestamp * 1000).toISOString().substr(0, 19).replace('T', ' '))
  }, [timestamp])

  useEffect(() => {
    extractMinMaxTimestamp()
    const map = L.map("map_vector_grid", {
      fadeAnimation: false,
    }).setView([50.5, 4], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);


    mapRef.current = map;


    vectorTileLayerRef.current = new L.CustomVectorGrid(
      `http://192.168.0.171:7802/public.tripsfct/{z}/{x}/{y}.pbf`,
      timestamp,
      cachedWindowMax,
      setCachedWindow,
      options
    ).addTo(map); //.addEventListener('load', () => vectorTileLayerRef.current.fetch_next_layer())


    return () => {
      map.remove();
    };
  }, []);

  function updateTimez() {
    const SECOND_PER_UPDATE = 2
    setTimestamp((timestamp) => {
      if (timestamp >= minMaxTimestamp[1]) {
        setTimez(new Date(minMaxTimestamp[0] * 1000).toISOString().substr(0, 19).replace('T', ' '))
        return minMaxTimestamp[0]
      } else {
        var nextTimestamp = timestamp + SECOND_PER_UPDATE
        setTimez(new Date(nextTimestamp * 1000).toISOString().substr(0, 19).replace('T', ' '))
        return timestamp + SECOND_PER_UPDATE
      }
    });
  }

  useEffect(() => {
      const UPDATE_PER_SECOND = 100;
      if (startSimulation) {
        const interval = setInterval(() => {
          updateTimez();
        }, 1000 / UPDATE_PER_SECOND);
        if (intervalTime) {
          clearInterval(intervalTime);
        }
        setIntervalTime(interval);
      } else {
        clearInterval(intervalTime)
      }
    }
    , [startSimulation]);

  async function removeLayer(tmp, updateTime) {
    tmp.remove()
    const now = Date.now()
    setFps(Math.round(1000 / (now - currentTime)))
    setCurrentTime(now)
    setUpdateCount((updateCount) => updateCount + 1)
  }

  async function extracted(updateTime = true) {
    if (!vectorTileLayerRef.current.isLoading() && !isUpdating) {
      vectorTileLayerRef.current.setTimestamp(timestamp);
      const now = Date.now()
      setFps(Math.round(1000 / (now - currentTime)))
      setCurrentTime(now)
      setUpdateCount((updateCount) => updateCount + 1)
    }

  }

  useEffect(() => {
    if (startSimulation) {
      setAverageFps(Math.round(updateCount / (Date.now() - startTime) * 1000))
      extracted(true);
    }
  }, [timez, startSimulation]);

  useEffect(() => {
    vectorTileLayerRef.current.setUrl(`http://192.168.0.171:7802/public.tripsfct/{z}/{x}/{y}.pbf?maxpoints=${limit}`, false)
  }, [limit]);

  useEffect(() => {
    if (startSimulation) {
      setUpdateCount(0)
      setStartTime(Date.now())
    } else {
      setAverageFps(Math.round(updateCount / (Date.now() - startTime) * 1000))
    }
  }, [startSimulation]);

  useEffect(() => {
    if (vectorTileLayerRef.current) {
      extracted(false)
    }
  }, [limit]);

  return (
    <div style={{height: "100%", width: '100%', position: "relative"}}>
      <h1>VectorGrid</h1>
      <div id="map_vector_grid" style={{height: "75%", position: "relative"}}></div>
      <div className={'param-container'}>
        <div>
          <div className={`button `+ (startSimulation ? 'start' : 'stop')} onClick={() => setStartSimulation(!startSimulation)}>
            Start/Stop
          </div>
          <div className={'button'} onClick={() => {
            new Date(minMaxTimestamp[0] * 1000).toISOString().substr(0, 19).replace('T', ' ');
            setTimestamp(minMaxTimestamp[0])
          }}>
            reset time
          </div>
        </div>
        <div>
          <div>{timez}</div>
          <Slider min={minMaxTimestamp[0]} max={minMaxTimestamp[1]} value={timestamp} onChange={(e) => {
            setTimestamp(parseInt(e.target.value))
            setTimez(new Date(e.target.value * 1000).toISOString().slice(0, 19).replace("T", " "))
          }}/>
          <input type='number' value={limit} onChange={(e) => setLimit(e.target.value)}/>
        </div>
        <div>
          <div>{fps}</div>
          <div>Average fps: {averageFps}</div>
        </div>
        <div>
          <div>Cached tiles: {cachedWindow}/{cachedWindowMax}</div>
          <div className={'button'} onClick={() => vectorTileLayerRef.current.clearCache()}>Clear cache</div>
        </div>
      </div>
    </div>
  );
}