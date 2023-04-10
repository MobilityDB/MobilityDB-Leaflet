import React, { useRef, useEffect } from "react";
import L from "leaflet";
import "leaflet.vectorgrid";

export default function LVectorGrid() {
  const mapRef = useRef(null);

  useEffect(() => {
    // create a Leaflet map instance
    const map = L.map(mapRef.current).setView([51.505, 4], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);

    // create a vector tile layer
    const vectorTileOptions = {
      rendererFactory: L.canvas.tile,
      vectorTileLayerStyles: {
        sliced: () => ({
          weight: 1,
          color: "#3388ff",
          fillColor: "#3388ff",
          fillOpacity: 0.3,
        }),
      },
    };
    const vectorTileUrl = "http://192.168.0.171:7800/public.reduced/{z}/{x}/{y}.pbf";
    const vectorTileLayer = L.vectorGrid.protobuf(vectorTileUrl, vectorTileOptions);

    // add the vector tile layer to the map
    vectorTileLayer.addTo(map);

    // return a function to clean up the map when the component unmounts
    return () => {
      map.remove();
    };
  }, []);

  return <div ref={mapRef} style={{ height: "300px" }}></div>;
};