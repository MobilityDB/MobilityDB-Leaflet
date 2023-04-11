import React, {useRef, useEffect, useState} from "react";
import L from "leaflet";
import "leaflet.vectorgrid";

export default function LVectorGrid() {
  const mapRef = useRef(null);
  const [timez, setTimez] = useState('1970-01-01 7:00:00')

  useEffect(() => {
    // create a Leaflet map instance
    console.log(mapRef.current)
    const map = L.map(mapRef.current).setView([50.5, 4], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: 'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);

    // create a vector tile layer
    const vectorTileOptions = {
      rendererFactory: L.canvas.tile,
      vectorTileLayerStyles: {
        // specify the style for the vector tile layer
        reduced: function (properties, zoom) {
          return {
            radius: 5,
            weight: 3,
            fill: true,
            fillColor: "red",
            fillOpacity: 1,
            color: "black",
          };
        }
      },
    };
    const vectorTileUrl = "http://192.168.0.171:7802/public.get_reduced_tilelayer/{z}/{x}/{y}.pbf?timez=" + (timez || '1970-01-01 7:00:00');
    const vectorTileLayer = L.vectorGrid.protobuf(vectorTileUrl, vectorTileOptions);
    console.log(vectorTileUrl)
    // add the vector tile layer to the map
    vectorTileLayer.addTo(map);

    // return a function to clean up the map when the component unmounts
    return () => {
      map.remove();
    };
  }, [timez]);

  return <div style={{ height: "100%", position:"relative"}}>
    <div ref={mapRef} style={{ height: "75%", position: "relative" }}></div>
    //button that increase the timez by 10 minutes and format it to the right format
    <button onClick={() => setTimez((timez) => {
      const date = new Date(timez)
      date.setMinutes(date.getMinutes() + 10)
      date.setHours(date.getHours() + 1)
      return date.toISOString().slice(0, 19).replace('T', ' ')
    })}>+</button>

</div>;
};