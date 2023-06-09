# 🌍 MobilityDB leaflet 🌍

Welcome to the Spatio-temporal Data Visualization Tool, an interactive map for visualizing moving object data from a MobilityDB database! 

This project was created as part of a Master's thesis in Computer Science and makes use of open-source technologies including MobilityDB, PostGIS, Leaflet, React, and FastAPI.

## 📂 Project Structure 📂

This project consists of two main directories:

- `frontend`: This directory contains the React and Leaflet code for the frontend of the application. 🎨
- `backend`: This directory contains a FastAPI server written in Python that communicates with the MobilityDB database. 🗄️

## 🚀 Getting Started 🚀

To get the application running:

### Backend

1. Navigate to the `backend` directory.
2. Install the required Python packages with `pip install -r requirements.txt`.
3. Modify the .env file to match your database information
4. Run the FastAPI server with `uvicorn wsgi:app`.

### Frontend

1. Navigate to the `frontend` directory.
2. Install the required Node.js packages with `npm install`.
3. Start the React application with `npm start`.

Now, you should be able to see the application running at `localhost:3000`! 🎉


## 📊 Datasets 📊

This visualization tool can be used with various moving object datasets. Currently, it supports the following dataset:

### AIS Data

Our project uses the AIS (Automatic Identification System) dataset available [here](https://web.ais.dk/aisdata/). The AIS system is used for tracking and identifying marine vessels, providing a wealth of spatio-temporal data. Please visit the link to get access to the AIS data.

If you wish to add support for another dataset, please check out the 'Contributing' section. We'd love to make this tool compatible with more types of moving object data!


## 🤝 Contributing 🤝

This is an open-source project, and contributions are welcome! Feel free to submit a pull request or create an issue. 

## 📚 License 📚

This project is licensed under the MIT License. See the `LICENSE` file for more details.

