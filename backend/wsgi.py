import time
import zlib

from fastapi import FastAPI, Response
import psycopg2
import os
from dotenv import load_dotenv
import json


load_dotenv()
con_persona = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    database='persona_small',
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=os.getenv("DB_PORT")
)

con_ais = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    database='ais',
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    port=os.getenv("DB_PORT")
)


app = FastAPI()


@app.get("/")
async def root():
    return {"message": "Hello World"}


@app.get("/vectorTiles/{z}/{x}/{y}")
async def get_vector_tiles(z, x, y, limit=100):
    t = time.time()
    cur = con.cursor()
    cur.execute("select tripsfct(%s, %s, %s, %s)", (z, x, y, limit))
    asmvt = cur.fetchone()[0]
    cur.close()

    if asmvt is not None:
        # Convert memoryview to bytes
        asmvt_bytes = asmvt.tobytes()

        # Set the content type and headers
        headers = {
            "Content-Type": "application/vnd.mapbox-vector-tile",
            "Access-Control-Allow-Origin": "*"
        }
        print("Time taken: ", time.time() - t)
        # Return the ASMVT byte string as a response with headers
        return Response(content=asmvt_bytes, headers=headers)
    else:
        return Response(content="No data found for this tile", status_code=404)

@app.get("/geojson")
async def get_geojson(limit=2000, db_name='persona'):
    if db_name == 'persona':
        cur = con_persona.cursor()
        table_name = 'persona_small_4000'
        column_name = 'fullday_trajectory'
        order_by = 'ORDER BY id'
    else:
        cur = con_ais.cursor()
        table_name = 'ships'
        column_name = 'trip'
        order_by = 'ORDER BY mmsi'
    url = f'WITH trips as (SELECT {column_name} as col FROM {table_name} {order_by} LIMIT %s)SELECT asMFJSON(transform(col, 4326))::json FROM trips  LIMIT %s'
    cur.execute(url, (limit, limit,))
    geojson = cur.fetchall()
    cur.close()

    ## send geojson as response
    return Response(content=json.dumps(geojson), headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})

@app.get("/minmaxts")
async def get_minmaxts(db_name='persona'):
    if db_name == 'persona':
        cur = con_persona.cursor()
        table_name = 'persona_small_4000'
        column_name = 'fullday_trajectory'
    else:
        cur = con_ais.cursor()
        table_name = 'ships'
        column_name = 'trip'
    url = f'SELECT extract(EPOCH from MIN(tmin({column_name}::stbox))), extract(epoch from MAX(tmax({column_name}::stbox))) FROM {table_name};'
    cur.execute(url)
    minmaxts = cur.fetchone()
    cur.close()
    minmaxts = {'min': int(minmaxts[0]), 'max': int(minmaxts[1])}

    return Response(content=json.dumps(minmaxts), headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})