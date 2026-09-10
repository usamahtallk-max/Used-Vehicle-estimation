from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.openapi.utils import get_openapi

import os
import joblib
import pandas as pd
import shutil
import uuid
from typing import List


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Used Vehicle Price Prediction API",
    description="Car, Bike and Honda Activa price prediction API with vehicle image upload",
    version="5.0"
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
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

MODELS_DIR = os.path.join(
    BASE_DIR,
    "models"
)

UPLOAD_DIR = os.path.join(
    BASE_DIR,
    "uploads"
)

# Create uploads folder automatically
os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# ============================================================
# LOAD CAR CATBOOST MODEL
# ============================================================

CAR_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "catboost_car_model.pkl"
)

car_model = joblib.load(
    CAR_MODEL_PATH
)


# ============================================================
# LOAD GENERAL BIKE MODEL
# ============================================================

BIKE_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "random_forest_bike_backup.pkl"
)

BIKE_COLUMNS_PATH = os.path.join(
    MODELS_DIR,
    "bike_encoded_columns_backup.pkl"
)

bike_model = joblib.load(
    BIKE_MODEL_PATH
)

bike_encoded_columns = joblib.load(
    BIKE_COLUMNS_PATH
)


# ============================================================
# LOAD HONDA ACTIVA MODEL
# ============================================================

ACTIVA_MODEL_PATH = os.path.join(
    MODELS_DIR,
    "random_forest_activa.pkl"
)

ACTIVA_COLUMNS_PATH = os.path.join(
    MODELS_DIR,
    "activa_encoded_columns.pkl"
)

activa_model = joblib.load(
    ACTIVA_MODEL_PATH
)

activa_encoded_columns = joblib.load(
    ACTIVA_COLUMNS_PATH
)


# ============================================================
# MODEL VERIFICATION
# ============================================================

print()
print("==========================================")
print("USED VEHICLE AI - MODEL VERIFICATION")
print("==========================================")

print(
    "Car model type:",
    type(car_model).__name__
)


# CatBoost does not always expose n_features_in_
# like scikit-learn RandomForest models.
try:

    print(
        "Car model features:",
        car_model.get_feature_count()
    )

except Exception:

    print(
        "Car model features:",
        "CatBoost feature count available internally"
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

print(
    "Upload directory:",
    UPLOAD_DIR
)

print("==========================================")
print("All models loaded successfully")
print("==========================================")
print()


# ============================================================
# CUSTOM OPENAPI
#
# This fixes Swagger UI showing:
#
#     Add string item
#
# instead of:
#
#     Choose Files
#
# FastAPI currently generates an OpenAPI 3.1 schema where
# UploadFile may appear as:
#
#     type: string
#     contentMediaType: application/octet-stream
#
# Swagger's file picker works correctly when the schema uses:
#
#     type: string
#     format: binary
#
# ============================================================

def custom_openapi():

    # If schema has already been generated,
    # return the existing schema.
    if app.openapi_schema:

        return app.openapi_schema


    # Generate the normal FastAPI OpenAPI schema.
    openapi_schema = get_openapi(

        title=app.title,

        version=app.version,

        description=app.description,

        routes=app.routes

    )


    # --------------------------------------------------------
    # Force OpenAPI 3.0.3
    # --------------------------------------------------------

    openapi_schema["openapi"] = "3.0.3"


    # --------------------------------------------------------
    # Locate the generated upload body schema
    # --------------------------------------------------------

    try:

        components = openapi_schema.get(
            "components",
            {}
        )

        schemas = components.get(
            "schemas",
            {}
        )


        upload_schema_name = (
            "Body_upload_vehicle_images_upload_vehicle_images_post"
        )


        upload_schema = schemas.get(
            upload_schema_name
        )


        # ----------------------------------------------------
        # Replace images definition
        # ----------------------------------------------------

        if upload_schema:

            upload_schema["properties"]["images"] = {

                "title": "Images",

                "type": "array",

                "items": {

                    "type": "string",

                    "format": "binary"

                }

            }


            print(
                "OpenAPI upload schema fixed successfully."
            )


        else:

            print(
                "Warning: upload schema was not found."
            )


    except Exception as e:

        print(
            "OpenAPI upload schema error:",
            e
        )


    # Save modified schema
    app.openapi_schema = openapi_schema


    return app.openapi_schema


# Tell FastAPI to use our custom OpenAPI schema.
app.openapi = custom_openapi


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():

    return {

        "message":
            "Used Vehicle Price Prediction API is working!",

        "version":
            "5.0",

        "image_upload":
            "enabled"

    }


# ============================================================
# MODEL STATUS
# ============================================================

@app.get("/model-status")
def model_status():

    # CatBoost feature count
    try:

        car_features = (
            car_model.get_feature_count()
        )

    except Exception:

        car_features = None


    return {

        "car_model": {

            "status":
                "loaded",

            "model_type":
                "CatBoost",

            "features":
                car_features

        },


        "bike_model": {

            "status":
                "loaded",

            "model_type":
                "Random Forest",

            "features":
                bike_model.n_features_in_

        },


        "activa_model": {

            "status":
                "loaded",

            "model_type":
                "Random Forest",

            "features":
                activa_model.n_features_in_

        },


        "image_upload": {

            "status":
                "enabled",

            "maximum_images":
                6,

            "allowed_formats": [

                "jpg",

                "jpeg",

                "png",

                "webp"

            ]

        }

    }


# ============================================================
# VEHICLE IMAGE UPLOAD
# ============================================================

@app.post("/upload-vehicle-images")
async def upload_vehicle_images(

    images: List[UploadFile] = File(...)

):

    # ========================================================
    # CHECK IMAGE COUNT
    # ========================================================

    if not images:

        return {

            "success":
                False,

            "message":
                "Please upload at least one vehicle image."

        }


    if len(images) > 6:

        return {

            "success":
                False,

            "message":
                "Maximum 6 images are allowed."

        }


    # ========================================================
    # ALLOWED IMAGE EXTENSIONS
    # ========================================================

    allowed_extensions = {

        ".jpg",

        ".jpeg",

        ".png",

        ".webp"

    }


    # ========================================================
    # STORAGE ARRAYS
    # ========================================================

    saved_images = []

    rejected_images = []


    # ========================================================
    # PROCESS EACH IMAGE
    # ========================================================

    for image in images:

        # ----------------------------------------------------
        # Check filename
        # ----------------------------------------------------

        if not image.filename:

            continue


        # ----------------------------------------------------
        # Get extension
        # ----------------------------------------------------

        extension = os.path.splitext(
            image.filename
        )[1].lower()


        # ----------------------------------------------------
        # Check extension
        # ----------------------------------------------------

        if extension not in allowed_extensions:

            rejected_images.append({

                "original_name":
                    image.filename,

                "reason":
                    "Unsupported image format"

            })

            continue


        # ----------------------------------------------------
        # Generate unique filename
        # ----------------------------------------------------

        unique_name = (

            str(uuid.uuid4())

            + extension

        )


        # ----------------------------------------------------
        # Full file path
        # ----------------------------------------------------

        file_path = os.path.join(

            UPLOAD_DIR,

            unique_name

        )


        # ----------------------------------------------------
        # Save uploaded file
        # ----------------------------------------------------

        try:

            with open(

                file_path,

                "wb"

            ) as buffer:

                shutil.copyfileobj(

                    image.file,

                    buffer

                )


        except Exception as e:

            rejected_images.append({

                "original_name":
                    image.filename,

                "reason":
                    f"Could not save image: {str(e)}"

            })

            continue


        # ----------------------------------------------------
        # Add successful image
        # ----------------------------------------------------

        saved_images.append({

            "filename":
                unique_name,

            "original_name":
                image.filename,

            "path":
                file_path

        })


    # ========================================================
    # CHECK IF ANY IMAGE WAS SUCCESSFULLY SAVED
    # ========================================================

    if len(saved_images) == 0:

        return {

            "success":
                False,

            "message":
                "No valid images were uploaded.",

            "image_count":
                0,

            "images":
                [],

            "rejected_images":
                rejected_images

        }


    # ========================================================
    # SUCCESS RESPONSE
    # ========================================================

    return {

        "success":
            True,

        "message":
            f"{len(saved_images)} image(s) uploaded successfully.",

        "image_count":
            len(saved_images),

        "images":
            saved_images,

        "rejected_images":
            rejected_images

    }


# ============================================================
# VEHICLE INPUT DATA
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
# PRICE PREDICTION
# ============================================================

@app.post("/predict")
def predict_price(

    vehicle: VehicleData

):

    # ========================================================
    # NORMALIZE COMMON INPUTS
    # ========================================================

    vehicle_type = (

        vehicle.vehicle_type

        .lower()

        .strip()

    )


    brand = (

        vehicle.brand

        .lower()

        .strip()

    )


    model_name = (

        vehicle.model_name

        .lower()

        .strip()

    )


    # ========================================================
    # HONDA ACTIVA
    # ========================================================

    if (

        vehicle_type == "bike"

        and brand == "honda"

        and "activa" in model_name

    ):

        # ----------------------------------------------------
        # Calculate vehicle age
        # ----------------------------------------------------

        vehicle_age = max(

            0,

            2026 - vehicle.year

        )


        # ----------------------------------------------------
        # Owner mapping
        # ----------------------------------------------------

        owner_mapping = {

            1:
                "1st owner",

            2:
                "2nd owner",

            3:
                "3rd owner",

            4:
                "Fourth Owner Or More"

        }


        owner_value = owner_mapping.get(

            vehicle.owner,

            "1st owner"

        )


        # ----------------------------------------------------
        # Create input dataframe
        # ----------------------------------------------------

        input_data = pd.DataFrame([{

            "bike_name":
                vehicle.model_name,

            "kms_driven":
                vehicle.kms_driven,

            "owner":
                owner_value,

            "age":
                vehicle_age

        }])


        # ----------------------------------------------------
        # Encode categorical variables
        # ----------------------------------------------------

        input_encoded = pd.get_dummies(

            input_data,

            columns=[

                "bike_name",

                "owner"

            ],

            drop_first=True

        )


        # ----------------------------------------------------
        # Match training columns
        # ----------------------------------------------------

        input_encoded = input_encoded.reindex(

            columns=
                activa_encoded_columns,

            fill_value=0

        )


        # ----------------------------------------------------
        # Verify feature count
        # ----------------------------------------------------

        assert (

            input_encoded.shape[1]

            == activa_model.n_features_in_

        )


        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        prediction = activa_model.predict(

            input_encoded

        )


        # ----------------------------------------------------
        # Price
        # ----------------------------------------------------

        estimated_price = max(

            0,

            float(

                prediction[0]

            )

        )


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return {

            "vehicle_category":
                "Honda Activa",

            "model_used":
                "Activa Random Forest",

            "estimated_price":
                round(

                    estimated_price,

                    2

                )

        }


    # ========================================================
    # GENERAL BIKE
    # ========================================================

    if vehicle_type == "bike":

        # ----------------------------------------------------
        # Calculate vehicle age
        # ----------------------------------------------------

        vehicle_age = max(

            0,

            2026 - vehicle.year

        )


        # ----------------------------------------------------
        # Create input dataframe
        # ----------------------------------------------------

        input_data = pd.DataFrame([{

            "bike_name":
                vehicle.model_name,

            "city":
                vehicle.city,

            "kms_driven":
                vehicle.kms_driven,

            "owner":
                vehicle.owner,

            "age":
                vehicle_age,

            "power":
                vehicle.power,

            "brand":
                vehicle.brand

        }])


        # ----------------------------------------------------
        # Encode categorical variables
        # ----------------------------------------------------

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


        # ----------------------------------------------------
        # Match training columns
        # ----------------------------------------------------

        input_encoded = input_encoded.reindex(

            columns=
                bike_encoded_columns,

            fill_value=0

        )


        # ----------------------------------------------------
        # Verify feature count
        # ----------------------------------------------------

        assert (

            input_encoded.shape[1]

            == bike_model.n_features_in_

        )


        # ----------------------------------------------------
        # Prediction
        # ----------------------------------------------------

        prediction = bike_model.predict(

            input_encoded

        )


        # ----------------------------------------------------
        # Price
        # ----------------------------------------------------

        estimated_price = max(

            0,

            float(

                prediction[0]

            )

        )


        # ----------------------------------------------------
        # Response
        # ----------------------------------------------------

        return {

            "vehicle_category":
                "Bike",

            "model_used":
                "General Bike Random Forest",

            "estimated_price":
                round(

                    estimated_price,

                    2

                )

        }


    # ========================================================
    # CAR - CATBOOST
    # ========================================================

    # --------------------------------------------------------
    # Calculate vehicle age
    # --------------------------------------------------------

    vehicle_age = max(

        0,

        2026 - vehicle.year

    )


    # ========================================================
    # CREATE BRAND + MODEL
    # ========================================================

    brand_model = (

        f"{brand}_{model_name}"

    )


    # ========================================================
    # CREATE CATBOOST INPUT
    # ========================================================

    car_input = pd.DataFrame([{

        "vehicle_type":
            vehicle_type,

        "brand":
            brand,

        "model":
            model_name,

        "brand_model":
            brand_model,

        "year":
            vehicle.year,

        "kms_driven":
            vehicle.kms_driven,

        "fuel_type":
            vehicle.fuel_type

            .lower()

            .strip(),

        "transmission":
            vehicle.transmission

            .lower()

            .strip(),

        "owner":
            str(vehicle.owner),

        "city":
            vehicle.city

            .lower()

            .strip(),

        "body_type":
            vehicle.body_type

            .lower()

            .strip(),

        "vehicle_age":
            vehicle_age

    }])


    # ========================================================
    # CATBOOST FEATURE ORDER
    # ========================================================

    car_features = [

        "vehicle_type",

        "brand",

        "model",

        "brand_model",

        "year",

        "kms_driven",

        "fuel_type",

        "transmission",

        "owner",

        "city",

        "body_type",

        "vehicle_age"

    ]


    # --------------------------------------------------------
    # Apply exact feature order
    # --------------------------------------------------------

    car_input = car_input[

        car_features

    ]


    # ========================================================
    # CATEGORICAL FEATURES
    # ========================================================

    categorical_features = [

        "vehicle_type",

        "brand",

        "model",

        "brand_model",

        "fuel_type",

        "transmission",

        "owner",

        "city",

        "body_type"

    ]


    # --------------------------------------------------------
    # Convert categorical values to strings
    # --------------------------------------------------------

    for feature in categorical_features:

        car_input[feature] = (

            car_input[feature]

            .astype(str)

        )


    # ========================================================
    # CAR PREDICTION
    # ========================================================

    prediction = car_model.predict(

        car_input

    )


    # ========================================================
    # PRICE
    # ========================================================

    estimated_price = max(

        0,

        float(

            prediction[0]

        )

    )


    # ========================================================
    # CAR RESPONSE
    # ========================================================

    return {

        "vehicle_category":
            "Car",

        "model_used":
            "Car CatBoost",

        "estimated_price":
            round(

                estimated_price,

                2

            )

    }