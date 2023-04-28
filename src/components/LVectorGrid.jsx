import React, { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet.vectorgrid";
import {remove} from "leaflet/src/dom/DomUtil";

export default function LVectorGrid() {
  const mapRef = useRef(null);
  const [startSimulation, setStartSimulation] = useState(false);
  const [timez, setTimez] = useState("1970-01-01 7:00:00");
  const [vectorTileLayer, setVectorTileLayer] = useState(null);
  const [limit, setLimit] = useState(100)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [fps, setFps] = useState(0)
  const [startTime, setStartTime] = useState(Date.now())
  const [averageFps, setAverageFps] = useState(0)
  const [updateCount, setUpdateCount] = useState(0)

  useEffect(() => {
    const map = L.map("map").setView([50.5, 4], 8);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);


    mapRef.current = map;

    const newLayer = L.vectorGrid.protobuf(
      `http://192.168.0.171:7802/public.get_reduced_tilelayer/{z}/{x}/{y}.pbf?maxpoints=${limit}&timez=${timez}`,
      {
        opacity: 1,
        rendererFactory: L.svg.tile,
        vectorTileLayerStyles: {
          reduced: function (properties, zoom) {
            return {
              radius: 2,
              weight: 2,
              fill: true,
              fillColor: "black",
              fillOpacity: 1,
              color: "black",
            };
          },
        },
      }
    ).addEventListener('loading', ()=>console.log('loading')).addTo(mapRef.current);
    setVectorTileLayer(newLayer);


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

  async function removeLayer(tmp, updateTime) {
    console.log('remove layer')
    const now = Date.now()
    setFps(Math.round(1000/(now-currentTime)))
    setCurrentTime(now)
    setUpdateCount((updateCount)=>updateCount+1)
    setInterval(()=> {tmp.remove()}, 500)
    if (updateTime) updateTimez()
  }

  async function extracted(updateTime = true, vectorTileLayer) {
    if (!vectorTileLayer.isLoading()){
    const newLayer = L.vectorGrid.protobuf(
      `http://192.168.0.171:7802/public.get_reduced_tilelayer/{z}/{x}/{y}.pbf?maxpoints=${limit}&timez=${timez}`,
      {
        opacity: 1,
        rendererFactory: L.canvas.tile,
        vectorTileLayerStyles: {
          reduced: function (properties, zoom) {
            return {
              radius: 2,
              weight: 2,
              fill: true,
              fillColor: "black",
              fillOpacity: 1,
              color: "black",
            };
          },
        },
      }
    ).addTo(mapRef.current).addEventListener('load', ()=>removeLayer(vectorTileLayer, updateTime));
    setVectorTileLayer(newLayer);
    }

  }

  useEffect(() => {
    if (startSimulation) {
      setAverageFps(Math.round(updateCount/(Date.now()-startTime)*1000))
      extracted(true, vectorTileLayer);
    }
  }, [timez, startSimulation, limit, vectorTileLayer]);

  useEffect(() => {
    if (startSimulation) {
      setUpdateCount(0)
      setStartTime(Date.now())
    } else {
      setAverageFps(Math.round(updateCount/(Date.now()-startTime)*1000))
    }
  }, [startSimulation]);

  useEffect(() => {
    if (vectorTileLayer) {
    extracted(false, vectorTileLayer)
    }
  }, [limit, vectorTileLayer]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div id="map" style={{ height: "75%", position: "relative" }}></div>
      <button onClick={() => setStartSimulation(!startSimulation)}>
        start simulation
      </button>
      <button onClick={() => setTimez("1970-01-01 7:00:00")}>
        reset time
      </button>
      <input type='number' value={limit} onChange={(e)=>setLimit(e.target.value)}/>
      <div>{timez}</div>
      <div>{fps}</div>
      <div>Average fps: {averageFps}</div>
    </div>
  );
}