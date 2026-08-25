from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from pydantic import BaseModel
import os
import joblib
import pandas as pd

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Project folder
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Load model
model_path = os.path.join(
    BASE_DIR,
    "models",
    "random_forest_vehicle_price.pkl"
)

# Load encoded columns
columns_path = os.path.join(
    BASE_DIR,
    "models",
    "encoded_columns.pkl"
)

model = joblib.load(model_path)
encoded_columns = joblib.load(columns_path)


@app.get("/")
def home():
    return {
        "message": "Used Vehicle Price Prediction API is working!"
    }


@app.get("/model-status")
def model_status():
    return {
        "model": "Random Forest",
        "status": "loaded successfully"
    }


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


@app.post("/predict")
def predict_price(vehicle: VehicleData):

    # Calculate vehicle age
    current_year = 2026
    vehicle_age = current_year - vehicle.year

    # Create input dataframe
    input_data = pd.DataFrame([{
        "vehicle_type": vehicle.vehicle_type,
        "brand": vehicle.brand,
        "model": vehicle.model_name,
        "year": vehicle.year,
        "kms_driven": vehicle.kms_driven,
        "fuel_type": vehicle.fuel_type,
        "transmission": vehicle.transmission,
        "owner": vehicle.owner,
        "city": vehicle.city,
        "body_type": vehicle.body_type,
        "vehicle_age": vehicle_age
    }])

    # One-hot encode
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

    # Make sure input has exactly the same columns as training data
    input_encoded = input_encoded.reindex(
        columns=encoded_columns,
        fill_value=0
    )

    # Predict
    prediction = model.predict(input_encoded)

    return {
        "estimated_price": round(float(prediction[0]), 2)
    }