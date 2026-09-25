from pathlib import Path
from ultralytics import YOLO


# ============================================================
# MOTORIQ DAMAGE DETECTION MODEL
# ============================================================

MODEL_PATH = (
    Path.home()
    / ".cache"
    / "huggingface"
    / "hub"
    / "models--vineetsarpal--yolov11n-car-damage"
    / "snapshots"
    / "ad93b6cbb6f1e14a385945c43cd36cf700385c86"
    / "best.pt"
)


# ============================================================
# CLASS-SPECIFIC CONFIDENCE THRESHOLDS
# ============================================================

CLASS_THRESHOLDS = {

    # --------------------------------------------------------
    # Lights / glass
    # --------------------------------------------------------

    "Headlight-damage": 0.85,

    "Taillight-Damage": 0.75,

    "Rear-windscreen-Damage": 0.85,

    "Front-windscreen-damage": 0.85,

    # --------------------------------------------------------
    # Dent classes
    # --------------------------------------------------------

    "bonnet-dent": 0.80,

    "roof-dent": 0.75,

    "front-bumper-dent": 0.60,

    "rear-bumper-dent": 0.60,

    "doorouter-dent": 0.60,

    "fender-dent": 0.60,

    "quaterpanel-dent": 0.60,

    "boot-dent": 0.60,

    # --------------------------------------------------------
    # Other damage
    # --------------------------------------------------------

    "Runningboard-Damage": 0.65,

    "Sidemirror-Damage": 0.70,
}


DEFAULT_THRESHOLD = 0.60


# ============================================================
# LIGHT CLASSES
# ============================================================

LIGHT_CLASSES = {
    "Headlight-damage",
    "Taillight-Damage",
}


# ============================================================
# BUMPER CLASSES
# ============================================================

BUMPER_CLASSES = {
    "front-bumper-dent",
    "rear-bumper-dent",
}


# ============================================================
# GEOMETRY SETTINGS
# ============================================================

# Minimum percentage of the bumper detection box that must
# overlap a light detection before the bumper detection is
# considered suspicious.
#
# Example:
#
# bumper box area = 1000 pixels
# overlap area    = 300 pixels
#
# overlap ratio = 30%
#
# If threshold = 25%, the bumper detection is suppressed.
#
LIGHT_BUMPER_OVERLAP_THRESHOLD = 0.25


# Additional rule:
#
# If a large percentage of the LIGHT box lies inside the
# bumper box, suppress the bumper detection.
#
# This helps with situations where the model's bumper box
# is very large.
LIGHT_INSIDE_BUMPER_THRESHOLD = 0.60


class DamageDetector:

    def __init__(self):

        if not MODEL_PATH.exists():

            raise FileNotFoundError(
                f"Damage detection model not found:\n"
                f"{MODEL_PATH}"
            )

        print(
            "Loading MotorIQ damage detection model..."
        )

        self.model = YOLO(
            str(MODEL_PATH)
        )

        print(
            "MotorIQ damage detection model loaded."
        )

        print(
            "Available damage classes:"
        )

        print(
            self.model.names
        )

    # ========================================================
    # CONFIDENCE THRESHOLD
    # ========================================================

    def get_threshold(
        self,
        damage_name: str
    ) -> float:

        return CLASS_THRESHOLDS.get(
            damage_name,
            DEFAULT_THRESHOLD
        )

    # ========================================================
    # BOX AREA
    # ========================================================

    @staticmethod
    def box_area(
        box
    ) -> float:

        x1, y1, x2, y2 = box

        width = max(
            0.0,
            x2 - x1
        )

        height = max(
            0.0,
            y2 - y1
        )

        return width * height

    # ========================================================
    # INTERSECTION AREA
    # ========================================================

    @staticmethod
    def intersection_area(
        box_a,
        box_b
    ) -> float:

        ax1, ay1, ax2, ay2 = box_a
        bx1, by1, bx2, by2 = box_b

        x_left = max(
            ax1,
            bx1
        )

        y_top = max(
            ay1,
            by1
        )

        x_right = min(
            ax2,
            bx2
        )

        y_bottom = min(
            ay2,
            by2
        )

        if x_right <= x_left:
            return 0.0

        if y_bottom <= y_top:
            return 0.0

        return (
            (x_right - x_left)
            *
            (y_bottom - y_top)
        )

    # ========================================================
    # OVERLAP RATIO RELATIVE TO BOX A
    # ========================================================

    def overlap_ratio(
        self,
        box_a,
        box_b
    ) -> float:

        area_a = self.box_area(
            box_a
        )

        if area_a <= 0:
            return 0.0

        intersection = (
            self.intersection_area(
                box_a,
                box_b
            )
        )

        return intersection / area_a

    # ========================================================
    # CHECK LIGHT / BUMPER CONFLICT
    # ========================================================

    def bumper_conflicts_with_light(
        self,
        bumper_box,
        light_detections
    ) -> bool:

        if not light_detections:
            return False

        for light_detection in light_detections:

            light_box = (
                light_detection["bbox"]
            )

            # ----------------------------------------------
            # Convert dictionary bbox into coordinates
            # ----------------------------------------------

            light_coordinates = (
                light_box["x1"],
                light_box["y1"],
                light_box["x2"],
                light_box["y2"],
            )

            # ----------------------------------------------
            # How much of the bumper box overlaps the light?
            # ----------------------------------------------

            bumper_overlap = (
                self.overlap_ratio(
                    bumper_box,
                    light_coordinates
                )
            )

            # ----------------------------------------------
            # How much of the light box overlaps the bumper?
            # ----------------------------------------------

            light_overlap = (
                self.overlap_ratio(
                    light_coordinates,
                    bumper_box
                )
            )

            # ----------------------------------------------
            # RULE 1
            #
            # Significant part of bumper box overlaps
            # with detected light.
            # ----------------------------------------------

            if (
                bumper_overlap
                >= LIGHT_BUMPER_OVERLAP_THRESHOLD
            ):

                print(
                    "MotorIQ filter: "
                    "suppressed bumper detection "
                    f"because it overlaps "
                    f"{light_detection['damage']} "
                    f"({bumper_overlap * 100:.1f}% "
                    f"bumper overlap)."
                )

                return True

            # ----------------------------------------------
            # RULE 2
            #
            # Light box is mostly contained inside bumper box.
            #
            # This helps when YOLO creates a very large
            # bumper bounding box.
            # ----------------------------------------------

            if (
                light_overlap
                >= LIGHT_INSIDE_BUMPER_THRESHOLD
            ):

                print(
                    "MotorIQ filter: "
                    "suppressed bumper detection "
                    f"because the detected "
                    f"{light_detection['damage']} "
                    f"is mostly inside the bumper box "
                    f"({light_overlap * 100:.1f}% "
                    f"light overlap)."
                )

                return True

        return False

    # ========================================================
    # ANALYZE IMAGE
    # ========================================================

    def analyze(
        self,
        image_path: str,
        confidence: float = DEFAULT_THRESHOLD
    ):

        # ----------------------------------------------------
        # Run YOLO with a low base threshold.
        #
        # We apply our class-specific thresholds ourselves.
        # ----------------------------------------------------

        results = self.model.predict(
            source=image_path,
            conf=0.25,
            verbose=False
        )

        # ----------------------------------------------------
        # Temporary detection list
        # ----------------------------------------------------

        raw_detections = []

        for result in results:

            if result.boxes is None:
                continue

            for box in result.boxes:

                class_id = int(
                    box.cls[0]
                )

                confidence_score = float(
                    box.conf[0]
                )

                damage_name = (
                    self.model.names[class_id]
                )

                # --------------------------------------------
                # Get class-specific threshold
                # --------------------------------------------

                required_threshold = (
                    self.get_threshold(
                        damage_name
                    )
                )

                # --------------------------------------------
                # Reject weak detections
                # --------------------------------------------

                if (
                    confidence_score
                    < required_threshold
                ):
                    continue

                # --------------------------------------------
                # Bounding box
                # --------------------------------------------

                x1, y1, x2, y2 = (
                    box.xyxy[0].tolist()
                )

                bbox = {
                    "x1": round(
                        x1,
                        2
                    ),
                    "y1": round(
                        y1,
                        2
                    ),
                    "x2": round(
                        x2,
                        2
                    ),
                    "y2": round(
                        y2,
                        2
                    ),
                }

                # --------------------------------------------
                # Confidence level
                # --------------------------------------------

                if confidence_score >= 0.85:

                    confidence_level = "high"

                elif confidence_score >= 0.70:

                    confidence_level = "medium"

                else:

                    confidence_level = "moderate"

                # --------------------------------------------
                # Store detection
                # --------------------------------------------

                raw_detections.append(
                    {
                        "class_id": class_id,

                        "damage": damage_name,

                        "confidence": round(
                            confidence_score,
                            4
                        ),

                        "confidence_percent": round(
                            confidence_score * 100,
                            2
                        ),

                        "confidence_level":
                            confidence_level,

                        "threshold_used": round(
                            required_threshold,
                            2
                        ),

                        "threshold_percent": round(
                            required_threshold * 100,
                            2
                        ),

                        "bbox": bbox,
                    }
                )

        # ====================================================
        # LIGHT DETECTIONS
        # ====================================================

        light_detections = [
            detection
            for detection in raw_detections
            if detection["damage"]
            in LIGHT_CLASSES
        ]

        # ====================================================
        # FILTER BUMPER FALSE POSITIVES
        # ====================================================

        final_detections = []

        for detection in raw_detections:

            damage_name = (
                detection["damage"]
            )

            # ------------------------------------------------
            # Only apply this filter to bumper detections.
            # ------------------------------------------------

            if damage_name in BUMPER_CLASSES:

                bbox_data = (
                    detection["bbox"]
                )

                bumper_box = (
                    bbox_data["x1"],
                    bbox_data["y1"],
                    bbox_data["x2"],
                    bbox_data["y2"],
                )

                # --------------------------------------------
                # Check overlap with detected lights
                # --------------------------------------------

                conflict = (
                    self.bumper_conflicts_with_light(
                        bumper_box,
                        light_detections
                    )
                )

                if conflict:

                    print(
                        "MotorIQ: "
                        f"Rejected {damage_name} "
                        "because it conflicts with "
                        "a detected light region."
                    )

                    continue

            # ------------------------------------------------
            # Keep detection
            # ------------------------------------------------

            final_detections.append(
                detection
            )

        # ====================================================
        # FINAL RESULT
        # ====================================================

        return final_detections


# ============================================================
# GLOBAL MOTORIQ DAMAGE DETECTOR
# ============================================================

detector = DamageDetector()