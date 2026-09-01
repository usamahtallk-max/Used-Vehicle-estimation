from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import joblib
import pandas as pd


app = FastAPI(
    title="Used Vehicle Price Prediction API",
    description="Car, Bike and Honda Activa price prediction API",
    version="2.1"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

MODELS_DIR = os.path.join(BASE_DIR, "models")


# ============================================================
# LOAD CAR MODEL
# ============================================================

car_model = joblib.load(
    os.path.join(
        MODELS_DIR,
        "random_forest_vehicle_price.pkl"
    )
)

car_encoded_columns = joblib.load(
    os.path.join(
        MODELS_DIR,
        "encoded_columns.pkl"
    )
)


# ============================================================
# LOAD GENERAL BIKE MODEL
# ============================================================

bike_model = joblib.load(
    os.path.join(
        MODELS_DIR,
        "random_forest_bike_backup.pkl"
    )
)

# IMPORTANT:
# This MUST be the 932-column encoder.
bike_encoded_columns = joblib.load(
    os.path.join(
        MODELS_DIR,
        "bike_encoded_columns_backup.pkl"
    )
)


# ============================================================
# LOAD HONDA ACTIVA MODEL
# ============================================================

activa_model = joblib.load(
    os.path.join(
        MODELS_DIR,
        "random_forest_activa.pkl"
    )
)

activa_encoded_columns = joblib.load(
    os.path.join(
        MODELS_DIR,
        "activa_encoded_columns.pkl"
    )
)


# ============================================================
# VERIFY MODELS
# ============================================================

print("==========================================")
print("MODEL VERIFICATION")
print("==========================================")

print(
    "Car model features:",
    car_model.n_features_in_
)

print(
    "Car encoded columns:",
    len(car_encoded_columns)
)

print(
    "Bike model features:",
    bike_model.n_features_in_
)

print(
    "Bike encoded columns:",
    len(bike_encoded_columns)
)

print(
    "Activa model features:",
    activa_model.n_features_in_
)

print(
    "Activa encoded columns:",
    len(activa_encoded_columns)
)

print("==========================================")


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {
        "message": "Used Vehicle Price Prediction API is working!",
        "version": "2.1"
    }


# ============================================================
# MODEL STATUS
# ============================================================

@app.get("/model-status")
def model_status():

    return {
        "car_model": {
            "status": "loaded",
            "features": car_model.n_features_in_
        },

        "bike_model": {
            "status": "loaded",
            "features": bike_model.n_features_in_
        },

        "activa_model": {
            "status": "loaded",
            "features": activa_model.n_features_in_
        }
    }


# ============================================================
# INPUT DATA
# ============================================================

class VehicleData(BaseModel):

    vehicle_type: str

    brand: str

    model_name: str

    year: int

    kms_driven: float

    fuel_type: str = ""

    transmission: str = ""

    owner: int

    city: str = ""

    body_type: str = ""

    power: float = 150.0


# ============================================================
# PREDICTION
# ============================================================

@app.post("/predict")
def predict_price(vehicle: VehicleData):

    vehicle_type = vehicle.vehicle_type.lower().strip()

    brand = vehicle.brand.lower().strip()

    model_name = vehicle.model_name.lower().strip()


    # ========================================================
    # HONDA ACTIVA
    # ========================================================

    if (
        vehicle_type == "bike"
        and brand == "honda"
        and "activa" in model_name
    ):

        vehicle_age = 2026 - vehicle.year

        owner_mapping = {
            1: "1st owner",
            2: "2nd owner",
            3: "3rd owner",
            4: "Fourth Owner Or More"
        }

        owner_value = owner_mapping.get(
            vehicle.owner,
            "1st owner"
        )

        input_data = pd.DataFrame([{
            "bike_name": vehicle.model_name,
            "kms_driven": vehicle.kms_driven,
            "owner": owner_value,
            "age": vehicle_age
        }])


        # Encode categorical features
        input_encoded = pd.get_dummies(
            input_data,
            columns=[
                "bike_name",
                "owner"
            ],
            drop_first=True
        )


        # Match EXACTLY the 12 training columns
        input_encoded = input_encoded.reindex(
            columns=activa_encoded_columns,
            fill_value=0
        )


        # Safety check
        assert input_encoded.shape[1] == activa_model.n_features_in_


        prediction = activa_model.predict(
            input_encoded
        )


        estimated_price = max(
            0,
            float(prediction[0])
        )


        return {
            "vehicle_category": "Honda Activa",
            "model_used": "Activa Random Forest",
            "estimated_price": round(
                estimated_price,
                2
            )
        }


    # ========================================================
    # GENERAL BIKE
    # ========================================================

    if vehicle_type == "bike":

        vehicle_age = 2026 - vehicle.year

        input_data = pd.DataFrame([{
            "bike_name": vehicle.model_name,
            "city": vehicle.city,
            "kms_driven": vehicle.kms_driven,
            "owner": vehicle.owner,
            "age": vehicle_age,
            "power": vehicle.power,
            "brand": vehicle.brand
        }])


        # Encode the same categorical features
        # used during the 932-feature model training.
        input_encoded = pd.get_dummies(
            input_data,
            columns=[
                "bike_name",
                "city",
                "owner",
                "brand"
            ],
            drop_first=True
        )


        # Match EXACTLY the 932 training columns
        input_encoded = input_encoded.reindex(
            columns=bike_encoded_columns,
            fill_value=0
        )


        # Safety check
        assert input_encoded.shape[1] == bike_model.n_features_in_


        prediction = bike_model.predict(
            input_encoded
        )


        estimated_price = max(
            0,
            float(prediction[0])
        )


        return {
            "vehicle_category": "Bike",
            "model_used": "General Bike Random Forest",
            "estimated_price": round(
                estimated_price,
                2
            )
        }


    # ========================================================
    # CAR
    # ========================================================

    vehicle_age = 2026 - vehicle.year

    input_data = pd.DataFrame([{
        "vehicle_type": vehicle.vehicle_type,
        "brand": vehicle.brand,
        "model": vehicle.model_name,
        "year": vehicle.year,
        "kms_driven": vehicle.kms_driven,
        "fuel_type": vehicle.fuel_type,
        "transmission": vehicle.transmission,
        "engine_cc": 0,
        "owner": vehicle.owner,
        "city": vehicle.city,
        "body_type": vehicle.body_type,
        "vehicle_age": vehicle_age
    }])


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


    input_encoded = input_encoded.reindex(
        columns=car_encoded_columns,
        fill_value=0
    )


    assert input_encoded.shape[1] == car_model.n_features_in_


    prediction = car_model.predict(
        input_encoded
    )


    estimated_price = max(
        0,
        float(prediction[0])
    )


    return {
        "vehicle_category": "Car",
        "model_used": "Car Random Forest",
        "estimated_price": round(
            estimated_price,
            2
        )
    }