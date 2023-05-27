import {useEffect} from "react";

export default function Slider({min, max, value, onChange}){
    return (
        <div className="slider-container">
            <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(e)}/>
        </div>
    )
}