import React, {useRef, useEffect, useState} from "react";
import L from "leaflet";
import Slider from "./Slider";

export default function GeojsonLayer({db_name}) {
    const mapRef = useRef(null);
    const geojsonlayerRef = useRef(null);
    const [data, setData] = useState([]);
    const [startSimulation, setStartSimulation] = useState(false);
    const [timez, setTimez] = useState("1970-01-01 7:00:00");
    const [limit, setLimit] = useState(200)
    const [intervalTime, setIntervalTime] = useState(null)
    const [tileLayer, setTileLayer] = useState(null)
    const [timestamp, setTimestamp] = useState(25200)
    const [minMaxTimestamp, setMinMaxTimestamp] = useState([0, 86000])
    const [fetching, setFetching] = useState(false)
    const [currentTime, setCurrentTime] = useState(Date.now())
    const [fps, setFps] = useState(0)
    const [startTime, setStartTime] = useState(Date.now())
    const [averageFps, setAverageFps] = useState(0)
    const [updateCount, setUpdateCount] = useState(0)

    function clean_data(data) {
        if ('datetimes' in data[0][0]) {
            data.forEach((item) => {
                item[0].datetimes = item[0].datetimes.map((time) => {
                    time = time + ":00"
                    return Date.parse(time)/1000;
                })
            })
}
        else {
            data.forEach((item) => {
                item[0].datetimes = item[0].sequences[0].datetimes.map((time) => {
                    time = time + ":00"
                    return Date.parse(time)/1000;
                })
                item[0].coordinates = item[0].sequences[0].coordinates
            })
        }
        return data;
    }

    useEffect(() => {
        const map = L.map("map").setView([50.5, 4], 8);
        const tilelayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);
        setTileLayer(tilelayer);
        mapRef.current = map;
        geojsonlayerRef.current = new L.LayerGroup().addTo(map);

        fetch(`http://192.168.0.171:8000/minmaxts?db_name=${db_name}`)
            .then((response) => response.json())
            .then((data) => {
                console.log(data)
                setMinMaxTimestamp([data.min, data.max]);
                setTimestamp(data.min)
            }
        );




        return () => {
            map.remove();
        }
    }, []);

    useEffect(() => {
        process_data();
    }, [data]);


    useEffect(() => {
            const UPDATE_PER_SECOND = 75;
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

    function updateTimez() {
        const SECOND_PER_UPDATE = 10;
        setTimestamp((timestamp) => {
            if (timestamp >= minMaxTimestamp[1]) {
                return minMaxTimestamp[0]
            }
            else {
                var nextTimestamp = timestamp + SECOND_PER_UPDATE
                setTimez(new Date(nextTimestamp*1000).toISOString().substr(0, 19).replace('T', ' '))
                return timestamp + SECOND_PER_UPDATE
            }});
    }

    function process_data() {
        geojsonlayerRef.current.clearLayers();
        data.forEach((item) => {
            const currentItem = item[0]
            const times = currentItem.datetimes;
            const geom = currentItem.coordinates;
            let coordinates = [];
            if (times.includes(timestamp)) {
                coordinates = currentItem.coordinates[times.indexOf(timestamp)];
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
                if (geom.length>1){
                    var x = geom[previous][0] + factor * (geom[previous + 1][0] - geom[previous][0]);
                    var y = geom[previous][1] + factor * (geom[previous + 1][1] - geom[previous][1]);
                } else {
                    var x = geom[0][0];
                    var y = geom[0][1];
                }
                coordinates = [x, y];
            }

            L.circle([coordinates[1], coordinates[0]], {
                color: "black",
                fillColor: "black",
                fillOpacity: 1,
                radius: 10,
            }).addTo(geojsonlayerRef.current);
        })
    }

    useEffect(() => {
        setTimez(new Date(timestamp*1000).toISOString().substr(0, 19).replace('T', ' '))
    }, [timestamp])

    async function extracted(fetching) {
        if (!fetching && data.length > 0) {
            setFetching(true)
            process_data()

            const now = Date.now()
            setFps(Math.round(1000 / (now - currentTime)))
            setCurrentTime(now)
            setUpdateCount((updateCount) => updateCount + 1)
            setFetching(false)
        }
    }

    useEffect(() => {
        if (startSimulation) {
            setAverageFps(Math.round(updateCount / (Date.now() - startTime) * 1000))
            extracted(fetching);
        }
    }, [timez, startSimulation, limit,  fetching]);

    useEffect(() => {
        setFetching(true)
        fetch(`http://192.168.0.171:8000/geojson?limit=${limit}&db_name=${db_name}`).then((res) => res.json()).then((data) => {
            data = clean_data(data);
            setData(data);
            setFetching(false)
        });
    }, [limit])

    useEffect(() => {
        if (startSimulation) {
            setUpdateCount(0)
            setStartTime(Date.now())
        } else {
            setAverageFps(Math.round(updateCount / (Date.now() - startTime) * 1000))
        }
    }, [startSimulation]);


    return (
        <div style={{height: '100%', width: '100%', position: 'relative'}}>
            <h1>GeoJSON</h1>
            <div id="map" style={{height: "75%", position: 'relative'}}></div>
            <div className={'param-container'}>
                <div>
                <div className={`button `+ (startSimulation ? 'start' : 'stop')} onClick={() => setStartSimulation(!startSimulation)}>Start/Stop</div>
                <div className={'button'} onClick={() => {
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
                <input type={"number"} value={limit} onChange={(e) => setLimit(e.target.value)} step={100}/>
</div>
                <div>

                <div>{fps}</div>
                <div>Average fps: {averageFps}</div>
                    </div>
            </div>
        </div>)


}