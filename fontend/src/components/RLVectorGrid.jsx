import {MapContainer, TileLayer, useMap} from "react-leaflet";
import { VectorTile } from "@mapbox/vector-tile";
import Protobuf from "pbf";
import L from "leaflet";
import { useRef, useEffect } from "react";

export default function RLVectorGrid() {
  const layerRef = useRef(null);
  let timez = '1970-01-01 7:00:00'
  const map = useMap();
  const zoom = map.getZoom();
  const center = map.getCenter();
  const point = map.project(center, zoom);
  const x = Math.floor(point.x / 256);
  const y = Math.floor(point.y / 256);
  const baseUrl = `http://192.168.0.171:7802/public.get_reduced_tilelayer/${zoom}/${x}/${y}.pbf?timez=${timez}`;


  const setTileLayer = (tileData) => {
    console.log(tileData)
    if (layerRef.current) {
      const { current: layer } = layerRef;
      const vectorTile = new VectorTile(new Protobuf(tileData), { extent: 4096 });
      const features = vectorTile.layers.reduced.feature(0).toGeoJSON();
      const style = { fillColor: "blue", weight: 1, color: "blue" };
      const layerOptions = { style };
      const geoJSONLayer = L.geoJSON(features, layerOptions);
      layer.leafletElement.clearLayers();
      layer.leafletElement.addLayer(geoJSONLayer);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const url = baseUrl+timez;
      fetch(url)
        .then((response) => response.arrayBuffer())
        .then((data) => setTileLayer(data))
        .catch((error) => console.error(error));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return <div>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <TileLayer ref={layerRef} />
  </div>;
}