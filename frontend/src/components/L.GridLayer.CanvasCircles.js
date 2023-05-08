import L from "leaflet";

L.GridLayer.CanvasCircles = L.GridLayer.extend({
    createTile: function (coords, done) {
    var tile = document.createElement('div');
    tile.innerHTML = [coords.x, coords.y, coords.z].join(', ');
    tile.style.outline = '1px solid red';

    setTimeout(function () {
        done(null, tile);	// Syntax is 'done(error, tile)'
    }, 500 + Math.random() * 1500);

    return tile;
    }
});

L.gridLayer.canvasCircle = function() {
    return new L.GridLayer.CanvasCircles();
};

export default L.gridLayer.canvasCircle;