import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Upload,
  X,
  ScanLine,
  Loader2,
  CarFront,
  Bike,
  FileText,
  ChevronRight,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

const vehicleBrands = {
  Car: [
    "Maruti",
    "Hyundai",
    "Honda",
    "Tata",
    "Toyota",
    "Mahindra",
    "Kia",
    "Renault",
    "Ford",
    "Volkswagen",
    "Skoda",
    "Nissan",
    "MG",
    "Jeep",
    "BMW",
    "Mercedes-Benz",
    "Audi",
    "Jaguar",
    "Land Rover",
    "Volvo",
    "Other",
  ],

  Bike: [
    "Honda",
    "Bajaj",
    "TVS",
    "Hero",
    "Yamaha",
    "Royal Enfield",
    "Suzuki",
    "KTM",
    "Kawasaki",
    "Mahindra",
    "Jawa",
    "BMW",
    "Harley-Davidson",
    "Triumph",
    "Ola",
    "Ather",
    "Other",
  ],
};

const carModels = {
  Maruti: [
    "Swift",
    "Baleno",
    "Dzire",
    "WagonR",
    "Alto",
    "Alto K10",
    "Celerio",
    "Ertiga",
    "Brezza",
    "Vitara Brezza",
    "Ciaz",
    "Ignis",
    "S-Presso",
    "XL6",
  ],

  Hyundai: [
    "i10",
    "Grand i10",
    "Grand i10 Nios",
    "i20",
    "Elite i20",
    "Verna",
    "Creta",
    "Venue",
    "Aura",
    "Santro",
    "Exter",
    "Alcazar",
    "Tucson",
  ],

  Honda: [
    "City",
    "Amaze",
    "Jazz",
    "Brio",
    "Civic",
    "WR-V",
    "CR-V",
    "Accord",
    "Activa",
    "Activa 3G",
    "Activa 4G",
    "Activa 5G",
    "Activa 6G",
  ],

  Tata: [
    "Nexon",
    "Tiago",
    "Tigor",
    "Altroz",
    "Punch",
    "Harrier",
    "Safari",
    "Indica",
    "Indigo",
    "Nano",
    "Sumo",
  ],

  Toyota: [
    "Innova",
    "Innova Crysta",
    "Fortuner",
    "Etios",
    "Etios Liva",
    "Corolla",
    "Camry",
    "Yaris",
    "Glanza",
    "Urban Cruiser",
  ],

  Mahindra: [
    "Scorpio",
    "Scorpio N",
    "Thar",
    "Bolero",
    "XUV500",
    "XUV700",
    "XUV300",
    "KUV100",
    "Quanto",
  ],

  Kia: [
    "Seltos",
    "Sonet",
    "Carens",
    "Carnival",
  ],

  Renault: [
    "Kwid",
    "Duster",
    "Triber",
    "Kiger",
    "Lodgy",
  ],

  Ford: [
    "EcoSport",
    "Endeavour",
    "Figo",
    "Aspire",
    "Freestyle",
  ],

  Volkswagen: [
    "Polo",
    "Vento",
    "Virtus",
    "Taigun",
    "T-Roc",
  ],

  Skoda: [
    "Rapid",
    "Slavia",
    "Kushaq",
    "Octavia",
    "Superb",
    "Fabia",
  ],

  Nissan: [
    "Magnite",
    "Terrano",
    "Micra",
    "Sunny",
  ],

  MG: [
    "Hector",
    "Astor",
    "ZS EV",
    "Gloster",
  ],

  Jeep: [
    "Compass",
    "Meridian",
    "Wrangler",
    "Grand Cherokee",
  ],

  BMW: [
    "3 Series",
    "5 Series",
    "7 Series",
    "X1",
    "X3",
    "X5",
    "X7",
  ],

  "Mercedes-Benz": [
    "A-Class",
    "C-Class",
    "E-Class",
    "S-Class",
    "GLA",
    "GLC",
    "GLE",
  ],

  Audi: [
    "A3",
    "A4",
    "A6",
    "Q3",
    "Q5",
    "Q7",
  ],

  Jaguar: [
    "XE",
    "XF",
    "F-Pace",
    "F-Type",
  ],

  "Land Rover": [
    "Discovery",
    "Discovery Sport",
    "Range Rover Evoque",
    "Range Rover Sport",
  ],

  Volvo: [
    "S60",
    "S90",
    "XC40",
    "XC60",
    "XC90",
  ],
};

const bikeModels = {
  Honda: [
    "Activa",
    "Activa 3G",
    "Activa 4G",
    "Activa 5G",
    "Activa 6G",
    "Shine",
    "CB Shine",
    "Unicorn",
    "Hornet",
    "CBR",
  ],

  Bajaj: [
    "Pulsar",
    "Pulsar 125",
    "Pulsar 150",
    "Pulsar 180",
    "Pulsar 200",
    "Pulsar NS200",
    "Avenger",
    "Platina",
    "CT100",
    "Dominar",
  ],

  TVS: [
    "Apache",
    "Apache RTR 160",
    "Apache RTR 200",
    "Jupiter",
    "NTorq",
    "Sport",
    "Radeon",
    "Scooty Pep Plus",
  ],

  Hero: [
    "Splendor",
    "Splendor Plus",
    "HF Deluxe",
    "Passion",
    "Glamour",
    "Xpulse",
    "Xtreme",
    "Maestro",
  ],

  Yamaha: [
    "FZ",
    "FZ-S",
    "R15",
    "MT-15",
    "Fascino",
    "Ray ZR",
    "Saluto",
  ],

  "Royal Enfield": [
    "Classic 350",
    "Bullet 350",
    "Meteor 350",
    "Hunter 350",
    "Himalayan",
    "Interceptor 650",
    "Continental GT",
  ],

  Suzuki: [
    "Access",
    "Access 125",
    "Gixxer",
    "Burgman Street",
    "Hayabusa",
  ],

  KTM: [
    "Duke 125",
    "Duke 200",
    "Duke 250",
    "Duke 390",
    "RC 125",
    "RC 200",
    "RC 390",
  ],

  Kawasaki: [
    "Ninja 300",
    "Ninja 400",
    "Ninja 650",
    "Z650",
    "Z900",
  ],

  Mahindra: [
    "Mojo",
    "Centuro",
  ],

  Jawa: [
    "Jawa 42",
    "Jawa Classic",
    "Perak",
  ],

  BMW: [
    "G 310 R",
    "G 310 GS",
    "F 850 GS",
    "S 1000 RR",
  ],

  "Harley-Davidson": [
    "Street 750",
    "Iron 883",
    "Fat Boy",
    "Sportster",
  ],

  Triumph: [
    "Street Triple",
    "Speed 400",
    "Bonneville",
    "Tiger",
  ],

  Ola: [
    "S1",
    "S1 Pro",
    "S1 Air",
  ],

  Ather: [
    "450X",
    "450",
    "Rizta",
  ],
};

function Inspection() {
  const navigate = useNavigate();

  const [images, setImages] = useState([]);
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [vehicle, setVehicle] = useState({
    vehicle_type: "Car",
    brand: "",
    model: "",
    year: "",
    kms_driven: "",
    fuel_type: "Petrol",
    transmission: "Manual",
    owner: "1",
    city: "",
    body_type: "Hatchback",
  });

  const [conditionSummary, setConditionSummary] = useState("");

  const currentModels = useMemo(() => {
    if (!vehicle.brand) {
      return [];
    }

    if (vehicle.vehicle_type === "Car") {
      return carModels[vehicle.brand] || [];
    }

    return bikeModels[vehicle.brand] || [];
  }, [vehicle.vehicle_type, vehicle.brand]);

  const changeVehicleType = (type) => {
    setVehicle((prev) => ({
      ...prev,
      vehicle_type: type,
      brand: "",
      model: "",
      body_type: type === "Car" ? "Hatchback" : "Bike",
    }));

    setError("");
    setMessage("");
  };

  const addImages = (files) => {
    const selectedFiles = Array.from(files || []);

    const validFiles = selectedFiles.filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    if (validFiles.length === 0) {
      setError("Please select JPG, PNG, or WEBP images.");
      return;
    }

    const remainingSlots = 6 - images.length;

    if (remainingSlots <= 0) {
      setError("You can upload a maximum of 6 images.");
      return;
    }

    const filesToAdd = validFiles.slice(0, remainingSlots);

    const newImages = filesToAdd.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
    }));

    setImages((prev) => [...prev, ...newImages]);
    setError("");
  };

  const handleFileChange = (e) => {
    addImages(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);

    addImages(e.dataTransfer.files);
  };

  const removeImage = (id) => {
    setImages((prev) => {
      const imageToRemove = prev.find((item) => item.id === id);

      if (imageToRemove) {
        URL.revokeObjectURL(imageToRemove.preview);
      }

      return prev.filter((item) => item.id !== id);
    });
  };

  const validateVehicle = () => {
    if (!vehicle.brand.trim()) {
      return "Please enter the vehicle brand.";
    }

    if (!vehicle.model.trim()) {
      return "Please enter the vehicle model.";
    }

    if (!vehicle.year) {
      return "Please enter the vehicle year.";
    }

    const year = Number(vehicle.year);

    if (year < 1980 || year > new Date().getFullYear()) {
      return "Please enter a valid vehicle year.";
    }

    if (!vehicle.kms_driven) {
      return "Please enter kilometers driven.";
    }

    if (Number(vehicle.kms_driven) < 0) {
      return "Kilometers driven cannot be negative.";
    }

    if (!vehicle.city.trim()) {
      return "Please enter the city.";
    }

    return "";
  };

  /*
   * ============================================================
   * MOTORIQ ANALYSIS
   * ============================================================
   *
   * Flow:
   *
   * 1. Validate vehicle
   * 2. Upload images
   * 3. Run YOLO damage detection
   * 4. Run price prediction
   * 5. Save complete result
   * 6. Navigate to Result page
   */
  const handleAnalyze = async () => {
    setError("");
    setMessage("");

    const validationError = validateVehicle();

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      /*
       * IMPORTANT:
       * FastAPI expects "model_name", not "model".
       */
      const predictionPayload = {
        vehicle_type: vehicle.vehicle_type,
        brand: vehicle.brand.trim(),
        model_name: vehicle.model.trim(),
        year: Number(vehicle.year),
        kms_driven: Number(vehicle.kms_driven),
        fuel_type: vehicle.fuel_type,
        transmission: vehicle.transmission,
        owner: Number(vehicle.owner),
        city: vehicle.city.trim(),
        body_type: vehicle.body_type,
      };

      let uploadedImages = [];
      let damageAnalysis = null;

      /*
       * ========================================================
       * STEP 1 — UPLOAD IMAGES
       * ========================================================
       */
      if (images.length > 0) {
        const uploadFormData = new FormData();

        images.forEach((image) => {
          uploadFormData.append("images", image.file);
        });

        const uploadResponse = await fetch(
          `${API_BASE_URL}/upload-vehicle-images`,
          {
            method: "POST",
            body: uploadFormData,
          }
        );

        if (!uploadResponse.ok) {
          let uploadError =
            `Image upload failed (${uploadResponse.status}).`;

          try {
            const errorData = await uploadResponse.json();

            if (errorData?.detail) {
              uploadError =
                typeof errorData.detail === "string"
                  ? errorData.detail
                  : JSON.stringify(errorData.detail);
            }
          } catch {
            // Keep default error.
          }

          throw new Error(uploadError);
        }

        const uploadResult = await uploadResponse.json();

        uploadedImages =
          uploadResult?.images ||
          uploadResult?.files ||
          [];

        console.log(
          "MotorIQ uploaded images:",
          uploadedImages
        );

        /*
         * ======================================================
         * STEP 2 — AI DAMAGE DETECTION
         * ======================================================
         *
         * This calls the YOLO endpoint:
         *
         * POST /analyze-vehicle-images
         */
        const analysisFormData = new FormData();

        images.forEach((image) => {
          analysisFormData.append("images", image.file);
        });

        const analysisResponse = await fetch(
          `${API_BASE_URL}/analyze-vehicle-images`,
          {
            method: "POST",
            body: analysisFormData,
          }
        );

        if (!analysisResponse.ok) {
          let analysisError =
            `AI image analysis failed (${analysisResponse.status}).`;

          try {
            const errorData = await analysisResponse.json();

            if (errorData?.detail) {
              analysisError =
                typeof errorData.detail === "string"
                  ? errorData.detail
                  : JSON.stringify(errorData.detail);
            }
          } catch {
            // Keep default error.
          }

          throw new Error(analysisError);
        }

        damageAnalysis =
          await analysisResponse.json();

        console.log(
          "MotorIQ AI damage analysis:",
          damageAnalysis
        );
      }

      /*
       * ========================================================
       * STEP 3 — PRICE PREDICTION
       * ========================================================
       */
      const predictionResponse = await fetch(
        `${API_BASE_URL}/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(predictionPayload),
        }
      );

      if (!predictionResponse.ok) {
        let predictionError =
          `Prediction failed (${predictionResponse.status}).`;

        try {
          const errorData =
            await predictionResponse.json();

          if (errorData?.detail) {
            if (Array.isArray(errorData.detail)) {
              predictionError = errorData.detail
                .map(
                  (item) =>
                    item?.msg ||
                    item?.message ||
                    JSON.stringify(item)
                )
                .join(", ");
            } else {
              predictionError =
                typeof errorData.detail === "string"
                  ? errorData.detail
                  : JSON.stringify(errorData.detail);
            }
          }
        } catch {
          // Keep default error.
        }

        throw new Error(predictionError);
      }

      const predictionResult =
        await predictionResponse.json();

      console.log(
        "MotorIQ price prediction:",
        predictionResult
      );

      /*
       * ========================================================
       * STEP 4 — COMPLETE INSPECTION DATA
       * ========================================================
       *
       * IMPORTANT:
       * damageAnalysis is stored here so Result.jsx can read it.
       */
      const inspectionData = {
        vehicle: predictionPayload,

        conditionSummary:
          conditionSummary.trim(),

        images: uploadedImages,

        prediction: predictionResult,

        damageAnalysis: damageAnalysis,

        inspectedAt:
          new Date().toISOString(),
      };

      /*
       * ========================================================
       * STEP 5 — SAVE TO SESSION STORAGE
       * ========================================================
       */
      sessionStorage.setItem(
        "motorIQInspection",
        JSON.stringify(inspectionData)
      );

      console.log(
        "MotorIQ complete inspection:",
        inspectionData
      );

      /*
       * ========================================================
       * STEP 6 — RESULT PAGE
       * ========================================================
       */
      navigate("/result");

    } catch (err) {
      console.error(
        "MotorIQ inspection error:",
        err
      );

      if (
        err instanceof TypeError &&
        err.message
          .toLowerCase()
          .includes("fetch")
      ) {
        setError(
          "Unable to connect to MotorIQ backend. Make sure FastAPI is running at http://127.0.0.1:8000."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong during inspection."
        );
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="inspection-page">

      {/* HEADER */}
      <nav className="inspection-nav">

        <button
          className="inspection-back"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={18} />
          Dashboard
        </button>

        <div className="inspection-logo">
          <span className="logo-mark">
            M
          </span>

          <span>
            Motor<span>IQ</span>
          </span>
        </div>

        <div className="inspection-nav-status">
          <span className="status-dot" />
          AI SYSTEM READY
        </div>

      </nav>

      <main className="inspection-main">

        {/* HEADING */}
        <motion.div
          className="inspection-heading"
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
        >

          <div className="inspection-kicker">
            <ScanLine size={15} />
            MOTORIQ AI INSPECTION
          </div>

          <h1>
            Understand your
            <br />
            <span>vehicle better.</span>
          </h1>

          <p>
            Upload vehicle photos optionally,
            enter the vehicle details, and let
            MotorIQ estimate its market value.
          </p>

        </motion.div>

        {/* PROGRESS */}
        <motion.div
          className="inspection-progress"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >

          <div className="progress-step active">
            <span>01</span>
            Vehicle details
          </div>

          <div className="progress-line" />

          <div className="progress-step">
            <span>02</span>
            AI analysis
          </div>

          <div className="progress-line" />

          <div className="progress-step">
            <span>03</span>
            Valuation
          </div>

        </motion.div>

        {/* PHOTO UPLOAD */}
        <motion.section
          className="upload-section"
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.15,
          }}
        >

          <div className="section-title-row">

            <div>

              <span className="section-label">
                01 / VISUAL INSPECTION
              </span>

              <h2>
                Vehicle photos
                <small className="optional-label">
                  OPTIONAL
                </small>
              </h2>

              <p>
                Upload up to 6 clear photos.
                MotorIQ will analyze them for
                visible vehicle damage.
              </p>

            </div>

            <div className="photo-count">
              {images.length} / 6
            </div>

          </div>

          <div
            className={`upload-box ${
              dragging ? "dragging" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() =>
              setDragging(false)
            }
            onDrop={handleDrop}
          >

            <input
              id="vehicle-images"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handleFileChange}
              disabled={images.length >= 6}
            />

            <label htmlFor="vehicle-images">

              <div className="upload-icon">
                <Camera size={27} />
              </div>

              <h3>
                {dragging
                  ? "Drop your photos here"
                  : "Upload vehicle photos"}
              </h3>

              <p>
                Drag & drop or{" "}
                <span>browse files</span>
              </p>

              <small>
                JPG, PNG or WEBP · Maximum 6 images
              </small>

            </label>

          </div>

          {images.length > 0 && (
            <div className="image-preview-grid">

              {images.map((image) => (
                <div
                  className="image-preview"
                  key={image.id}
                >

                  <img
                    src={image.preview}
                    alt="Vehicle preview"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      removeImage(image.id)
                    }
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>

                </div>
              ))}

            </div>
          )}

        </motion.section>

        {/* VEHICLE DETAILS */}
        <motion.section
          className="vehicle-details-card"
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.2,
          }}
        >

          <div className="details-heading">

            <div className="details-icon">
              <CarFront size={22} />
            </div>

            <div>
              <span>
                02 / VEHICLE INFORMATION
              </span>

              <h2>
                Tell us about your vehicle
              </h2>
            </div>

          </div>

          {/* VEHICLE TYPE */}
          <div className="vehicle-type-selector">

            <button
              type="button"
              className={`vehicle-type ${
                vehicle.vehicle_type === "Car"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeVehicleType("Car")
              }
            >
              <CarFront size={18} />
              Car
            </button>

            <button
              type="button"
              className={`vehicle-type ${
                vehicle.vehicle_type === "Bike"
                  ? "active"
                  : ""
              }`}
              onClick={() =>
                changeVehicleType("Bike")
              }
            >
              <Bike size={18} />
              Bike
            </button>

          </div>

          <div className="vehicle-form-grid">

            {/* BRAND */}
            <div className="vehicle-field">

              <label>
                Brand *
              </label>

              <input
                list="brand-options"
                type="text"
                name="brand"
                placeholder="Select or type brand"
                value={vehicle.brand}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setVehicle((prev) => ({
                    ...prev,
                    brand: value,
                    model: "",
                  }));
                }}
              />

              <datalist id="brand-options">

                {(
                  vehicleBrands[
                    vehicle.vehicle_type
                  ] || []
                ).map((brand) => (
                  <option
                    key={brand}
                    value={brand}
                  />
                ))}

              </datalist>

            </div>

            {/* MODEL */}
            <div className="vehicle-field">

              <label>
                Model *
              </label>

              <input
                list="model-options"
                type="text"
                name="model"
                placeholder={
                  vehicle.brand
                    ? `Select or type ${vehicle.brand} model`
                    : "Select or type model"
                }
                value={vehicle.model}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    model: e.target.value,
                  }))
                }
              />

              <datalist id="model-options">

                {currentModels.map(
                  (model) => (
                    <option
                      key={model}
                      value={model}
                    />
                  )
                )}

              </datalist>

              {vehicle.brand &&
                currentModels.length === 0 && (
                  <span className="field-hint">
                    No suggestion available —
                    you can type the model
                    manually.
                  </span>
                )}

            </div>

            {/* YEAR */}
            <div className="vehicle-field">

              <label>
                Manufacturing Year *
              </label>

              <input
                type="number"
                min="1980"
                max={
                  new Date().getFullYear()
                }
                placeholder="e.g. 2018"
                value={vehicle.year}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    year: e.target.value,
                  }))
                }
              />

            </div>

            {/* KMS */}
            <div className="vehicle-field">

              <label>
                Kilometers Driven *
              </label>

              <input
                type="number"
                min="0"
                placeholder="e.g. 50000"
                value={vehicle.kms_driven}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    kms_driven:
                      e.target.value,
                  }))
                }
              />

            </div>

            {/* FUEL */}
            <div className="vehicle-field">

              <label>
                Fuel Type
              </label>

              <select
                value={vehicle.fuel_type}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    fuel_type:
                      e.target.value,
                  }))
                }
              >

                <option value="Petrol">
                  Petrol
                </option>

                <option value="Diesel">
                  Diesel
                </option>

                <option value="CNG">
                  CNG
                </option>

                <option value="Electric">
                  Electric
                </option>

              </select>

            </div>

            {/* TRANSMISSION */}
            <div className="vehicle-field">

              <label>
                Transmission
              </label>

              <select
                value={vehicle.transmission}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    transmission:
                      e.target.value,
                  }))
                }
              >

                <option value="Manual">
                  Manual
                </option>

                <option value="Automatic">
                  Automatic
                </option>

              </select>

            </div>

            {/* OWNER */}
            <div className="vehicle-field">

              <label>
                Previous Owners
              </label>

              <select
                value={vehicle.owner}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    owner: e.target.value,
                  }))
                }
              >

                <option value="1">
                  1st Owner
                </option>

                <option value="2">
                  2nd Owner
                </option>

                <option value="3">
                  3rd Owner
                </option>

                <option value="4">
                  4th Owner
                </option>

                <option value="5">
                  5th Owner
                </option>

                <option value="6">
                  6th Owner
                </option>

              </select>

            </div>

            {/* CITY */}
            <div className="vehicle-field">

              <label>
                City *
              </label>

              <input
                type="text"
                placeholder="e.g. Noida"
                value={vehicle.city}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    city: e.target.value,
                  }))
                }
              />

            </div>

            {/* BODY TYPE */}
            <div className="vehicle-field">

              <label>
                Body Type
              </label>

              <select
                value={vehicle.body_type}
                onChange={(e) =>
                  setVehicle((prev) => ({
                    ...prev,
                    body_type:
                      e.target.value,
                  }))
                }
              >

                {vehicle.vehicle_type ===
                "Car" ? (
                  <>
                    <option value="Hatchback">
                      Hatchback
                    </option>

                    <option value="Sedan">
                      Sedan
                    </option>

                    <option value="SUV">
                      SUV
                    </option>

                    <option value="MPV">
                      MPV
                    </option>

                    <option value="Coupe">
                      Coupe
                    </option>

                    <option value="Convertible">
                      Convertible
                    </option>
                  </>
                ) : (
                  <option value="Bike">
                    Bike
                  </option>
                )}

              </select>

            </div>

          </div>

        </motion.section>

        {/* CONDITION */}
        <motion.section
          className="condition-card"
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.25,
          }}
        >

          <div className="condition-heading">

            <FileText size={22} />

            <div>

              <span>
                03 / ADDITIONAL CONTEXT
              </span>

              <h2>
                Condition notes
                <small>
                  OPTIONAL
                </small>
              </h2>

            </div>

          </div>

          <textarea
            placeholder="Describe anything you know about the vehicle — scratches, dents, accidents, repainting, service history, modifications, or other relevant details..."
            value={conditionSummary}
            onChange={(e) =>
              setConditionSummary(
                e.target.value
              )
            }
          />

        </motion.section>

        {/* ERROR */}
        {error && (
          <motion.div
            className="inspection-error"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            {error}
          </motion.div>
        )}

        {/* SUCCESS */}
        {message && (
          <motion.div
            className="inspection-success"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
          >
            {message}
          </motion.div>
        )}

        {/* FINAL ACTION */}
        <motion.div
          className="inspection-final-action"
          initial={{
            opacity: 0,
            y: 25,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            delay: 0.3,
          }}
        >

          <div>

            <span>
              READY FOR ANALYSIS?
            </span>

            <p>
              {images.length > 0
                ? `${images.length} photo${
                    images.length > 1
                      ? "s"
                      : ""
                  } + vehicle details will be analyzed.`
                : "Vehicle details will be analyzed. Photo upload is optional."}
            </p>

          </div>

          <button
            type="button"
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={loading}
          >

            {loading ? (
              <>
                <Loader2
                  size={18}
                  className="spin"
                />

                Analyzing...
              </>
            ) : (
              <>
                <ScanLine size={18} />

                Analyze Vehicle

                <ChevronRight
                  size={17}
                />
              </>
            )}

          </button>

        </motion.div>

      </main>

    </div>
  );
}

export default Inspection;