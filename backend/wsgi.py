import time
import zlib

from fastapi import FastAPI, Response
import psycopg2
import os
from dotenv import load_dotenv
import json


load_dotenv()
con = psycopg2.connect(
    host=os.getenv("DB_HOST"),
    database=os.getenv("DB_NAME"),
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
async def get_geojson(limit=2000, timez='1970-01-01 7:00:00'):
    cur = con.cursor()
    cur.execute("SELECT asMFJSON(transform(fullday_trajectory, 4326))::json FROM persona_small_2000 LIMIT %s", (limit,))
    geojson = cur.fetchall()
    cur.close()

    ## send geojson as response
    return Response(content=json.dumps(geojson), headers={"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"})