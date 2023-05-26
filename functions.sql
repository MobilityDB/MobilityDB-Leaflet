drop function tripsfct(z integer, x integer, y integer, maxpoints integer);
create FUNCTION public.tripsfct(
            z integer, x integer, y integer, maxpoints integer default 10)
RETURNS bytea
AS $$
    WITH bounds AS (
        SELECT ST_TileEnvelope(z, x, y) AS geom
    ),
    val AS (
        SELECT id,  asMVTGeom(fullday_trajectory, (bounds.geom)::stbox) as geom_times
        FROM persona_small_2000, bounds
        ORDER BY id
        LIMIT maxpoints

    ),
    mvtgeom AS(
        SELECT id, (geom_times).geom, (geom_times).times
        FROM val
    )
    SELECT st_asmvt(mvtgeom, 'reduced') FROM mvtgeom
$$
LANGUAGE 'sql'
STABLE
PARALLEL SAFE;


SELECT asMFJSON(transform(fullday_trajectory, 4326))::json FROM persona_small_2000 limit 1
