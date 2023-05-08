import React, {useEffect, useRef} from "react";
import L from "leaflet";


export default function TripLayer() {
    const mapRef = useRef(null);
    useEffect(() => {
        const map = L.map("map").setView([50.5, 4], 8);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                'Map data © <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
            maxZoom: 18,
        }).addTo(map);


        mapRef.current = map;
        return () => {
            map.remove();
        };
    }, []);

    return (
        <div style={{height: '100%', position: 'relative'}}>
            <div id="map" style={{height: "75%", position: 'relative'}}></div>
        </div>)
}