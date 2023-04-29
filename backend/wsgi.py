import time
import zlib

from fastapi import FastAPI, Response
import psycopg2
import os
from dotenv import load_dotenv


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
async def get_vector_tiles(z, x, y, limit=100, timez='1970-01-01 7:00:00'):
    cur = con.cursor()
    t = time.time()
    cur.execute("select get_reduced_tilelayer(%s, %s, %s, %s, %s)", (z, x, y, limit, timez))
    asmvt = cur.fetchone()[0]
    print(time.time() - t)
    cur.close()

    if asmvt is not None:
        # Convert memoryview to bytes
        asmvt_bytes = asmvt.tobytes()

        # Set the content type and headers
        headers = {
            "Content-Type": "application/vnd.mapbox-vector-tile",
            "Access-Control-Allow-Origin": "*"
        }

        # Return the ASMVT byte string as a response with headers
        return Response(content=asmvt_bytes, headers=headers)
    else:
        return Response(content="No data found for this tile", status_code=404)
