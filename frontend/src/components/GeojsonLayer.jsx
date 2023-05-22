import React, {useRef, useEffect, useState} from "react";
import L from "leaflet";

export default function GeojsonLayer() {
    const mapRef = useRef(null);
    const geojsonlayerRef = useRef(null);
    const [data, setData] = useState([]);
    const [startSimulation, setStartSimulation] = useState(false);
    const [timez, setTimez] = useState("1970-01-01 7:00:00");
    const [limit, setLimit] = useState(200)
    const [intervalTime, setIntervalTime] = useState(null)
    const [tileLayer, setTileLayer] = useState(null)
    const [timestamp, setTimestamp] = useState(25200)
    const [fetching, setFetching] = useState(false)
    const [currentTime, setCurrentTime] = useState(Date.now())
    const [fps, setFps] = useState(0)
    const [startTime, setStartTime] = useState(Date.now())
    const [averageFps, setAverageFps] = useState(0)
    const [updateCount, setUpdateCount] = useState(0)

    function clean_data(data) {
        data.forEach((item) => {
            item[0].datetimes = item[0].datetimes.map((time) => {
                time = time + ":00"
                return Date.parse(time)/1000;
            })
        })
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
        L.circle([50,4]).addTo(geojsonlayerRef.current);




        return () => {
            map.remove();
        }
    }, []);

    useEffect(() => {
        process_data();
    }, [data]);


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

    function updateTimez() {
        const SECONDS_PER_UPDATE = 5;
        setTimez((timez) => {
            const date = new Date(timez);
            date.setSeconds(date.getSeconds() + SECONDS_PER_UPDATE);
            return date.toISOString();
        });
        setTimestamp((timestamp) => timestamp + SECONDS_PER_UPDATE)
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
                var x = geom[previous][0] + factor * (geom[previous + 1][0] - geom[previous][0]);
                var y = geom[previous][1] + factor * (geom[previous + 1][1] - geom[previous][1]);
                coordinates = [x, y];
            }

            L.circle([coordinates[1], coordinates[0]], {
                color: "red",
                fillColor: "#f03",
                fillOpacity: 0.5,
            }).addTo(geojsonlayerRef.current);
        })
    }

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
        fetch(`http://localhost:8000/geojson?limit=${limit}`).then((res) => res.json()).then((data) => {
            console.log("data fetched")
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
        <div style={{height: '100%', position: 'relative'}}>
            <div id="map" style={{height: "75%", position: 'relative'}}></div>
            <div>{timez}</div>
            <input type={"number"} value={limit} onChange={(e) => setLimit(e.target.value)} step={100}/>
            <button onClick={() => setStartSimulation(!startSimulation)}>Start/Stop</button>
            <button onClick={() => {
                setTimez("1970-01-01 7:00:00");
                setTimestamp(25200)
            }}>
                reset time
            </button>
            <div>{fps}</div>
            <div>Average fps: {averageFps}</div>
        </div>)


}