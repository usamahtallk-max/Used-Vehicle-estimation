import pandas as pd
import os

# ============================================================
# 1. FILE PATHS
# ============================================================

CAR_PATH = "dataset/Used_Car_Price_Prediction.csv"
BIKE_PATH = "dataset/Used_Bikes.csv"
OUTPUT_PATH = "dataset/used_vehicles.csv"


# ============================================================
# 2. LOAD DATASETS
# ============================================================

print("Loading datasets...")

cars = pd.read_csv(CAR_PATH)
bikes = pd.read_csv(BIKE_PATH)

print(f"Cars loaded:  {cars.shape}")
print(f"Bikes loaded: {bikes.shape}")


# ============================================================
# 3. PREPARE CAR DATA
# ============================================================

print("\nPreparing car dataset...")

cars_clean = pd.DataFrame()

cars_clean["vehicle_type"] = "Car"
cars_clean["brand"] = cars["make"]
cars_clean["model"] = cars["model"]
cars_clean["year"] = cars["yr_mfr"]
cars_clean["kms_driven"] = cars["kms_run"]
cars_clean["fuel_type"] = cars["fuel_type"]
cars_clean["transmission"] = cars["transmission"]
cars_clean["engine_cc"] = pd.NA
cars_clean["owner"] = cars["total_owners"]
cars_clean["city"] = cars["city"]
cars_clean["body_type"] = cars["body_type"]
cars_clean["selling_price"] = cars["sale_price"]


# ============================================================
# 4. PREPARE BIKE DATA
# ============================================================

print("Preparing bike dataset...")

bikes_clean = pd.DataFrame()

bikes_clean["vehicle_type"] = "Bike"
bikes_clean["brand"] = bikes["brand"]
bikes_clean["model"] = bikes["bike_name"]

current_year = 2026
bikes_clean["year"] = current_year - bikes["age"]

bikes_clean["kms_driven"] = bikes["kms_driven"]

bikes_clean["fuel_type"] = "Petrol"
bikes_clean["transmission"] = "Manual"

bikes_clean["engine_cc"] = bikes["power"]

bikes_clean["owner"] = bikes["owner"]
bikes_clean["city"] = bikes["city"]

bikes_clean["body_type"] = "Bike"

bikes_clean["selling_price"] = bikes["price"]


# ============================================================
# 5. COMBINE CAR + BIKE DATA
# ============================================================

print("\nCombining datasets...")

combined = pd.concat(
    [cars_clean, bikes_clean],
    ignore_index=True
)


# ============================================================
# 6. DATA CLEANING
# ============================================================

print("Cleaning dataset...")

combined = combined[
    combined["selling_price"].notna()
]

combined = combined[
    combined["selling_price"] > 0
]

combined = combined[
    combined["kms_driven"].notna()
]

combined = combined[
    combined["kms_driven"] >= 0
]

combined = combined[
    combined["year"].notna()
]

combined = combined[
    (combined["year"] >= 1990) &
    (combined["year"] <= 2026)
]


# ============================================================
# 7. HANDLE MISSING VALUES
# ============================================================

combined["brand"] = combined["brand"].fillna("Unknown")
combined["model"] = combined["model"].fillna("Unknown")
combined["fuel_type"] = combined["fuel_type"].fillna("Unknown")
combined["transmission"] = combined["transmission"].fillna("Unknown")
combined["owner"] = combined["owner"].fillna("Unknown")
combined["city"] = combined["city"].fillna("Unknown")
combined["body_type"] = combined["body_type"].fillna("Unknown")


# ============================================================
# 8. CLEAN TEXT COLUMNS
# ============================================================

text_columns = [
    "brand",
    "model",
    "fuel_type",
    "transmission",
    "owner",
    "city",
    "body_type"
]

for column in text_columns:
    combined[column] = (
        combined[column]
        .astype(str)
        .str.strip()
        .str.lower()
    )


# ============================================================
# 9. CONVERT NUMERIC COLUMNS
# ============================================================

numeric_columns = [
    "year",
    "kms_driven",
    "engine_cc",
    "selling_price"
]

for column in numeric_columns:
    combined[column] = pd.to_numeric(
        combined[column],
        errors="coerce"
    )


# ============================================================
# 10. REMOVE DUPLICATES
# ============================================================

before_duplicates = len(combined)

combined = combined.drop_duplicates()

after_duplicates = len(combined)

print(
    f"Removed duplicates: "
    f"{before_duplicates - after_duplicates}"
)


# ============================================================
# 11. RESET INDEX
# ============================================================

combined = combined.reset_index(drop=True)


# ============================================================
# 12. SAVE FINAL DATASET
# ============================================================

combined.to_csv(
    OUTPUT_PATH,
    index=False
)


# ============================================================
# 13. DISPLAY RESULTS
# ============================================================

print("\n======================================")
print("DATASET PREPARATION COMPLETED")
print("======================================")

print(f"\nFinal dataset shape: {combined.shape}")

print("\nVehicle distribution:")
print(combined["vehicle_type"].value_counts())

print("\nFinal columns:")
print(combined.columns.tolist())

print("\nMissing values:")
print(combined.isnull().sum())

print("\nFirst 5 rows:")
print(combined.head())

print("\nFinal dataset saved at:")
print(OUTPUT_PATH)