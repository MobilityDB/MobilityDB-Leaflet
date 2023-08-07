# MobilityDB Leaflet

Welcome to the Spatiotemporal Data Visualization Tool, an interactive map for visualizing moving object data from a MobilityDB database! 

This project was created as part of a Master's thesis in Computer Science and makes use of open-source technologies including MobilityDB, pg_tileserv, Leaflet, React, and FastAPI.

The master thesis can be found [here](Master_Thesis_Florian_Baudry_2023.pdf).


https://github.com/MobilityDB/MobilityDB-Leaflet/assets/33914132/326aa19a-b053-497d-b561-dd31099fe0bd


## Main Features

- **Dynamic Visualization**: Our tool offers the possibility to visualize moving objects on an interactive map.
- **Temporal Control**: Control the time frame for the visualized data, providing options to play, pause, and navigate through time.
- **Object Filtering**: The tool allows you to limit the number of objects displayed, ensuring efficient visualization.
- **Dataset Compatibility**: Currently compatible with the AIS dataset, and designed with extendibility for additional datasets.

## Project Structure

This project consists of two main directories:

- `frontend`: This directory contains the React and Leaflet code for the frontend of the application.
- `backend`: This directory contains a FastAPI server written in Python that communicates with the MobilityDB database.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- You have installed the latest version of Python 3, Node.JS, and PostgreSQL
- You have a PostgreSQL database with the [MobilityDB](https://github.com/MobilityDB/MobilityDB) extension installed


## Datasets

This visualization tool can be used with various moving object datasets. Currently, it supports the following dataset:

### AIS Data

Our project uses the AIS (Automatic Identification System) dataset available [here](https://web.ais.dk/aisdata/). The AIS system is used for tracking and identifying marine vessels, providing a wealth of spatio-temporal data. Please visit the link to get access to the AIS data.

If you wish to add support for another dataset, please check out the 'Contributing' section. We'd love to make this tool compatible with more types of moving object data!

#### Import the Data

Here are the instructions to import the data for the AIS dataset

1. Download any data from [AIS](https://web.ais.dk/aisdata/).
2. Create a database named `ais`
3. Add the function `input_ais()` to this database (the function can be found in the [function.sql](function.sql) file). ⚠️ Make sure to modify the line `FROM '/mnt/g/ais_datasets/aisdk-2023-05-23/aisdk-2023-05-23.csv' DELIMITER ',' CSV HEADER;` to point to the good location of the file
4. Execute the function 

Now the data are imported !

To be able to use them using pg_tileserv, you need to make some modifications to your database:

1. Create a column `trip_3857` of type `tgeompoint`
2. Dxecute the following command: `update ships set trip_3857 = transform(trip, 3857);`. This will create a column with the good projection
3. Add the function `tripsfct` into your database (the function can be found in the [function.sql](function.sql) file).

After the setup of pg_tilserv, you should see the function in the GUI of pg_tileserv (run by default on port 7802)

![image](https://github.com/MobilityDB/MobilityDB-Leaflet/assets/33914132/3a6cb2f5-9d95-450b-be21-f655541d5a08)



## Getting Started

To get the application running, you need to set up the backend server, frontend server, and the `pg_tileserv` for serving map tiles:

### Backend

1. Navigate to the `backend` directory.
2. Install the required Python packages with `pip install -r requirements.txt`.
3. Copy the `.env.dist` file to a `.env` file
4. Modify the `.env` file to match your database information
5. Run the FastAPI server with `uvicorn wsgi:app`.

### pg_tileserv

`pg_tileserv` is a server that provides map tiles from your PostGIS data.

1. Download and install `pg_tileserv` from its [GitHub repository](https://github.com/CrunchyData/pg_tileserv).
2. Ensure that `pg_tileserv` is configured to access your PostgreSQL database, which should have the MobilityDB extension installed.
3. Run `pg_tileserv`.

### Frontend

1. Navigate to the `frontend` directory.
2. Install the required Node.js packages with `npm install`.
3. Ensure that the `local_ip` constant in `App.js` is set to your local IP address and `db_name` is set to `ais`
4. Start the React application with `npm start`.



After setting up all components, you should be able to see the application running at `localhost:3000`!



## Contributing

This is an open-source project, and contributions are welcome! Feel free to submit a pull request or create an issue. 

## License

This project is licensed under the [PostgreSQL License](https://www.postgresql.org/about/licence/). See the `LICENSE` file for more details.

