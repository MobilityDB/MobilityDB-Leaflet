import logo from './logo.svg';
import './App.css';
import LVectorGrid from "./components/LVectorGrid";
import RLVectorGrid from "./components/RLVectorGrid";
import {GeoJSON, MapContainer} from "react-leaflet";
import GeojsonLayer from "./components/GeojsonLayer";
import TripLayer from "./components/TripLayer";
import "leaflet/dist/leaflet.css";

function App() {
  const db_name = "ais"
  return (
    <div className={'App notransition'}>
      <LVectorGrid db_name={db_name}/>
      <GeojsonLayer db_name={db_name}/>
    </div>
  );
}

export default App;
