import React, {useEffect, useRef, useState} from "react";
import L from "leaflet";
import "leaflet.vectorgrid";

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

    const options = {
            opacity: 1,
            rendererFactory: L.canvas.tile,
            vectorTileLayerStyles: {
                reduced: function (properties, zoom) {
                    return {
                        radius: 2,
                        weight: 2,
                        fill: true,
                        fillColor: "black" ,
                        fillOpacity: 1,
                        color: "black" ,
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



        vectorTileLayerRef.current = L.vectorGrid.protobuf(
            `http://192.168.0.171:8000/vectorTiles/{z}/{x}/{y}?limit=${limit}&timez=${timez}`,
            options
        );


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
            setIsUpdating(true)
            const newLayer = new L.vectorGrid.protobuf(`http://192.168.0.171:8000/vectorTiles/{z}/{x}/{y}?limit=${limit}&timez=${timez}`,  options);
            newLayer.once('load', () => {
                const tmp = vectorTileLayerRef.current
                vectorTileLayerRef.current = newLayer;
                setIsUpdating(false)
                setTimeout(()=>{tmp.remove()}, 30*(limit/100));
            });
            newLayer.addTo(mapRef.current);

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
    }, [timez, startSimulation, limit]);

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
            <div id="map" style={{height: "50%", position: "relative"}}></div>
            <button onClick={() => setStartSimulation(!startSimulation)}>
                start simulation
            </button>
            <button onClick={() => setTimez("1970-01-01 7:00:00")}>
                reset time
            </button>
            <input type='number' value={limit} onChange={(e) => setLimit(e.target.value)}/>
            <div>{timez}</div>
            <div>{fps}</div>
            <div>Average fps: {averageFps}</div>
        </div>
    );
}