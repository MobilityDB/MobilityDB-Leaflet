import logo from './logo.svg';
import './App.css';
import LVectorGrid from "./components/LVectorGrid";
import RLVectorGrid from "./components/RLVectorGrid";
import {MapContainer} from "react-leaflet";

function App() {
  return (
    <div className={'App notransition'}>
  <LVectorGrid />
    </div>
  );
}

export default App;
