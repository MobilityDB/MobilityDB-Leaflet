import React, {useEffect, useRef, useState} from "react";
import L from "leaflet";
import "leaflet.vectorgrid";
import {VectorTile} from 'vector-tile';
import Pbf from "pbf";


L.CustomVectorGrid = L.VectorGrid.Protobuf.extend({

    setTimestamp: function (timestamp) {
        this._timestamp = timestamp;
        this.redraw();
    },


    initialize: function (url, timestamp, options) {
        this._jsons = {};
        this._timestamp = timestamp;
        L.VectorGrid.Protobuf.prototype.initialize.call(this, url, options);
    },
    setUrl: function(url, noRedraw) {
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
                feat.properties.radius = z/3;

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
// 			z: this._getZoomForUrl()	/// TODO: Maybe replicate TileLayer's maxNativeZoom
        };
        if (this._map && !this._map.options.crs.infinite) {
            var invertedY = this._globalTileRange.max.y - coords.y;
            if (this.options.tms) { // Should this option be available in Leaflet.VectorGrid?
                data['y'] = invertedY;
            }
            data['-y'] = invertedY;
        }

        var tileUrl = L.Util.template(this._url, L.extend(data, this.options));
        const timestamp = this._timestamp;
        var _this = this;
        if (this._jsons[this._tileCoordsToKey(coords)] === undefined) {

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
// 						console.log(pbf);

                            return resolve(new VectorTile(pbf));

                        });
                        reader.readAsArrayBuffer(blob);
                    });
                });
            }).then(function (json) {
// 			console.log('Vector tile water:', json.layers.water);	// Instance of VectorTileLayer

                // Normalize feature getters into actual instanced features
                _this.extract_geom(json, timestamp, data.z);
                _this._jsons[_this._tileCoordsToKey(coords)] = json;

                console.log('Vector tile load time:', Date.now() - t, 'ms');
                return json;
            });
        } else {
            return new Promise(function (resolve) {
                const res = _this.extract_geom(_this._jsons[_this._tileCoordsToKey(coords)], timestamp, data.z)
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
    const [timez, setTimez] = useState("1970-01-01 7:00:00");
    const [limit, setLimit] = useState(100)
    const [currentTime, setCurrentTime] = useState(Date.now())
    const [fps, setFps] = useState(0)
    const [startTime, setStartTime] = useState(Date.now())
    const [averageFps, setAverageFps] = useState(0)
    const [updateCount, setUpdateCount] = useState(0)
    const [intervalTime, setIntervalTime] = useState(null)
    const [timestamp, setTimestamp] = useState(25200)

    const options = {
        opacity: 1,
        rendererFactory: L.canvas.tile,

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
        bounds: L.latLngBounds(L.latLng(49.5, 2.5), L.latLng(51.51, 6.4)),
    }

    useEffect(() => {
        const map = L.map("map", {
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
            options
        ).addTo(map);


        return () => {
            map.remove();
        };
    }, []);

    function updateTimez() {
        setTimez((timez) => {
            const date = new Date(timez);
            date.setSeconds(date.getSeconds() + 10);
            date.setHours(date.getHours() + 1);
            if (date.getHours() >= 23) {
                date.setMinutes(0);
                date.setHours(7);
            }
            return date.toISOString().slice(0, 19).replace("T", " ");
        });
        setTimestamp((timestamp) => timestamp + 10);
    }

    useEffect(() => {
            const UPDATE_PER_SECOND = 24;
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
        <div style={{height: "100%", position: "relative"}}>
            <div id="map" style={{height: "75%", position: "relative"}}></div>
            <button onClick={() => setStartSimulation(!startSimulation)}>
                start simulation
            </button>
            <button onClick={() => {
                setTimez("1970-01-01 7:00:00");
                setTimestamp(25200)
            }}>
                reset time
            </button>
            <input type='number' value={limit} onChange={(e) => setLimit(e.target.value)}/>
            <div>{timez}</div>
            <div>{fps}</div>
            <div>Average fps: {averageFps}</div>
        </div>
    );
}