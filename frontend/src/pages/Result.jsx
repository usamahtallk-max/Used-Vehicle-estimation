import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Gauge,
  Image as ImageIcon,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";

const API_BASE_URL = "http://127.0.0.1:8000";

/* =========================================================
   CONFIGURATION
========================================================= */

/*
  Headlight detections are visually more prone to false positives
  because reflections, lamps, shadows and normal headlight shapes
  can resemble damage.

  We keep the model class, but require a higher confidence before
  displaying Headlight-damage as confirmed damage.
*/
const HEADLIGHT_MIN_CONFIDENCE = 0.80;

/* =========================================================
   HELPERS
========================================================= */

function formatDamageName(name) {
  if (!name) return "Unknown damage";

  return String(name)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getConfidenceValue(detection) {
  const value =
    detection?.confidence ??
    detection?.score ??
    detection?.probability ??
    0;

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return number > 1 ? number / 100 : number;
}

function getConfidencePercent(detection) {
  if (
    detection?.confidence_percent !== undefined &&
    detection?.confidence_percent !== null
  ) {
    const percent = Number(detection.confidence_percent);

    if (Number.isFinite(percent)) {
      return Math.round(percent);
    }
  }

  return Math.round(getConfidenceValue(detection) * 100);
}

function getConfidenceLabel(detection) {
  const backendLevel = detection?.confidence_level;

  if (backendLevel) {
    if (String(backendLevel).toLowerCase() === "high") {
      return "High confidence";
    }

    if (String(backendLevel).toLowerCase() === "moderate") {
      return "Moderate confidence";
    }
  }

  const percent = getConfidencePercent(detection);

  if (percent >= 60) {
    return "High confidence";
  }

  if (percent >= 40) {
    return "Moderate confidence";
  }

  return "Low confidence";
}

/*
  Normalize damage class names so different backend spellings
  can be compared safely.
*/
function normalizeDamageName(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

function isHeadlightDamage(detection) {
  const name =
    detection?.damage ||
    detection?.class_name ||
    detection?.label ||
    "";

  const normalized = normalizeDamageName(name);

  return (
    normalized === "headlightdamage" ||
    normalized === "headlight"
  );
}

/*
  Conservative filter for headlight detections.

  Example:
  Headlight-damage @ 61% -> hidden
  Headlight-damage @ 77% -> hidden
  Headlight-damage @ 84% -> shown

  Other damage classes are not affected.
*/
function isAcceptedDetection(detection) {
  if (!detection) {
    return false;
  }

  if (isHeadlightDamage(detection)) {
    return getConfidenceValue(detection) >= HEADLIGHT_MIN_CONFIDENCE;
  }

  return true;
}

function getImageUrl(image) {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("blob:")
    ) {
      return image;
    }

    const clean = image
      .replace(/\\/g, "/")
      .replace(/^\/+/, "")
      .replace(/^.*uploads\//, "");

    return `${API_BASE_URL}/uploads/${clean}`;
  }

  if (typeof image === "object") {
    const possibleUrl =
      image.url ||
      image.image_url ||
      image.imageUrl ||
      image.src ||
      image.file_url ||
      image.fileUrl;

    if (possibleUrl) {
      if (
        possibleUrl.startsWith("http://") ||
        possibleUrl.startsWith("https://") ||
        possibleUrl.startsWith("blob:")
      ) {
        return possibleUrl;
      }

      return `${API_BASE_URL}/${String(possibleUrl)
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")}`;
    }

    const filename =
      image.filename ||
      image.file_name ||
      image.fileName ||
      image.name;

    if (filename) {
      return `${API_BASE_URL}/uploads/${filename}`;
    }

    const path =
      image.path ||
      image.file_path ||
      image.filePath ||
      image.original_path;

    if (path) {
      const cleanPath = String(path).replace(/\\/g, "/");
      const filenameOnly = cleanPath.split("/").pop();

      return `${API_BASE_URL}/uploads/${filenameOnly}`;
    }
  }

  return "";
}

function getImageFilename(image) {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image.replace(/\\/g, "/").split("/").pop();
  }

  return (
    image.filename ||
    image.file_name ||
    image.fileName ||
    image.name ||
    ""
  );
}

function getOriginalImageName(image) {
  if (!image || typeof image !== "object") {
    return "";
  }

  return (
    image.original_name ||
    image.originalName ||
    image.name ||
    ""
  );
}

function getDetectionKey(
  detection,
  imageIndex,
  detectionIndex
) {
  const bbox = detection?.bbox || {};

  return [
    imageIndex,
    detectionIndex,
    detection?.class_id ?? "",
    detection?.damage ?? "",
    bbox.x1 ?? "",
    bbox.y1 ?? "",
    bbox.x2 ?? "",
    bbox.y2 ?? "",
  ].join("|");
}

/* =========================================================
   PRICE EXTRACTION
========================================================= */

/*
  Handles common backend response shapes.

  Supported examples:

  {
    predicted_price: 173000
  }

  {
    predictedPrice: 173000
  }

  {
    prediction: {
      predicted_price: 173000
    }
  }

  {
    result: {
      predicted_price: 173000
    }
  }

  {
    data: {
      prediction: {
        predicted_price: 173000
      }
    }
  }
*/

function findPriceInObject(object, depth = 0) {
  if (!object || typeof object !== "object") {
    return null;
  }

  if (depth > 5) {
    return null;
  }

  const directKeys = [
    "predicted_price",
    "predictedPrice",
    "estimated_price",
    "estimatedPrice",
    "selling_price",
    "sellingPrice",
    "market_price",
    "marketPrice",
    "price",
  ];

  for (const key of directKeys) {
    if (
      Object.prototype.hasOwnProperty.call(object, key)
    ) {
      const value = Number(object[key]);

      if (Number.isFinite(value) && value > 0) {
        return value;
      }
    }
  }

  const priorityKeys = [
    "prediction",
    "result",
    "data",
    "response",
    "output",
    "valuation",
  ];

  for (const key of priorityKeys) {
    if (
      object[key] &&
      typeof object[key] === "object"
    ) {
      const nestedPrice = findPriceInObject(
        object[key],
        depth + 1
      );

      if (
        nestedPrice !== null &&
        Number.isFinite(nestedPrice) &&
        nestedPrice > 0
      ) {
        return nestedPrice;
      }
    }
  }

  return null;
}

function getEstimatedPrice(prediction) {
  const price = findPriceInObject(prediction);

  if (
    price === null ||
    !Number.isFinite(Number(price)) ||
    Number(price) <= 0
  ) {
    return null;
  }

  return Number(price);
}

function formatCurrency(value) {
  const number = Number(value);

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return "₹ —";
  }

  return `₹${Math.round(number).toLocaleString(
    "en-IN"
  )}`;
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Result() {
  const navigate = useNavigate();

  const [inspection, setInspection] = useState(null);

  const [selectedImageIndex, setSelectedImageIndex] =
    useState(0);

  const [selectedDetection, setSelectedDetection] =
    useState(null);

  const [imageError, setImageError] =
    useState(false);

  const [imageLoading, setImageLoading] =
    useState(true);

  const [imageNaturalSize, setImageNaturalSize] =
    useState({
      width: 0,
      height: 0,
    });

  /* =========================================================
     LOAD INSPECTION
  ========================================================= */

  useEffect(() => {
    const stored =
      sessionStorage.getItem("motorIQInspection");

    if (!stored) {
      navigate("/inspection");
      return;
    }

    try {
      const parsed = JSON.parse(stored);

      console.log(
        "MotorIQ result data:",
        parsed
      );

      console.log(
        "MotorIQ prediction:",
        parsed?.prediction
      );

      setInspection(parsed);
    } catch (error) {
      console.error(
        "Result loading error:",
        error
      );

      navigate("/inspection");
    }
  }, [navigate]);

  /* =========================================================
     RAW DATA
  ========================================================= */

  const damageAnalysis =
    inspection?.damageAnalysis ||
    inspection?.damage_analysis ||
    inspection?.visionAnalysis ||
    null;

  const vehicle =
    inspection?.vehicle || {};

  const prediction =
    inspection?.prediction || {};

  const storedImages =
    Array.isArray(inspection?.images)
      ? inspection.images
      : [];

  const analyzedImages =
    Array.isArray(damageAnalysis?.images)
      ? damageAnalysis.images
      : [];

  /* =========================================================
     NORMALIZE IMAGE DATA
  ========================================================= */

  const normalizedImages = useMemo(() => {
    if (storedImages.length > 0) {
      return storedImages.map(
        (sourceImage, index) => {
          const sourceFilename =
            getImageFilename(sourceImage);

          const sourceOriginalName =
            getOriginalImageName(sourceImage);

          const analyzed =
            analyzedImages.find((item) => {
              const analyzedFilename =
                item?.filename ||
                item?.file_name ||
                item?.fileName ||
                "";

              const analyzedOriginalName =
                item?.original_name ||
                item?.originalName ||
                "";

              return (
                (sourceFilename &&
                  analyzedFilename &&
                  sourceFilename ===
                    analyzedFilename) ||
                (sourceOriginalName &&
                  analyzedOriginalName &&
                  sourceOriginalName ===
                    analyzedOriginalName)
              );
            }) ||
            analyzedImages[index] ||
            null;

          const rawDetections =
            Array.isArray(
              analyzed?.detections
            )
              ? analyzed.detections
              : [];

          /*
            Apply the conservative detection filter.
          */
          const detections =
            rawDetections.filter(
              isAcceptedDetection
            );

          return {
            source: sourceImage,

            analyzed,

            url: getImageUrl(sourceImage),

            filename:
              analyzed?.filename ||
              sourceFilename ||
              `image-${index + 1}`,

            originalName:
              analyzed?.original_name ||
              sourceOriginalName ||
              `Image ${index + 1}`,

            width:
              Number(
                analyzed?.image_width ||
                  sourceImage?.image_width ||
                  sourceImage?.width ||
                  0
              ) || 0,

            height:
              Number(
                analyzed?.image_height ||
                  sourceImage?.image_height ||
                  sourceImage?.height ||
                  0
              ) || 0,

            detections,
          };
        }
      );
    }

    /*
      Legacy/fallback case.
    */

    if (analyzedImages.length > 0) {
      return analyzedImages.map(
        (image, index) => {
          const rawDetections =
            Array.isArray(
              image?.detections
            )
              ? image.detections
              : [];

          const detections =
            rawDetections.filter(
              isAcceptedDetection
            );

          return {
            source: image,

            analyzed: image,

            url: getImageUrl(image),

            filename:
              image?.filename ||
              `image-${index + 1}`,

            originalName:
              image?.original_name ||
              `Image ${index + 1}`,

            width:
              Number(
                image?.image_width || 0
              ) || 0,

            height:
              Number(
                image?.image_height || 0
              ) || 0,

            detections,
          };
        }
      );
    }

    return [];
  }, [
    storedImages,
    analyzedImages,
  ]);

  /* =========================================================
     SELECTED IMAGE
  ========================================================= */

  const selectedImage =
    normalizedImages[
      selectedImageIndex
    ] ||
    normalizedImages[0] ||
    null;

  const selectedDetections =
    Array.isArray(
      selectedImage?.detections
    )
      ? selectedImage.detections
      : [];

  /* =========================================================
     ALL DETECTIONS
  ========================================================= */

  const allDetections = useMemo(() => {
    return normalizedImages.flatMap(
      (image, imageIndex) => {
        if (
          !Array.isArray(
            image.detections
          )
        ) {
          return [];
        }

        return image.detections.map(
          (detection, detectionIndex) => ({
            ...detection,

            _imageIndex:
              imageIndex,

            _detectionIndex:
              detectionIndex,

            _imageName:
              image.originalName ||
              image.filename ||
              `Image ${imageIndex + 1}`,

            _imageUrl:
              image.url,

            _key:
              getDetectionKey(
                detection,
                imageIndex,
                detectionIndex
              ),
          })
        );
      }
    );
  }, [normalizedImages]);

  /* =========================================================
     PRICE
  ========================================================= */

  const estimatedPrice =
    useMemo(
      () =>
        getEstimatedPrice(
          prediction
        ),
      [prediction]
    );

  /*
    Debugging information.

    Open browser console and you should see the exact
    prediction response if the price is still unavailable.
  */
  useEffect(() => {
    if (inspection) {
      console.log(
        "MotorIQ FINAL PREDICTION OBJECT:",
        prediction
      );

      console.log(
        "MotorIQ EXTRACTED PRICE:",
        estimatedPrice
      );
    }
  }, [
    inspection,
    prediction,
    estimatedPrice,
  ]);

  /* =========================================================
     DAMAGE STATUS
  ========================================================= */

  const damageDetected =
    allDetections.length > 0;

  /* =========================================================
     SELECTED IMAGE EFFECTS
  ========================================================= */

  useEffect(() => {
    setImageError(false);

    setImageLoading(true);

    setImageNaturalSize({
      width: 0,
      height: 0,
    });

    setSelectedDetection(null);
  }, [selectedImageIndex]);

  /* =========================================================
     VEHICLE DETAILS
  ========================================================= */

  const vehicleType =
    vehicle?.vehicle_type ||
    vehicle?.vehicleType ||
    "Vehicle";

  const brand =
    vehicle?.brand ||
    "Unknown brand";

  const model =
    vehicle?.model_name ||
    vehicle?.model ||
    "Unknown model";

  const year =
    vehicle?.year ||
    "—";

  const kmsDriven =
    vehicle?.kms_driven ??
    vehicle?.kmsDriven ??
    null;

  const fuelType =
    vehicle?.fuel_type ||
    vehicle?.fuelType ||
    "—";

  const transmission =
    vehicle?.transmission ||
    "—";

  const owner =
    vehicle?.owner ??
    "—";

  const city =
    vehicle?.city ||
    "—";

  const bodyType =
    vehicle?.body_type ||
    vehicle?.bodyType ||
    "—";

  const vehicleAge =
    vehicle?.vehicle_age ??
    vehicle?.vehicleAge ??
    null;

  /* =========================================================
     OVERALL AI CONFIDENCE
  ========================================================= */

  const averageConfidence =
    useMemo(() => {
      if (!allDetections.length) {
        return 0;
      }

      const total =
        allDetections.reduce(
          (sum, detection) =>
            sum +
            getConfidenceValue(
              detection
            ),
          0
        );

      return Math.round(
        (total /
          allDetections.length) *
          100
      );
    }, [allDetections]);

  const overallConfidenceLabel =
    useMemo(() => {
      if (!allDetections.length) {
        return "No detections";
      }

      if (averageConfidence >= 60) {
        return "High";
      }

      if (averageConfidence >= 40) {
        return "Moderate";
      }

      return "Low";
    }, [
      allDetections,
      averageConfidence,
    ]);

  /* =========================================================
     UNIQUE DAMAGE TYPES
  ========================================================= */

  const damageTypes =
    useMemo(() => {
      const map = new Map();

      allDetections.forEach(
        (detection) => {
          const name =
            detection?.damage ||
            detection?.class_name ||
            detection?.label ||
            "Unknown damage";

          const existing =
            map.get(name);

          if (existing) {
            existing.count += 1;
          } else {
            map.set(name, {
              name,
              count: 1,
            });
          }
        }
      );

      return Array.from(
        map.values()
      );
    }, [allDetections]);

  /* =========================================================
     BOUNDING BOX
  ========================================================= */

  function getDetectionStyle(
    detection
  ) {
    if (!detection?.bbox) {
      return {
        display: "none",
      };
    }

    const sourceWidth =
      Number(
        selectedImage?.width ||
          imageNaturalSize.width ||
          0
      );

    const sourceHeight =
      Number(
        selectedImage?.height ||
          imageNaturalSize.height ||
          0
      );

    if (
      !sourceWidth ||
      !sourceHeight
    ) {
      return {
        display: "none",
      };
    }

    const x1 =
      Number(detection.bbox.x1);

    const y1 =
      Number(detection.bbox.y1);

    const x2 =
      Number(detection.bbox.x2);

    const y2 =
      Number(detection.bbox.y2);

    if (
      !Number.isFinite(x1) ||
      !Number.isFinite(y1) ||
      !Number.isFinite(x2) ||
      !Number.isFinite(y2)
    ) {
      return {
        display: "none",
      };
    }

    const left =
      Math.max(
        0,
        Math.min(
          100,
          (x1 / sourceWidth) * 100
        )
      );

    const top =
      Math.max(
        0,
        Math.min(
          100,
          (y1 / sourceHeight) * 100
        )
      );

    const right =
      Math.max(
        0,
        Math.min(
          100,
          (x2 / sourceWidth) * 100
        )
      );

    const bottom =
      Math.max(
        0,
        Math.min(
          100,
          (y2 / sourceHeight) * 100
        )
      );

    const width =
      Math.max(
        0,
        right - left
      );

    const height =
      Math.max(
        0,
        bottom - top
      );

    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      height: `${height}%`,
    };
  }

  /* =========================================================
     IMAGE SELECT
  ========================================================= */

  function handleImageSelect(index) {
    setSelectedImageIndex(index);

    setSelectedDetection(null);

    setImageError(false);

    setImageLoading(true);
  }

  /* =========================================================
     DAMAGE SELECT
  ========================================================= */

  function handleDetectionSelect(
    imageIndex,
    detectionIndex
  ) {
    setSelectedImageIndex(
      imageIndex
    );

    setSelectedDetection(
      detectionIndex
    );
  }

  /* =========================================================
     RESET
  ========================================================= */

  function handleNewInspection() {
    sessionStorage.removeItem(
      "motorIQInspection"
    );

    navigate("/inspection");
  }

  /* =========================================================
     DASHBOARD
  ========================================================= */

  function handleDashboard() {
    navigate("/dashboard");
  }

  /* =========================================================
     REPORT
  ========================================================= */

  function handleReport() {
    window.print();
  }

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="motiq-result-page">

      <style>{`

        * {
          box-sizing: border-box;
        }

        .motiq-result-page {
          min-height: 100vh;
          background:
            radial-gradient(
              circle at 15% 10%,
              rgba(0, 229, 255, 0.07),
              transparent 28%
            ),
            radial-gradient(
              circle at 85% 80%,
              rgba(110, 80, 255, 0.06),
              transparent 30%
            ),
            #05070a;
          color: #f5f7fa;
          display: flex;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .motiq-sidebar {
          width: 240px;
          min-height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;
          border-right: 1px solid rgba(255,255,255,0.07);
          background:
            linear-gradient(
              180deg,
              rgba(10,14,19,0.98),
              rgba(5,7,10,0.98)
            );
          padding: 28px 18px;
          z-index: 20;
        }

        .motiq-logo {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-bottom: 38px;
          padding: 0 8px;
        }

        .motiq-logo-icon {
          width: 38px;
          height: 38px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background:
            linear-gradient(
              135deg,
              #00e5ff,
              #007bff
            );
          color: #001015;
          box-shadow:
            0 0 28px rgba(0,229,255,0.18);
        }

        .motiq-logo-text {
          font-size: 21px;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .motiq-logo-sub {
          font-size: 9px;
          color: #69737e;
          letter-spacing: 1.7px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .motiq-sidebar-section {
          margin-bottom: 26px;
        }

        .motiq-sidebar-label {
          padding: 0 10px;
          margin-bottom: 10px;
          color: #58616b;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.3px;
          text-transform: uppercase;
        }

        .motiq-nav-button {
          width: 100%;
          border: 0;
          background: transparent;
          color: #7e8791;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 11px;
          border-radius: 12px;
          cursor: pointer;
          font-size: 13px;
          text-align: left;
          transition:
            background 0.2s ease,
            color 0.2s ease,
            transform 0.2s ease;
        }

        .motiq-nav-button:hover {
          color: #fff;
          background: rgba(255,255,255,0.045);
          transform: translateX(2px);
        }

        .motiq-nav-button.active {
          color: #fff;
          background:
            linear-gradient(
              90deg,
              rgba(0,229,255,0.13),
              rgba(0,229,255,0.025)
            );
        }

        .motiq-sidebar-bottom {
          position: absolute;
          left: 18px;
          right: 18px;
          bottom: 22px;
        }

        .motiq-user-box {
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
          border-radius: 14px;
          padding: 12px;
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .motiq-user-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: rgba(0,229,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00e5ff;
        }

        .motiq-user-title {
          font-size: 12px;
          font-weight: 700;
        }

        .motiq-user-sub {
          margin-top: 2px;
          font-size: 10px;
          color: #66707b;
        }

        .motiq-content {
          margin-left: 240px;
          width: calc(100% - 240px);
          min-height: 100vh;
        }

        .motiq-topbar {
          height: 70px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          background: rgba(5,7,10,0.78);
          backdrop-filter: blur(18px);
          position: sticky;
          top: 0;
          z-index: 15;
        }

        .motiq-back-button {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 0;
          color: #89939e;
          background: transparent;
          cursor: pointer;
          font-size: 12px;
          padding: 8px 0;
        }

        .motiq-back-button:hover {
          color: #fff;
        }

        .motiq-top-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #6f7883;
        }

        .motiq-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #24e58b;
          box-shadow: 0 0 10px rgba(36,229,139,0.5);
        }

        .motiq-main {
          max-width: 1500px;
          margin: 0 auto;
          padding: 38px 38px 60px;
        }

        .motiq-heading-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 28px;
        }

        .motiq-eyebrow {
          color: #00e5ff;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
          text-transform: uppercase;
          margin-bottom: 9px;
        }

        .motiq-heading {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          line-height: 1;
          letter-spacing: -1.7px;
        }

        .motiq-heading-description {
          color: #78828d;
          margin-top: 10px;
          max-width: 670px;
          font-size: 13px;
          line-height: 1.65;
        }

        .motiq-header-actions {
          display: flex;
          gap: 9px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .motiq-secondary-button,
        .motiq-primary-button {
          min-height: 40px;
          border-radius: 11px;
          padding: 0 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 700;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border 0.2s ease;
        }

        .motiq-secondary-button {
          color: #aeb7c0;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .motiq-secondary-button:hover {
          color: #fff;
          background: rgba(255,255,255,0.07);
          transform: translateY(-1px);
        }

        .motiq-primary-button {
          color: #001015;
          background: #00e5ff;
          border: 1px solid #00e5ff;
        }

        .motiq-primary-button:hover {
          transform: translateY(-1px);
          background: #35ebff;
        }

        .motiq-vehicle-card {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,0.045),
              rgba(255,255,255,0.018)
            );
          padding: 24px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 25px;
          margin-bottom: 20px;
          overflow: hidden;
          position: relative;
        }

        .motiq-vehicle-card::after {
          content: "";
          position: absolute;
          width: 240px;
          height: 240px;
          right: -100px;
          top: -150px;
          border-radius: 50%;
          background: rgba(0,229,255,0.06);
          filter: blur(10px);
        }

        .motiq-vehicle-info {
          position: relative;
          z-index: 1;
        }

        .motiq-vehicle-label {
          color: #69737e;
          text-transform: uppercase;
          font-size: 9px;
          letter-spacing: 1.4px;
          font-weight: 800;
          margin-bottom: 8px;
        }

        .motiq-vehicle-name {
          margin: 0;
          font-size: 25px;
          letter-spacing: -0.8px;
        }

        .motiq-vehicle-meta {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .motiq-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.07);
          color: #8f99a3;
          background: rgba(255,255,255,0.025);
          font-size: 10px;
        }

        .motiq-price-block {
          min-width: 210px;
          position: relative;
          z-index: 1;
          padding-left: 24px;
          border-left: 1px solid rgba(255,255,255,0.07);
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .motiq-price-label {
          color: #69737e;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 1.3px;
          font-weight: 800;
        }

        .motiq-price {
          color: #00e5ff;
          font-size: 30px;
          font-weight: 850;
          letter-spacing: -1px;
          margin-top: 4px;
        }

        .motiq-price-sub {
          color: #59636d;
          font-size: 10px;
          margin-top: 4px;
        }

        .motiq-inspection-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(320px, 0.8fr);
          gap: 20px;
          align-items: start;
        }

        .motiq-card {
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          background: rgba(255,255,255,0.022);
          overflow: hidden;
        }

        .motiq-card-header {
          padding: 17px 19px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .motiq-card-title {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
          font-weight: 750;
        }

        .motiq-card-title svg {
          color: #00e5ff;
        }

        .motiq-card-subtitle {
          color: #68727d;
          font-size: 10px;
        }

        .motiq-image-area {
          padding: 18px;
        }

        .motiq-image-stage {
          width: 100%;
          position: relative;
          overflow: hidden;
          background: #020406;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.06);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.02);
        }

        .motiq-image-stage > img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: fill;
          user-select: none;
        }

        .motiq-image-loading {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #77818b;
          background: rgba(0,0,0,0.28);
          font-size: 11px;
          pointer-events: none;
        }

        .motiq-image-error {
          min-height: 340px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 10px;
          color: #6f7882;
          text-align: center;
          padding: 30px;
        }

        .motiq-image-error svg {
          color: #ff5964;
        }

        .damage-marker {
          position: absolute;
          padding: 0;
          margin: 0;
          border: 2px solid #ff3b47;
          border-radius: 9px;
          background: rgba(255,59,71,0.10);
          box-shadow:
            0 0 0 1px rgba(255,59,71,0.15),
            0 0 18px rgba(255,59,71,0.13);
          cursor: pointer;
          transition:
            background 0.2s ease,
            border 0.2s ease,
            box-shadow 0.2s ease;
          z-index: 3;
        }

        .damage-marker:hover,
        .damage-marker.selected {
          background: rgba(255,59,71,0.22);
          border-color: #ff7780;
          box-shadow:
            0 0 0 2px rgba(255,59,71,0.12),
            0 0 24px rgba(255,59,71,0.28);
        }

        .damage-marker-label {
          position: absolute;
          left: -2px;
          top: -29px;
          white-space: nowrap;
          max-width: 220px;
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 6px 8px;
          border-radius: 7px;
          background: rgba(8,10,13,0.94);
          border: 1px solid rgba(255,59,71,0.35);
          color: #ffb2b7;
          font-size: 9px;
          font-weight: 750;
          box-shadow: 0 8px 22px rgba(0,0,0,0.28);
          pointer-events: none;
        }

        .motiq-thumbnail-row {
          display: flex;
          gap: 9px;
          overflow-x: auto;
          padding: 13px 18px 18px;
          scrollbar-width: thin;
        }

        .motiq-thumbnail {
          position: relative;
          flex: 0 0 76px;
          width: 76px;
          height: 58px;
          padding: 0;
          border-radius: 9px;
          overflow: hidden;
          background: #0b0f13;
          border: 1px solid rgba(255,255,255,0.08);
          cursor: pointer;
          transition:
            border 0.2s ease,
            transform 0.2s ease;
        }

        .motiq-thumbnail:hover {
          transform: translateY(-1px);
          border-color: rgba(255,255,255,0.2);
        }

        .motiq-thumbnail.active {
          border-color: #00e5ff;
          box-shadow:
            0 0 0 1px rgba(0,229,255,0.15),
            0 0 18px rgba(0,229,255,0.08);
        }

        .motiq-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .motiq-thumbnail-number {
          position: absolute;
          right: 4px;
          bottom: 4px;
          min-width: 17px;
          height: 17px;
          padding: 0 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          background: rgba(0,0,0,0.76);
          color: #fff;
          font-size: 8px;
          font-weight: 800;
        }

        .motiq-thumbnail-damage {
          position: absolute;
          left: 4px;
          top: 4px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ff4350;
          box-shadow: 0 0 9px rgba(255,67,80,0.8);
        }

        .motiq-no-images {
          padding: 45px 20px;
          text-align: center;
          color: #66717c;
        }

        .motiq-no-images svg {
          margin-bottom: 10px;
          color: #00e5ff;
        }

        .motiq-damage-panel {
          min-height: 100%;
        }

        .motiq-analysis-summary {
          padding: 18px;
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          border-bottom: 1px solid rgba(255,255,255,0.07);
        }

        .motiq-analysis-stat {
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.025);
          border-radius: 12px;
          padding: 13px;
        }

        .motiq-analysis-stat-label {
          color: #68727d;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
        }

        .motiq-analysis-stat-value {
          margin-top: 5px;
          font-size: 19px;
          font-weight: 800;
        }

        .motiq-analysis-stat-value.cyan {
          color: #00e5ff;
        }

        .motiq-analysis-stat-value.red {
          color: #ff5964;
        }

        .motiq-damage-list {
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          max-height: 560px;
          overflow-y: auto;
        }

        .motiq-damage-item {
          width: 100%;
          text-align: left;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.025);
          border-radius: 13px;
          padding: 10px;
          display: grid;
          grid-template-columns: 54px minmax(0,1fr) auto;
          align-items: center;
          gap: 11px;
          cursor: pointer;
          color: inherit;
          transition:
            border 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .motiq-damage-item:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.13);
          transform: translateY(-1px);
        }

        .motiq-damage-item.selected {
          border-color: rgba(255,59,71,0.42);
          background: rgba(255,59,71,0.06);
        }

        .motiq-damage-thumb {
          width: 54px;
          height: 54px;
          border-radius: 9px;
          overflow: hidden;
          background: #0b0f13;
          border: 1px solid rgba(255,255,255,0.06);
        }

        .motiq-damage-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .motiq-damage-name {
          font-size: 12px;
          font-weight: 750;
          color: #e7ebef;
        }

        .motiq-damage-image-name {
          margin-top: 4px;
          color: #626d78;
          font-size: 9px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .motiq-damage-confidence {
          margin-top: 7px;
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .motiq-confidence-bar {
          width: 74px;
          height: 4px;
          background: rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
        }

        .motiq-confidence-fill {
          height: 100%;
          border-radius: inherit;
          background: #00e5ff;
        }

        .motiq-confidence-text {
          font-size: 9px;
          color: #78838e;
        }

        .motiq-damage-arrow {
          color: #59636e;
        }

        .motiq-no-damage {
          padding: 42px 20px;
          text-align: center;
        }

        .motiq-no-damage-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 12px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #24e58b;
          background: rgba(36,229,139,0.08);
          border: 1px solid rgba(36,229,139,0.14);
        }

        .motiq-no-damage-title {
          font-size: 14px;
          font-weight: 750;
        }

        .motiq-no-damage-text {
          max-width: 300px;
          margin: 7px auto 0;
          color: #65707a;
          font-size: 10px;
          line-height: 1.65;
        }

        .motiq-metrics {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-top: 20px;
        }

        .motiq-metric {
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.022);
          border-radius: 15px;
          padding: 17px;
        }

        .motiq-metric-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: #65707a;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 800;
        }

        .motiq-metric-top svg {
          color: #00e5ff;
        }

        .motiq-metric-value {
          margin-top: 8px;
          font-size: 19px;
          font-weight: 800;
        }

        .motiq-metric-sub {
          color: #626c76;
          font-size: 9px;
          margin-top: 4px;
        }

        .motiq-details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 20px;
        }

        .motiq-details-content {
          padding: 18px;
        }

        .motiq-detail-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 9px;
        }

        .motiq-detail {
          padding: 11px;
          border-radius: 11px;
          border: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
        }

        .motiq-detail-label {
          color: #626d77;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.9px;
          font-weight: 800;
        }

        .motiq-detail-value {
          margin-top: 4px;
          color: #dce1e6;
          font-size: 11px;
          font-weight: 700;
          word-break: break-word;
        }

        .motiq-condition {
          color: #9ba5ae;
          font-size: 12px;
          line-height: 1.8;
          white-space: pre-wrap;
        }

        .motiq-condition-empty {
          color: #5f6973;
          font-size: 11px;
          line-height: 1.7;
        }

        .motiq-ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border-radius: 8px;
          color: #00e5ff;
          background: rgba(0,229,255,0.07);
          border: 1px solid rgba(0,229,255,0.12);
          font-size: 9px;
          font-weight: 800;
        }

        .motiq-footer-actions {
          display: flex;
          justify-content: center;
          gap: 10px;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        @media (max-width: 1150px) {
          .motiq-inspection-grid {
            grid-template-columns: 1fr;
          }

          .motiq-damage-list {
            max-height: none;
          }

          .motiq-metrics {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 850px) {
          .motiq-sidebar {
            width: 72px;
            padding: 20px 10px;
          }

          .motiq-logo {
            justify-content: center;
            padding: 0;
          }

          .motiq-logo-text,
          .motiq-logo-sub,
          .motiq-sidebar-label,
          .motiq-nav-button span,
          .motiq-sidebar-bottom {
            display: none;
          }

          .motiq-logo {
            margin-bottom: 25px;
          }

          .motiq-nav-button {
            justify-content: center;
            padding: 12px;
          }

          .motiq-content {
            margin-left: 72px;
            width: calc(100% - 72px);
          }

          .motiq-main {
            padding: 28px 20px 50px;
          }

          .motiq-topbar {
            padding: 0 20px;
          }

          .motiq-heading-row {
            align-items: flex-start;
            flex-direction: column;
          }

          .motiq-header-actions {
            justify-content: flex-start;
          }

          .motiq-vehicle-card {
            grid-template-columns: 1fr;
          }

          .motiq-price-block {
            border-left: 0;
            border-top: 1px solid rgba(255,255,255,0.07);
            padding-left: 0;
            padding-top: 17px;
          }

          .motiq-details-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 600px) {
          .motiq-main {
            padding: 22px 13px 40px;
          }

          .motiq-topbar {
            height: 60px;
            padding: 0 14px;
          }

          .motiq-top-status {
            display: none;
          }

          .motiq-heading {
            font-size: 29px;
          }

          .motiq-heading-description {
            font-size: 12px;
          }

          .motiq-card-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .motiq-analysis-summary {
            grid-template-columns: 1fr 1fr;
          }

          .motiq-metrics {
            grid-template-columns: 1fr 1fr;
          }

          .motiq-detail-grid {
            grid-template-columns: 1fr 1fr;
          }

          .motiq-damage-item {
            grid-template-columns: 48px minmax(0,1fr) auto;
          }

          .motiq-damage-thumb {
            width: 48px;
            height: 48px;
          }

          .motiq-secondary-button,
          .motiq-primary-button {
            width: 100%;
            justify-content: center;
          }

          .motiq-header-actions {
            width: 100%;
          }

          .motiq-footer-actions {
            flex-direction: column;
          }

          .motiq-footer-actions button {
            width: 100%;
            justify-content: center;
          }
        }

        @media print {
          .motiq-sidebar,
          .motiq-topbar,
          .motiq-header-actions,
          .motiq-footer-actions {
            display: none !important;
          }

          .motiq-content {
            margin-left: 0;
            width: 100%;
          }

          .motiq-result-page {
            background: #fff;
            color: #111;
          }

          .motiq-card,
          .motiq-vehicle-card,
          .motiq-metric {
            border-color: #ddd;
            color: #111;
          }
        }
      `}</style>

      {/* =====================================================
          SIDEBAR
      ===================================================== */}

      <aside className="motiq-sidebar">

        <div className="motiq-logo">

          <div className="motiq-logo-icon">
            <Gauge
              size={21}
              strokeWidth={2.5}
            />
          </div>

          <div>
            <div className="motiq-logo-text">
              MotorIQ
            </div>

            <div className="motiq-logo-sub">
              Vehicle Intelligence
            </div>
          </div>

        </div>

        <div className="motiq-sidebar-section">

          <div className="motiq-sidebar-label">
            Workspace
          </div>

          <button
            className="motiq-nav-button"
            onClick={handleDashboard}
          >
            <Gauge size={17} />
            <span>
              Dashboard
            </span>
          </button>

          <button
            className="motiq-nav-button"
            onClick={() =>
              navigate("/inspection")
            }
          >
            <ScanLine size={17} />
            <span>
              New Inspection
            </span>
          </button>

          <button
            className="motiq-nav-button active"
          >
            <FileText size={17} />
            <span>
              Inspection Result
            </span>
          </button>

        </div>

        <div className="motiq-sidebar-section">

          <div className="motiq-sidebar-label">
            System
          </div>

          <button className="motiq-nav-button">
            <ShieldCheck size={17} />
            <span>
              AI Analysis
            </span>
          </button>

        </div>

        <div className="motiq-sidebar-bottom">

          <div className="motiq-user-box">

            <div className="motiq-user-icon">
              <UserRound size={16} />
            </div>

            <div>
              <div className="motiq-user-title">
                MotorIQ User
              </div>

              <div className="motiq-user-sub">
                AI Inspection Workspace
              </div>
            </div>

          </div>

        </div>

      </aside>

      {/* =====================================================
          MAIN CONTENT
      ===================================================== */}

      <div className="motiq-content">

        <header className="motiq-topbar">

          <button
            className="motiq-back-button"
            onClick={() =>
              navigate("/inspection")
            }
          >
            <ArrowLeft size={15} />
            Back to Inspection
          </button>

          <div className="motiq-top-status">
            <span className="motiq-status-dot" />
            AI inspection complete
          </div>

        </header>

        <main className="motiq-main">

          {/* HEADER */}

          <div className="motiq-heading-row">

            <div>

              <div className="motiq-eyebrow">
                MotorIQ / AI Inspection
              </div>

              <h1 className="motiq-heading">
                Inspection Result
              </h1>

              <div className="motiq-heading-description">
                AI-assisted vehicle valuation and visual
                inspection based on your submitted vehicle
                information and uploaded images.
              </div>

            </div>

            <div className="motiq-header-actions">

              <button
                className="motiq-secondary-button"
                onClick={handleReport}
              >
                <FileText size={15} />
                Export / Print
              </button>

              <button
                className="motiq-primary-button"
                onClick={
                  handleNewInspection
                }
              >
                <RotateCcw size={15} />
                New Inspection
              </button>

            </div>

          </div>

          {/* VEHICLE SUMMARY */}

          <section className="motiq-vehicle-card">

            <div className="motiq-vehicle-info">

              <div className="motiq-vehicle-label">
                Inspected Vehicle
              </div>

              <h2 className="motiq-vehicle-name">
                {brand} {model}
              </h2>

              <div className="motiq-vehicle-meta">

                <div className="motiq-pill">
                  <Camera size={11} />
                  {vehicleType}
                </div>

                <div className="motiq-pill">
                  {year}
                </div>

                <div className="motiq-pill">
                  {fuelType}
                </div>

                <div className="motiq-pill">
                  {transmission}
                </div>

                {city !== "—" && (
                  <div className="motiq-pill">
                    <span>
                      📍
                    </span>
                    {city}
                  </div>
                )}

                {kmsDriven !== null && (
                  <div className="motiq-pill">
                    {Number(
                      kmsDriven
                    ).toLocaleString(
                      "en-IN"
                    )}{" "}
                    km
                  </div>
                )}

              </div>

            </div>

            <div className="motiq-price-block">

              <div className="motiq-price-label">
                Estimated Market Value
              </div>

              <div className="motiq-price">
                {formatCurrency(
                  estimatedPrice
                )}
              </div>

              <div className="motiq-price-sub">
                {estimatedPrice
                  ? "AI model prediction"
                  : "Prediction value unavailable"}
              </div>

            </div>

          </section>

          {/* INSPECTION AREA */}

          <section className="motiq-inspection-grid">

            {/* IMAGE PANEL */}

            <div className="motiq-card">

              <div className="motiq-card-header">

                <div>

                  <div className="motiq-card-title">
                    <ScanLine size={16} />
                    AI Visual Inspection
                  </div>

                  <div className="motiq-card-subtitle">
                    Detected regions are highlighted directly
                    on the selected vehicle image.
                  </div>

                </div>

                <div className="motiq-ai-badge">
                  <Sparkles size={11} />
                  YOLO Vision
                </div>

              </div>

              <div className="motiq-image-area">

                {selectedImage ? (

                  <div
                    className="motiq-image-stage"
                    style={{
                      aspectRatio: `${
                        selectedImage.width ||
                        imageNaturalSize.width ||
                        1
                      } / ${
                        selectedImage.height ||
                        imageNaturalSize.height ||
                        1
                      }`,
                    }}
                  >

                    {!imageError &&
                    selectedImage.url ? (

                      <>

                        <img
                          src={
                            selectedImage.url
                          }
                          alt={
                            selectedImage.originalName ||
                            "Uploaded vehicle"
                          }
                          onLoad={(
                            event
                          ) => {

                            setImageLoading(
                              false
                            );

                            setImageNaturalSize(
                              {
                                width:
                                  event
                                    .currentTarget
                                    .naturalWidth,

                                height:
                                  event
                                    .currentTarget
                                    .naturalHeight,
                              }
                            );

                          }}
                          onError={() => {

                            console.error(
                              "Failed to load image:",
                              selectedImage.url
                            );

                            setImageLoading(
                              false
                            );

                            setImageError(
                              true
                            );

                          }}
                        />

                        {selectedDetections.map(
                          (
                            detection,
                            index
                          ) => {

                            const percent =
                              getConfidencePercent(
                                detection
                              );

                            return (
                              <button
                                key={getDetectionKey(
                                  detection,
                                  selectedImageIndex,
                                  index
                                )}
                                type="button"
                                className={
                                  selectedDetection ===
                                  index
                                    ? "damage-marker selected"
                                    : "damage-marker"
                                }
                                style={getDetectionStyle(
                                  detection
                                )}
                                onClick={() =>
                                  setSelectedDetection(
                                    index
                                  )
                                }
                                aria-label={`Detected ${formatDamageName(
                                  detection?.damage
                                )}`}
                              >

                                <span className="damage-marker-label">

                                  {formatDamageName(
                                    detection?.damage
                                  )}

                                  {" · "}

                                  {percent}%

                                </span>

                              </button>
                            );

                          }
                        )}

                        {imageLoading && (
                          <div className="motiq-image-loading">
                            Loading inspection image…
                          </div>
                        )}

                      </>

                    ) : (

                      <div className="motiq-image-error">

                        <AlertTriangle
                          size={27}
                        />

                        <strong>
                          Image unavailable
                        </strong>

                        <span>
                          The inspection data was saved,
                          but this image could not be displayed.
                        </span>

                      </div>

                    )}

                  </div>

                ) : (

                  <div className="motiq-no-images">

                    <ImageIcon
                      size={32}
                    />

                    <div>
                      No vehicle images were uploaded.
                    </div>

                    <small>
                      Visual damage analysis was not available
                      for this inspection.
                    </small>

                  </div>

                )}

              </div>

              {/* THUMBNAILS */}

              {normalizedImages.length > 0 && (

                <div className="motiq-thumbnail-row">

                  {normalizedImages.map(
                    (
                      image,
                      index
                    ) => (

                      <button
                        key={
                          image.filename ||
                          `thumbnail-${index}`
                        }
                        type="button"
                        className={
                          selectedImageIndex ===
                          index
                            ? "motiq-thumbnail active"
                            : "motiq-thumbnail"
                        }
                        onClick={() =>
                          handleImageSelect(
                            index
                          )
                        }
                        title={
                          image.originalName ||
                          `Image ${index + 1}`
                        }
                      >

                        <img
                          src={image.url}
                          alt={`Vehicle image ${
                            index + 1
                          }`}
                        />

                        {image.detections
                          .length > 0 && (
                          <span className="motiq-thumbnail-damage" />
                        )}

                        <span className="motiq-thumbnail-number">
                          {index + 1}
                        </span>

                      </button>

                    )
                  )}

                </div>

              )}

            </div>

            {/* DAMAGE PANEL */}

            <div className="motiq-card motiq-damage-panel">

              <div className="motiq-card-header">

                <div>

                  <div className="motiq-card-title">
                    <AlertTriangle size={16} />
                    AI Detected Damage
                  </div>

                  <div className="motiq-card-subtitle">
                    Vehicle regions identified by the vision
                    model.
                  </div>

                </div>

              </div>

              {/* ANALYSIS SUMMARY */}

              <div className="motiq-analysis-summary">

                <div className="motiq-analysis-stat">

                  <div className="motiq-analysis-stat-label">
                    Detected Regions
                  </div>

                  <div className="motiq-analysis-stat-value red">
                    {allDetections.length}
                  </div>

                </div>

                <div className="motiq-analysis-stat">

                  <div className="motiq-analysis-stat-label">
                    Images
                  </div>

                  <div className="motiq-analysis-stat-value">
                    {normalizedImages.length}
                  </div>

                </div>

                <div className="motiq-analysis-stat">

                  <div className="motiq-analysis-stat-label">
                    AI Confidence
                  </div>

                  <div className="motiq-analysis-stat-value cyan">
                    {allDetections.length
                      ? `${averageConfidence}%`
                      : "—"}
                  </div>

                </div>

                <div className="motiq-analysis-stat">

                  <div className="motiq-analysis-stat-label">
                    Confidence Level
                  </div>

                  <div className="motiq-analysis-stat-value">
                    {overallConfidenceLabel}
                  </div>

                </div>

              </div>

              {/* DAMAGE LIST */}

              {allDetections.length > 0 ? (

                <div className="motiq-damage-list">

                  {allDetections.map(
                    (
                      detection,
                      index
                    ) => {

                      const percent =
                        getConfidencePercent(
                          detection
                        );

                      const isSelected =
                        selectedImageIndex ===
                          detection._imageIndex &&
                        selectedDetection ===
                          detection._detectionIndex;

                      return (

                        <button
                          key={
                            detection._key ||
                            `damage-${index}`
                          }
                          type="button"
                          className={
                            isSelected
                              ? "motiq-damage-item selected"
                              : "motiq-damage-item"
                          }
                          onClick={() =>
                            handleDetectionSelect(
                              detection._imageIndex,
                              detection._detectionIndex
                            )
                          }
                        >

                          <div className="motiq-damage-thumb">

                            {detection._imageUrl ? (

                              <img
                                src={
                                  detection._imageUrl
                                }
                                alt=""
                              />

                            ) : (

                              <div
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  display: "flex",
                                  alignItems:
                                    "center",
                                  justifyContent:
                                    "center",
                                }}
                              >

                                <ImageIcon
                                  size={18}
                                  color="#56616c"
                                />

                              </div>

                            )}

                          </div>

                          <div>

                            <div className="motiq-damage-name">

                              {formatDamageName(
                                detection?.damage ||
                                  detection?.class_name ||
                                  detection?.label
                              )}

                            </div>

                            <div className="motiq-damage-image-name">
                              {detection._imageName}
                            </div>

                            <div className="motiq-damage-confidence">

                              <div className="motiq-confidence-bar">

                                <div
                                  className="motiq-confidence-fill"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        percent
                                      )
                                    )}%`,
                                  }}
                                />

                              </div>

                              <span className="motiq-confidence-text">
                                {percent}% ·{" "}
                                {getConfidenceLabel(
                                  detection
                                )}
                              </span>

                            </div>

                          </div>

                          <ChevronRight
                            className="motiq-damage-arrow"
                            size={16}
                          />

                        </button>

                      );

                    }
                  )}

                </div>

              ) : (

                <div className="motiq-no-damage">

                  <div className="motiq-no-damage-icon">
                    <CheckCircle2 size={23} />
                  </div>

                  <div className="motiq-no-damage-title">
                    No visible damage detected
                  </div>

                  <div className="motiq-no-damage-text">
                    The AI vision model did not identify
                    damage regions above the configured
                    confidence threshold in the uploaded images.
                  </div>

                </div>

              )}

            </div>

          </section>

          {/* METRICS */}

          <section className="motiq-metrics">

            <div className="motiq-metric">

              <div className="motiq-metric-top">
                <span>
                  Damage Regions
                </span>
                <AlertTriangle size={14} />
              </div>

              <div className="motiq-metric-value">
                {allDetections.length}
              </div>

              <div className="motiq-metric-sub">
                AI-detected regions
              </div>

            </div>

            <div className="motiq-metric">

              <div className="motiq-metric-top">
                <span>
                  AI Confidence
                </span>
                <Sparkles size={14} />
              </div>

              <div className="motiq-metric-value">
                {allDetections.length
                  ? `${averageConfidence}%`
                  : "—"}
              </div>

              <div className="motiq-metric-sub">
                Average detection confidence
              </div>

            </div>

            <div className="motiq-metric">

              <div className="motiq-metric-top">
                <span>
                  Vehicle Age
                </span>
                <Clock3 size={14} />
              </div>

              <div className="motiq-metric-value">
                {vehicleAge !== null
                  ? `${vehicleAge} yrs`
                  : "—"}
              </div>

              <div className="motiq-metric-sub">
                Based on model year
              </div>

            </div>

            <div className="motiq-metric">

              <div className="motiq-metric-top">
                <span>
                  Inspection
                </span>
                <ShieldCheck size={14} />
              </div>

              <div className="motiq-metric-value">
                Complete
              </div>

              <div className="motiq-metric-sub">
                AI valuation + visual analysis
              </div>

            </div>

          </section>

          {/* DETAILS */}

          <section className="motiq-details-grid">

            {/* VEHICLE DETAILS */}

            <div className="motiq-card">

              <div className="motiq-card-header">

                <div>

                  <div className="motiq-card-title">
                    <Gauge size={16} />
                    Vehicle Information
                  </div>

                  <div className="motiq-card-subtitle">
                    Details supplied for valuation.
                  </div>

                </div>

              </div>

              <div className="motiq-details-content">

                <div className="motiq-detail-grid">

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Type
                    </div>
                    <div className="motiq-detail-value">
                      {vehicleType}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Brand
                    </div>
                    <div className="motiq-detail-value">
                      {brand}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Model
                    </div>
                    <div className="motiq-detail-value">
                      {model}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Year
                    </div>
                    <div className="motiq-detail-value">
                      {year}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Kilometers
                    </div>
                    <div className="motiq-detail-value">
                      {kmsDriven !== null
                        ? `${Number(
                            kmsDriven
                          ).toLocaleString(
                            "en-IN"
                          )} km`
                        : "—"}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Fuel
                    </div>
                    <div className="motiq-detail-value">
                      {fuelType}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Transmission
                    </div>
                    <div className="motiq-detail-value">
                      {transmission}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Owner
                    </div>
                    <div className="motiq-detail-value">
                      {owner}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      City
                    </div>
                    <div className="motiq-detail-value">
                      {city}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Body Type
                    </div>
                    <div className="motiq-detail-value">
                      {bodyType}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Images
                    </div>
                    <div className="motiq-detail-value">
                      {normalizedImages.length}
                    </div>
                  </div>

                  <div className="motiq-detail">
                    <div className="motiq-detail-label">
                      Damage Types
                    </div>
                    <div className="motiq-detail-value">
                      {damageTypes.length ||
                        "None"}
                    </div>
                  </div>

                </div>

              </div>

            </div>

            {/* CONDITION NOTES */}

            <div className="motiq-card">

              <div className="motiq-card-header">

                <div>

                  <div className="motiq-card-title">
                    <ShieldCheck size={16} />
                    Inspection Notes
                  </div>

                  <div className="motiq-card-subtitle">
                    Notes supplied during the inspection.
                  </div>

                </div>

              </div>

              <div className="motiq-details-content">

                {inspection?.conditionSummary ? (

                  <div className="motiq-condition">
                    {inspection.conditionSummary}
                  </div>

                ) : (

                  <div className="motiq-condition-empty">
                    No manual condition notes were provided.
                    The visual inspection shown above is based
                    on the uploaded images and AI detection
                    results.
                  </div>

                )}

              </div>

            </div>

          </section>

          {/* FOOTER */}

          <div className="motiq-footer-actions">

            <button
              className="motiq-secondary-button"
              onClick={handleDashboard}
            >
              <Gauge size={15} />
              Back to Dashboard
            </button>

            <button
              className="motiq-primary-button"
              onClick={
                handleNewInspection
              }
            >
              <ScanLine size={15} />
              Start Another Inspection
            </button>

          </div>

        </main>

      </div>

    </div>
  );
}