import {useEffect, useRef} from "react";
import L from "leaflet";
import "./L.GridLayer.CanvasCircles";
export default function Test() {
    const mapRef = useRef(null);

    useEffect(() => {
        const map = L.map("map", {
            fadeAnimation: false,
        }).setView([50.5, 4], 8);

        L.gridLayer.canvasCircle().addTo(map);

        mapRef.current = map;

        return () => {
            map.remove();
        };
    });

    return (
        <div style={{position: 'relative', height: '100%'}}>
            <div id="map" style={{ position: "relative", height: "75%" }} />
        </div>
    );
}