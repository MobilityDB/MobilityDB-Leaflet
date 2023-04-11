import React, { useRef, useEffect, useState } from "react";
import L from "leaflet";
import "leaflet.vectorgrid";

export default function LVectorGrid() {
  const mapRef = useRef(null);
  const [timez, setTimez] = useState("1970-01-01 7:00:00");
  const [vectorTileLayer, setVectorTileLayer] = useState(null);

  useEffect(() => {
    const map = L.map("map").setView([50.5, 4], 8);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);

    setVectorTileLayer(
      L.vectorGrid.protobuf(
        `http://192.168.0.171:7802/public.get_reduced_tilelayer/{z}/{x}/{y}.pbf?timez=${timez}`,
        {
          rendererFactory: L.canvas.tile,
          vectorTileLayerStyles: {
            reduced: function (properties, zoom) {
              return {
                radius: 5,
                weight: 3,
                fill: true,
                fillColor: "red",
                fillOpacity: 1,
                color: "black",
              };
            },
          },
        }
      ).addTo(map)
    );

    mapRef.current = map;

    // clean up the map instance when the component unmounts
    return () => {
      map.remove();
    };
  }, []);

  function updateTimez() {
    function sleep(number) {
return new Promise((resolve) => setTimeout(resolve, number));
    }

    sleep(100).then(() => {
      setTimez((timez) => {
        const date = new Date(timez);
        date.setMinutes(date.getMinutes() + 1);
        date.setHours(date.getHours() + 1);
        if (date.getHours() >= 23) {
          date.setMinutes(0);
          date.setHours(7);
        }
        return date.toISOString().slice(0, 19).replace("T", " ");
      });
    });
  }

  useEffect(() => {
    if (vectorTileLayer) {
      vectorTileLayer.setUrl(
        `http://192.168.0.171:7802/public.get_reduced_tilelayer/{z}/{x}/{y}.pbf?timez=${timez}`
      );
      updateTimez();
    }
  }, [timez]);

  return (
    <div style={{ height: "100%", position: "relative" }}>
      <div id={"map"} style={{ height: "75%", position: "relative" }}></div>
      <button
        onClick={updateTimez}
      >
        start simulation
      </button>
      <div>{timez}</div>
    </div>
  );
}
