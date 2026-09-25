from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from pydantic import BaseModel
from fastapi.staticfiles import StaticFiles

from pathlib import Path
from PIL import Image

import os
import joblib
import pandas as pd
import shutil
import uuid

from typing import List

from vision.damage_detector import detector


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

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)


# ============================================================
# FASTAPI APP
# ============================================================

app = FastAPI(
    title="Used Vehicle Price Prediction API",
    description=(
        "Car, Bike and Honda Activa price prediction API "
        "with vehicle image upload and AI damage detection"
    ),
    version="6.1"
)


# ============================================================
# STATIC UPLOAD FILES
# ============================================================

app.mount(
    "/uploads",
    StaticFiles(directory=UPLOAD_DIR),
    name="uploads"
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
print("MOTORIQ - MODEL VERIFICATION")
print("==========================================")

print(
    "Car model type:",
    type(car_model).__name__
)

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

print()
print("AI DAMAGE DETECTOR:")
print(
    "Damage model:",
    "YOLOv11 Car Damage Detection"
)

print(
    "Damage classes:",
    len(detector.model.names)
)

print(
    "Available damage classes:",
    detector.model.names
)

print("==========================================")
print("All models loaded successfully")
print("==========================================")
print()


# ============================================================
# CUSTOM OPENAPI
# ============================================================

def custom_openapi():

    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes
    )

    openapi_schema["openapi"] = "3.0.3"

    try:

        components = openapi_schema.get(
            "components",
            {}
        )

        schemas = components.get(
            "schemas",
            {}
        )

        upload_schema_names = [
            "Body_upload_vehicle_images_upload_vehicle_images_post",
            "Body_analyze_vehicle_images_analyze_vehicle_images_post"
        ]

        for upload_schema_name in upload_schema_names:

            upload_schema = schemas.get(
                upload_schema_name
            )

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
                    "OpenAPI upload schema fixed:",
                    upload_schema_name
                )

    except Exception as e:

        print(
            "OpenAPI upload schema error:",
            e
        )

    app.openapi_schema = openapi_schema

    return app.openapi_schema


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
            "6.1",

        "image_upload":
            "enabled",

        "ai_damage_detection":
            "enabled"
    }


# ============================================================
# MODEL STATUS
# ============================================================

@app.get("/model-status")
def model_status():

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
        },


        "damage_detection": {

            "status":
                "enabled",

            "model":
                "YOLOv11 Car Damage Detection",

            "classes":
                detector.model.names,

            "maximum_images":
                6,

            "confidence_threshold":
                0.40
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

        if not image.filename:
            continue


        extension = os.path.splitext(
            image.filename
        )[1].lower()


        if extension not in allowed_extensions:

            rejected_images.append({

                "original_name":
                    image.filename,

                "reason":
                    "Unsupported image format"

            })

            continue


        unique_name = (
            str(uuid.uuid4())
            + extension
        )


        file_path = os.path.join(
            UPLOAD_DIR,
            unique_name
        )


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


        # ====================================================
        # READ IMAGE DIMENSIONS
        # ====================================================

        try:

            with Image.open(file_path) as img:

                image_width, image_height = img.size

        except Exception as e:

            rejected_images.append({

                "original_name":
                    image.filename,

                "reason":
                    f"Could not read image dimensions: {str(e)}"

            })

            try:

                if os.path.exists(file_path):
                    os.remove(file_path)

            except Exception:
                pass

            continue


        saved_images.append({

            "filename":
                unique_name,

            "original_name":
                image.filename,

            "path":
                file_path,

            "image_width":
                image_width,

            "image_height":
                image_height

        })


    # ========================================================
    # NO VALID IMAGES
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
    # SUCCESS
    # ========================================================

    return {

        "success":
            True,

        "message":
            (
                f"{len(saved_images)} "
                "image(s) uploaded successfully."
            ),

        "image_count":
            len(saved_images),

        "images":
            saved_images,

        "rejected_images":
            rejected_images

    }


# ============================================================
# AI VEHICLE DAMAGE ANALYSIS
# ============================================================

@app.post("/analyze-vehicle-images")
async def analyze_vehicle_images(
    images: List[UploadFile] = File(...)
):

    """
    MotorIQ AI vehicle damage analysis.

    Each uploaded image is analyzed independently.

    Returned information includes:

    - image filename
    - original filename
    - image width
    - image height
    - detected damage
    - confidence
    - confidence percentage
    - confidence level
    - bounding box

    Only detections with confidence >= 40%
    are returned as detected damage.
    """


    # ========================================================
    # IMAGE COUNT
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
    # ALLOWED FORMATS
    # ========================================================

    allowed_extensions = {

        ".jpg",
        ".jpeg",
        ".png",
        ".webp"

    }


    # ========================================================
    # DAMAGE CONFIDENCE THRESHOLD
    # ========================================================

    DAMAGE_CONFIDENCE_THRESHOLD = 0.40


    # ========================================================
    # STORAGE
    # ========================================================

    analyzed_images = []

    rejected_images = []


    # ========================================================
    # PROCESS EACH IMAGE
    # ========================================================

    for image in images:

        if not image.filename:
            continue


        extension = os.path.splitext(
            image.filename
        )[1].lower()


        # ====================================================
        # VALIDATE EXTENSION
        # ====================================================

        if extension not in allowed_extensions:

            rejected_images.append({

                "original_name":
                    image.filename,

                "reason":
                    "Unsupported image format"

            })

            continue


        # ====================================================
        # UNIQUE FILE
        # ====================================================

        unique_name = (
            str(uuid.uuid4())
            + extension
        )


        file_path = os.path.join(
            UPLOAD_DIR,
            unique_name
        )


        # ====================================================
        # SAVE FILE
        # ====================================================

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


        # ====================================================
        # READ ACTUAL IMAGE DIMENSIONS
        # ====================================================

        try:

            with Image.open(file_path) as img:

                image_width, image_height = img.size

        except Exception as e:

            rejected_images.append({

                "original_name":
                    image.filename,

                "reason":
                    f"Could not read image dimensions: {str(e)}"

            })

            try:

                if os.path.exists(file_path):
                    os.remove(file_path)

            except Exception:
                pass

            continue


        # ====================================================
        # YOLO DAMAGE DETECTION
        # ====================================================

        try:

            raw_detections = detector.analyze(

                file_path,

                confidence=
                    DAMAGE_CONFIDENCE_THRESHOLD

            )

        except Exception as e:

            rejected_images.append({

                "original_name":
                    image.filename,

                "reason":
                    f"AI analysis failed: {str(e)}"

            })

            try:

                if os.path.exists(file_path):
                    os.remove(file_path)

            except Exception:
                pass

            continue


        # ====================================================
        # CLEAN DETECTIONS
        # ====================================================

        detections = []


        for detection in raw_detections:

            confidence = float(
                detection.get(
                    "confidence",
                    0
                )
            )


            # ------------------------------------------------
            # EXTRA CONFIDENCE SAFETY
            # ------------------------------------------------

            if confidence < DAMAGE_CONFIDENCE_THRESHOLD:
                continue


            # ------------------------------------------------
            # CONFIDENCE LEVEL
            # ------------------------------------------------

            if confidence >= 0.60:

                confidence_level = "high"

            else:

                confidence_level = "moderate"


            # ------------------------------------------------
            # CLEAN RESULT
            # ------------------------------------------------

            detections.append({

                "class_id":
                    detection.get(
                        "class_id"
                    ),

                "damage":
                    detection.get(
                        "damage"
                    ),

                "confidence":
                    round(
                        confidence,
                        4
                    ),

                "confidence_percent":
                    round(
                        confidence * 100,
                        2
                    ),

                "confidence_level":
                    confidence_level,

                "bbox":
                    detection.get(
                        "bbox",
                        {}
                    )

            })


        # ====================================================
        # IMAGE RESULT
        # ====================================================

        analyzed_images.append({

            "filename":
                unique_name,

            "original_name":
                image.filename,

            "path":
                file_path,

            "image_width":
                image_width,

            "image_height":
                image_height,

            "detections":
                detections,

            "damage_detected":
                len(detections) > 0,

            "damage_count":
                len(detections)

        })


    # ========================================================
    # NO IMAGES ANALYZED
    # ========================================================

    if len(analyzed_images) == 0:

        return {

            "success":
                False,

            "message":
                "No valid images could be analyzed.",

            "image_count":
                0,

            "images":
                [],

            "detections":
                [],

            "damage_detected":
                False,

            "damage_count":
                0,

            "rejected_images":
                rejected_images,

            "confidence_threshold":
                DAMAGE_CONFIDENCE_THRESHOLD

        }


    # ========================================================
    # FLATTEN DETECTIONS
    # ========================================================
    #
    # Kept for compatibility with existing frontend.
    #
    # IMPORTANT:
    # Every flattened detection contains the filename
    # and actual image dimensions.
    #
    # The frontend should preferably use:
    #
    # images[].detections
    #
    # when displaying markers.

    all_detections = []


    for analyzed_image in analyzed_images:

        for detection in analyzed_image["detections"]:

            all_detections.append({

                "image":
                    analyzed_image["filename"],

                "original_name":
                    analyzed_image["original_name"],

                "image_width":
                    analyzed_image["image_width"],

                "image_height":
                    analyzed_image["image_height"],

                **detection

            })


    # ========================================================
    # TOTAL DAMAGE
    # ========================================================

    total_damage_count = len(
        all_detections
    )


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return {

        "success":
            True,

        "message":
            (
                f"{len(analyzed_images)} "
                "image(s) analyzed successfully."
            ),

        "image_count":
            len(analyzed_images),

        "damage_detected":
            total_damage_count > 0,

        "damage_count":
            total_damage_count,

        "images":
            analyzed_images,

        "detections":
            all_detections,

        "rejected_images":
            rejected_images,

        "confidence_threshold":
            DAMAGE_CONFIDENCE_THRESHOLD,

        "confidence_threshold_percent":
            DAMAGE_CONFIDENCE_THRESHOLD * 100

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
    # NORMALIZE INPUTS
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

        vehicle_age = max(
            0,
            2026 - vehicle.year
        )


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


        input_encoded = pd.get_dummies(

            input_data,

            columns=[
                "bike_name",
                "owner"
            ],

            drop_first=True

        )


        input_encoded = input_encoded.reindex(

            columns=
                activa_encoded_columns,

            fill_value=0

        )


        assert (
            input_encoded.shape[1]
            == activa_model.n_features_in_
        )


        prediction = activa_model.predict(
            input_encoded
        )


        estimated_price = max(

            0,

            float(
                prediction[0]
            )

        )


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

        vehicle_age = max(
            0,
            2026 - vehicle.year
        )


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


        input_encoded = input_encoded.reindex(

            columns=
                bike_encoded_columns,

            fill_value=0

        )


        assert (
            input_encoded.shape[1]
            == bike_model.n_features_in_
        )


        prediction = bike_model.predict(
            input_encoded
        )


        estimated_price = max(

            0,

            float(
                prediction[0]
            )

        )


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

    vehicle_age = max(
        0,
        2026 - vehicle.year
    )


    brand_model = (
        f"{brand}_{model_name}"
    )


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