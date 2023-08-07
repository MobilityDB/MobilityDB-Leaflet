import './App.css';
import MVTLayer from "./components/MVTLayer";
import GeojsonLayer from "./components/GeojsonLayer";
import "leaflet/dist/leaflet.css";

function App() {
  const db_name = "ais"
  const local_ip = "192.168.0.172"
  return (
    <div className={'App notransition'}>
      <MVTLayer db_name={db_name} title={"MVT"} ip_address={local_ip}/>
      <GeojsonLayer db_name={db_name} title={"GeoJSON"} ip_address={local_ip}/>
    </div>
  );
}

export default App;
