from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import joblib
import pandas as pd


app = FastAPI()


# --------------------------------------------------
# CORS
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# Project paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)


# --------------------------------------------------
# Load model
# --------------------------------------------------

model_path = os.path.join(
    BASE_DIR,
    "models",
    "random_forest_vehicle_price.pkl"
)

columns_path = os.path.join(
    BASE_DIR,
    "models",
    "encoded_columns.pkl"
)


model = joblib.load(model_path)
encoded_columns = joblib.load(columns_path)


# Convert columns to list
encoded_columns = list(encoded_columns)


# --------------------------------------------------
# Basic API
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "message": "Used Vehicle Price Prediction API is working!"
    }


@app.get("/model-status")
def model_status():

    return {
        "model": "Random Forest",
        "status": "loaded successfully",
        "features": len(encoded_columns)
    }


# --------------------------------------------------
# Request model
# --------------------------------------------------

class VehicleData(BaseModel):

    vehicle_type: str
    brand: str
    model_name: str
    year: int
    kms_driven: float
    fuel_type: str
    transmission: str
    owner: int
    city: str
    body_type: str


# --------------------------------------------------
# Match category with training data
# --------------------------------------------------

def match_category(value, prefix):

    """
    Match the incoming value with the category spelling
    used during model training.

    Example:

    incoming:
        Honda

    training:
        honda

    result:
        honda
    """

    value = str(value).strip()

    # Columns belonging to this category
    possible_columns = [
        col for col in encoded_columns
        if col.startswith(prefix + "_")
    ]

    # Extract category names
    categories = [
        col[len(prefix) + 1:]
        for col in possible_columns
    ]

    # Exact match
    if value in categories:
        return value

    # Case-insensitive match
    for category in categories:

        if value.lower() == category.lower():

            return category

    # Return original value if not found
    return value


# --------------------------------------------------
# Prediction
# --------------------------------------------------

@app.post("/predict")
def predict_price(vehicle: VehicleData):

    # --------------------------------------------------
    # Vehicle age
    # --------------------------------------------------

    current_year = 2026

    vehicle_age = current_year - vehicle.year


    # --------------------------------------------------
    # Match categories with training dataset
    # --------------------------------------------------

    vehicle_type = match_category(
        vehicle.vehicle_type,
        "vehicle_type"
    )

    brand = match_category(
        vehicle.brand,
        "brand"
    )

    model_name = match_category(
        vehicle.model_name,
        "model"
    )

    fuel_type = match_category(
        vehicle.fuel_type,
        "fuel_type"
    )

    transmission = match_category(
        vehicle.transmission,
        "transmission"
    )

    city = match_category(
        vehicle.city,
        "city"
    )

    body_type = match_category(
        vehicle.body_type,
        "body_type"
    )


    # --------------------------------------------------
    # Create dataframe
    # --------------------------------------------------

    input_data = pd.DataFrame([{

        "vehicle_type": vehicle_type,

        "brand": brand,

        "model": model_name,

        "year": vehicle.year,

        "kms_driven": vehicle.kms_driven,

        "fuel_type": fuel_type,

        "transmission": transmission,

        "owner": vehicle.owner,

        "city": city,

        "body_type": body_type,

        "vehicle_age": vehicle_age

    }])


    # --------------------------------------------------
    # One-hot encoding
    # --------------------------------------------------

    input_encoded = pd.get_dummies(

        input_data,

        columns=[
            "vehicle_type",
            "brand",
            "model",
            "fuel_type",
            "transmission",
            "city",
            "body_type"
        ],

        drop_first=True
    )


    # --------------------------------------------------
    # Match training columns
    # --------------------------------------------------

    input_encoded = input_encoded.reindex(

        columns=encoded_columns,

        fill_value=0

    )


    # --------------------------------------------------
    # Prediction
    # --------------------------------------------------

    prediction = model.predict(
        input_encoded
    )


    estimated_price = float(
        prediction[0]
    )


    # --------------------------------------------------
    # Response
    # --------------------------------------------------

    return {

        "estimated_price": round(
            estimated_price,
            2
        )

    }