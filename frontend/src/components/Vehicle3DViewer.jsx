import React, { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  OrbitControls,
  Html,
  useGLTF,
} from "@react-three/drei";

function CarModel() {
  const groupRef = useRef();
  const { scene } = useGLTF("/models/CarConcept.glb");

  useEffect(() => {
    if (!scene) return;

    scene.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <group
      ref={groupRef}
      position={[0, -0.9, 0]}
      rotation={[0, Math.PI, 0]}
      scale={1.8}
    >
      <primitive object={scene} />
    </group>
  );
}

function LoadingModel() {
  return (
    <Html center>
      <div
        style={{
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Loading 3D vehicle...
      </div>
    </Html>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={1.2} />

      <directionalLight
        position={[5, 8, 5]}
        intensity={2}
        castShadow
      />

      <directionalLight
        position={[-5, 4, -4]}
        intensity={1.2}
      />

      <Environment preset="city" />

      <Suspense fallback={<LoadingModel />}>
        <CarModel />
      </Suspense>

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.05}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

export default function Vehicle3DViewer({
  height = 500,
  className = "",
}) {
  const [error, setError] = useState(false);

  return (
    <div
      className={className}
      style={{
        width: "100%",
        height,
        minHeight: "350px",
        position: "relative",
        overflow: "hidden",
        borderRadius: "24px",
        background:
          "radial-gradient(circle at 50% 35%, #26344d 0%, #111827 45%, #050914 100%)",
      }}
    >
      {error ? (
        <div
          style={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            padding: "30px",
            textAlign: "center",
          }}
        >
          Unable to load the 3D vehicle model.
        </div>
      ) : (
        <Canvas
          shadows
          camera={{
            position: [4.5, 2.5, 5.5],
            fov: 42,
          }}
          onCreated={() => {
            setError(false);
          }}
        >
          <Scene />
        </Canvas>
      )}

      <div
        style={{
          position: "absolute",
          left: "18px",
          bottom: "18px",
          padding: "9px 13px",
          borderRadius: "12px",
          background: "rgba(0, 0, 0, 0.48)",
          backdropFilter: "blur(10px)",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 600,
          pointerEvents: "none",
        }}
      >
        Drag to rotate • Scroll to zoom • Drag with two fingers to move
      </div>
    </div>
  );
}

useGLTF.preload("/models/CarConcept.glb");