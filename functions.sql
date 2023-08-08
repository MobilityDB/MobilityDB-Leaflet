SELECT asMFJSON(transform(trip, 4326))::json FROM ships limit 1;


drop function if exists tripsfct(z integer, x integer, y integer, maxpoints integer);
create FUNCTION public.tripsfct(
            z integer, x integer, y integer, maxpoints integer default 10)
RETURNS bytea
AS $$
    WITH bounds AS (
        SELECT ST_TileEnvelope(z, x, y)::stbox AS geom
    ),
    val AS (
        SELECT mmsi,  asMVTGeom(trip_3857, bounds.geom) as geom_times -- delete transform
        FROM ships, bounds
        ORDER BY mmsi
        LIMIT maxpoints
    ),
    mvtgeom AS(
        SELECT mmsi, (geom_times).geom, (geom_times).times
        FROM val
    )
    SELECT st_asmvt(mvtgeom, 'reduced') FROM mvtgeom
$$
LANGUAGE 'sql'
STABLE
PARALLEL SAFE;


CREATE OR REPLACE FUNCTION input_ais()
RETURNS text AS $$
BEGIN

  DROP TABLE IF EXISTS AISInput;
  CREATE TABLE AISInput(
    T timestamp,
    TypeOfMobile varchar(100),
    MMSI integer,
    Latitude float,
    Longitude float,
    navigationalStatus varchar(100),
    ROT float,
    SOG float,
    COG float,
    Heading integer,
    IMO varchar(100),
    Callsign varchar(100),
    Name varchar(100),
    ShipType varchar(100),
    CargoType varchar(100),
    Width float,
    Length float,
    TypeOfPositionFixingDevice varchar(100),
    Draught float,
    Destination varchar(100),
    ETA varchar(100),
    DataSourceType varchar(100),
    SizeA float,
    SizeB float,
    SizeC float,
    SizeD float,
    Geom geometry(Point, 4326)
  );

  RAISE INFO 'Reading CSV files ...';

  COPY AISInput(T, TypeOfMobile, MMSI, Latitude, Longitude, NavigationalStatus,
    ROT, SOG, COG, Heading, IMO, CallSign, Name, ShipType, CargoType, Width, Length,
    TypeOfPositionFixingDevice, Draught, Destination, ETA, DataSourceType,
    SizeA, SizeB, SizeC, SizeD)
  FROM '/mnt/g/ais_datasets/aisdk-2023-05-23/aisdk-2023-05-23.csv' DELIMITER ',' CSV HEADER;

  RAISE INFO 'Updating AISInput table ...';

  UPDATE AISInput SET
    NavigationalStatus = CASE NavigationalStatus WHEN 'Unknown value' THEN NULL END,
    IMO = CASE IMO WHEN 'Unknown' THEN NULL END,
    ShipType = CASE ShipType WHEN 'Undefined' THEN NULL END,
    TypeOfPositionFixingDevice = CASE TypeOfPositionFixingDevice
    WHEN 'Undefined' THEN NULL END,
    Geom = ST_SetSRID( ST_MakePoint( Longitude, Latitude ), 4326);

  RAISE INFO 'Creating AISInputFiltered table ...';

  DROP TABLE IF EXISTS AISInputFiltered;
  CREATE TABLE AISInputFiltered AS
  SELECT DISTINCT ON(MMSI,T) *
  FROM AISInput
  WHERE Longitude BETWEEN -16.1 and 32.88 AND Latitude BETWEEN 40.18 AND 84.17;

  RAISE INFO 'Creating Ships table ...';

  -- DROP TABLE IF EXISTS Ships;
  -- CREATE TABLE Ships(MMSI, Trip, SOG, COG) AS
  -- SELECT MMSI,
    -- tgeompoint_seq(array_agg(tgeompoint_inst(ST_Transform(Geom, 25832), T) ORDER BY T)),
    -- tfloat_seq(array_agg(tfloat_inst(SOG, T) ORDER BY T) FILTER (WHERE SOG IS NOT NULL)),
    -- tfloat_seq(array_agg(tfloat_inst(COG, T) ORDER BY T) FILTER (WHERE COG IS NOT NULL))
  -- FROM AISInputFiltered
  -- GROUP BY MMSI;

  DROP TABLE IF EXISTS Ships;
  CREATE TABLE Ships(MMSI, Trip) AS
  SELECT MMSI, tgeompoint_seqset_gaps(
    array_agg(tgeompoint_inst(ST_Transform(Geom, 25832), T) ORDER BY T),
    interval '1 hour')
  FROM AISInputFiltered
  GROUP BY MMSI;

  ALTER TABLE Ships7 ADD COLUMN Traj geometry;
  UPDATE Ships SET Traj = trajectory(Trip);

    alter table ships add column trip_3857 tgeompoint;
    update ships set trip_3857 = transform(trip, 3857);
    update ships set trip = transform(trip, 4326);

  RETURN 'The End';
END;
$$ LANGUAGE 'plpgsql' STRICT;
