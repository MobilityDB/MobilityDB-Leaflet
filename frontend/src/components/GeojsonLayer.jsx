import React, { useRef, useEffect, useState } from "react";
import L from "leaflet";

export default function GeojsonLayer() {
    const mapRef = useRef(null);
    const [startSimulation, setStartSimulation] = useState(false);
    const [timez, setTimez] = useState("1970-01-01 7:00:00");
    const [geojsonLayer, setGeojsonLayer] = useState(null);
    const [limit, setLimit] = useState(200)
    const [intervalTime, setIntervalTime] = useState(null)
    const [tileLayer, setTileLayer] = useState(null)
    const [fetching, setFetching] = useState(false)
    const [currentTime, setCurrentTime] = useState(Date.now())
    const [fps, setFps] = useState(0)
    const [startTime, setStartTime] = useState(Date.now())
    const [averageFps, setAverageFps] = useState(0)
    const [updateCount, setUpdateCount] = useState(0)

    useEffect(() => {
        const map = L.map("map").setView([50.5, 4], 8);
        const tilelayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
            'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 18,
        }).addTo(map);
        setTileLayer(tilelayer);
        mapRef.current = map;
        fetch(`http://127.0.0.1:8000/geojson?limit=${limit}&timez=${timez}`).then((response) => response.json()).then((data) => {
            const geojsonLayer = L.vectorGrid.slicer(data, {
                vectorTileLayerStyles: {
                    sliced: {
                        radius: 2,
                        weight: 2,
                        fill: true,
                        fillColor: "black",
                        fillOpacity: 1,
                        color: "black",

                    }
                }
            }).addTo(mapRef.current);
            setGeojsonLayer(geojsonLayer);
        });

        return () => {
            map.remove();
        }
    }, []);


      useEffect(() => {
    const UPDATE_PER_SECOND = 24;
    if (startSimulation) {
      const interval = setInterval(() => {
          updateTimez();
        }, 1000/UPDATE_PER_SECOND);
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
        setTimez((timez) => {
        const date = new Date(timez);
        date.setSeconds(date.getSeconds() + 5);
        return date.toISOString();
        });
    }

  async function removeLayer(tmp, updateTime) {
    tmp.remove()
    const now = Date.now()
    setFps(Math.round(1000/(now-currentTime)))
    setCurrentTime(now)
    setUpdateCount((updateCount)=>updateCount+1)
  }

  async function removeLayers(tmp) {
    console.log(tmp)
    const now = Date.now()
    setFps(Math.round(1000/(now-currentTime)))
    setCurrentTime(now)
          setUpdateCount((updateCount) => updateCount + 1)
          mapRef.current.eachLayer((layer) => {
              if (layer !== tileLayer && layer !== tmp) {
                  layer.remove()
              }
          })
  }

      async function extracted(currentGeojsonLayer, fetching) {
        if (!fetching) {
            setFetching(true)
            fetch(`http://127.0.0.1:8000/geojson?limit=${limit}&timez=${timez}`).then((response) => response.json()).then((data) => {
                const geojsonLayer =  L.vectorGrid.slicer(data, {
                vectorTileLayerStyles: {
                    sliced: {
                        radius: 2,
                        weight: 2,
                        fill: true,
                        fillColor: "black",
                        fillOpacity: 1,
                        color: "black",

                    }
                }
            }).addEventListener('load', () => removeLayers(geojsonLayer)).addTo(mapRef.current);
                setGeojsonLayer(geojsonLayer);
            })
            setFetching(false)
        }
  }

     useEffect(() => {
    if (startSimulation) {
        setAverageFps(Math.round(updateCount/(Date.now()-startTime)*1000))
      extracted(geojsonLayer, fetching);
    }
  }, [timez, startSimulation, limit, geojsonLayer, fetching]);

      useEffect(() => {
    if (startSimulation) {
      setUpdateCount(0)
      setStartTime(Date.now())
    } else {
      setAverageFps(Math.round(updateCount/(Date.now()-startTime)*1000))
    }
  }, [startSimulation]);

    return (
        <div style={{height: '100%', position: 'relative'}}>
            <div id="map" style={{ height: "75%", position: 'relative' }}></div>
            <div>{timez}</div>
            <input type={"number"} value={limit} onChange={(e) => setLimit(e.target.value)} step={100} />
            <button onClick={() => setStartSimulation(!startSimulation)}>Start/Stop</button>
            <button onClick={() => setTimez('1970-01-01 7:00:00')}>Reset timez</button>
      <div>{fps}</div>
      <div>Average fps: {averageFps}</div>
        </div>)


}