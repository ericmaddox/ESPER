import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import * as Cesium from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';

const CesiumMap = forwardRef(({
  incidents,
  cameras,
  units,
  layers,
  onSelectCamera,
  onSelectIncident,
  googleApiKey = ''
}, ref) => {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const entitiesRef = useRef({});
  const tilesetRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Expose camera fly-to helper to parent component
  useImperativeHandle(ref, () => ({
    flyToLocation: (latitude, longitude, height = 350, heading = 35, pitch = -30) => {
      if (!viewerRef.current) return;
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
        orientation: {
          heading: Cesium.Math.toRadians(heading),
          pitch: Cesium.Math.toRadians(pitch),
          roll: 0
        },
        duration: 2.0
      });
    },
    setCameraView: (preset) => {
      if (!viewerRef.current) return;
      viewerRef.current.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(preset.longitude, preset.latitude, preset.height),
        orientation: {
          heading: Cesium.Math.toRadians(preset.heading),
          pitch: Cesium.Math.toRadians(preset.pitch),
          roll: 0
        },
        duration: 2.5
      });
    }
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    // Set Cesium default access token
    Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJmNmI4YTQzMi05ZTE2LTRhNGYtOTgzYS0yYTFiNzFhMWVlNWUiLCJpZCI6MTU0MzYsImlhdCI6MTY3Nzg5NzA0OH0.XqD4-P5i7b7t5gX9lJ7v8W7W7W7W7W7';

    // 1. Configure High-Definition Esri World Imagery Satellite Layer
    const esriSatelliteImagery = new Cesium.ArcGisMapServerImageryProvider({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
    });

    // 2. Initialize Cesium Viewer with HD Satellite Basemap
    const viewer = new Cesium.Viewer(containerRef.current, {
      imageryProvider: esriSatelliteImagery,
      animation: false,
      timeline: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      navigationHelpButton: false,
      scene3DOnly: true
    });

    viewerRef.current = viewer;

    // Configure Scene & Atmosphere for photorealistic visual quality
    const scene = viewer.scene;
    scene.globe.enableLighting = true;
    scene.globe.depthTestAgainstTerrain = true;
    scene.skyAtmosphere.show = true;
    scene.shadowMap.enabled = true;

    // Initial position: Downtown Los Angeles (Sky View)
    const initialLat = 34.0460;
    const initialLng = -118.2570;
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(initialLng, initialLat, 650),
      orientation: {
        heading: Cesium.Math.toRadians(35),
        pitch: Cesium.Math.toRadians(-35),
        roll: 0
      }
    });

    // Load 3D Buildings & Photogrammetry Tileset
    const load3DBuildings = async () => {
      try {
        if (googleApiKey && googleApiKey.trim() !== '') {
          // Stream Google Photorealistic 3D Tiles if key is provided
          const tileset = await Cesium.createGooglePhotorealistic3DTileset({
            key: googleApiKey
          });
          scene.primitives.add(tileset);
          tilesetRef.current = tileset;
        } else {
          // Stream Cesium OSM 3D Building Geometry draped over satellite map
          const tileset = await Cesium.createOsmBuildingsAsync();
          scene.primitives.add(tileset);
          tilesetRef.current = tileset;
        }
      } catch (err) {
        console.warn('3D Tiles loading fallback:', err);
      }
    };

    load3DBuildings();

    // Event Handler for Entity Clicks (Camera pins & Incidents)
    const handler = new Cesium.ScreenSpaceEventHandler(scene.canvas);
    handler.setInputAction((click) => {
      const pickedObject = scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity = pickedObject.id;
        if (entity.properties && entity.properties.cameraData) {
          const camData = entity.properties.cameraData.getValue();
          onSelectCamera(camData);
        } else if (entity.properties && entity.properties.incidentData) {
          const incData = entity.properties.incidentData.getValue();
          onSelectIncident(incData);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      handler.destroy();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (!viewer.isDestroyed()) viewer.destroy();
    };
  }, [googleApiKey]);

  // Update Layers & Entities dynamically
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Clear old entities
    viewer.entities.removeAll();
    entitiesRef.current = {};

    // 1. Render 3D Incident Pins & Pulsing Ground Rings
    if (layers.incidents && incidents) {
      incidents.forEach((inc) => {
        const color = inc.severity === 'critical' ? Cesium.Color.RED :
                      inc.severity === 'warning' ? Cesium.Color.ORANGE : Cesium.Color.CYAN;

        // Incident Billboard Pin
        const entity = viewer.entities.add({
          id: `inc-${inc.id}`,
          position: Cesium.Cartesian3.fromDegrees(inc.longitude, inc.latitude, inc.elevation + 20),
          properties: { incidentData: inc },
          billboard: {
            image: createIncidentPinCanvas(inc.type, inc.severity),
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            heightReference: Cesium.HeightReference.NONE,
            scale: 0.85
          },
          label: {
            text: `${inc.id}: ${inc.type.toUpperCase()}`,
            font: '11px JetBrains Mono, monospace',
            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
            fillColor: color,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 3,
            verticalOrigin: Cesium.VerticalOrigin.TOP,
            pixelOffset: new Cesium.Cartesian2(0, 10),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 3000)
          }
        });

        // Pulsing Ring on Ground
        viewer.entities.add({
          position: Cesium.Cartesian3.fromDegrees(inc.longitude, inc.latitude, 2),
          ellipse: {
            semiMinorAxis: 45.0,
            semiMajorAxis: 45.0,
            material: new Cesium.ColorMaterialProperty(color.withAlpha(0.3)),
            outline: true,
            outlineColor: color,
            outlineWidth: 2
          }
        });

        entitiesRef.current[`inc-${inc.id}`] = entity;
      });
    }

    // 2. Render 3D CCTV Cameras + 3D Vision Frustums (Cones)
    if (layers.cameras && cameras) {
      cameras.forEach((cam) => {
        // Camera Pin Icon
        const entity = viewer.entities.add({
          id: `cam-${cam.id}`,
          position: Cesium.Cartesian3.fromDegrees(cam.longitude, cam.latitude, cam.height),
          properties: { cameraData: cam },
          billboard: {
            image: createCameraPinCanvas(cam.status),
            verticalOrigin: Cesium.VerticalOrigin.CENTER,
            scale: 0.9
          },
          label: {
            text: `${cam.id} [${cam.status}]`,
            font: '10px JetBrains Mono, monospace',
            fillColor: Cesium.Color.CYAN,
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 2,
            pixelOffset: new Cesium.Cartesian2(0, 22),
            distanceDisplayCondition: new Cesium.DistanceDisplayCondition(0, 2500)
          }
        });

        // 3D Camera Vision Cone (Frustum)
        if (layers.cameraCones) {
          const coneHeading = Cesium.Math.toRadians(cam.heading);
          const coneRange = cam.range || 100;
          const coneRadius = Math.tan(Cesium.Math.toRadians(cam.fov / 2)) * coneRange;

          const position = Cesium.Cartesian3.fromDegrees(cam.longitude, cam.latitude, cam.height - coneRange / 2);
          const hpr = new Cesium.HeadingPitchRoll(coneHeading, Cesium.Math.toRadians(-60), 0);
          const orientation = Cesium.Transforms.headingPitchRollQuaternion(position, hpr);

          viewer.entities.add({
            position: position,
            orientation: orientation,
            cylinder: {
              length: coneRange,
              topRadius: 1.0,
              bottomRadius: coneRadius,
              material: new Cesium.ColorMaterialProperty(Cesium.Color.CYAN.withAlpha(0.25)),
              outline: true,
              outlineColor: Cesium.Color.CYAN.withAlpha(0.7),
              outlineWidth: 1.5
            }
          });
        }

        entitiesRef.current[`cam-${cam.id}`] = entity;
      });
    }

    // 3. Render Moving Field Units (Helicopter & Patrol Car)
    if (layers.units && units) {
      units.forEach((unit) => {
        if (unit.id === 'AIR-1') {
          // AIR-1 Helicopter Circling Animation
          const centerLat = 34.0460;
          const centerLng = -118.2570;
          const radius = 0.008;

          const airEntity = viewer.entities.add({
            id: 'unit-AIR-1',
            position: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, unit.altitude),
            billboard: {
              image: createHeliPinCanvas(),
              scale: 1.1
            },
            label: {
              text: `AIR-1 (ALT: ${unit.altitude}m)`,
              font: '10px JetBrains Mono, monospace',
              fillColor: Cesium.Color.YELLOW,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cesium.Cartesian2(0, 24)
            }
          });

          // Downward Spotlight Cone from Helicopter to Ground
          viewer.entities.add({
            position: Cesium.Cartesian3.fromDegrees(centerLng, centerLat, unit.altitude / 2),
            cylinder: {
              length: unit.altitude,
              topRadius: 2.0,
              bottomRadius: 60.0,
              material: new Cesium.ColorMaterialProperty(Cesium.Color.YELLOW.withAlpha(0.18)),
              outline: true,
              outlineColor: Cesium.Color.YELLOW.withAlpha(0.4)
            }
          });

          // Flight Loop Animation Tick
          let angle = 0;
          const animateHeli = () => {
            angle += 0.005;
            const curLng = centerLng + radius * Math.cos(angle);
            const curLat = centerLat + radius * Math.sin(angle);
            const newPos = Cesium.Cartesian3.fromDegrees(curLng, curLat, unit.altitude);
            if (airEntity) airEntity.position = newPos;
            animationFrameRef.current = requestAnimationFrame(animateHeli);
          };
          animateHeli();
        } else {
          // Ground Patrol Unit
          viewer.entities.add({
            id: `unit-${unit.id}`,
            position: Cesium.Cartesian3.fromDegrees(unit.longitude, unit.latitude, unit.altitude),
            billboard: {
              image: createVehiclePinCanvas(),
              scale: 0.9
            },
            label: {
              text: `${unit.id}: ${unit.callsign}`,
              font: '10px JetBrains Mono, monospace',
              fillColor: Cesium.Color.GREENYELLOW,
              outlineColor: Cesium.Color.BLACK,
              outlineWidth: 2,
              pixelOffset: new Cesium.Cartesian2(0, 20)
            }
          });
        }
      });
    }

    // Toggle 3D Buildings visibility
    if (tilesetRef.current) {
      tilesetRef.current.show = layers.buildings;
    }

  }, [incidents, cameras, units, layers]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full bg-slate-950" />
      {/* 3D View Compass & Crosshair overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-15">
        <div className="w-48 h-48 border border-cyan-400/40 rounded-full flex items-center justify-center">
          <div className="w-32 h-32 border border-cyan-400/20 rounded-full"></div>
          <div className="absolute w-px h-full bg-cyan-400/30"></div>
          <div className="absolute h-px w-full bg-cyan-400/30"></div>
        </div>
      </div>
    </div>
  );
});

export default CesiumMap;

// Helper Canvas Generators for Cesium Billboards
function createIncidentPinCanvas(type, severity) {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');

  const color = severity === 'critical' ? '#ef4444' : severity === 'warning' ? '#f59e0b' : '#06b6d4';

  ctx.beginPath();
  ctx.arc(24, 24, 18, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(24, 24, 8, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas.toDataURL();
}

function createCameraPinCanvas(status) {
  const canvas = document.createElement('canvas');
  canvas.width = 40;
  canvas.height = 40;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(20, 20, 15, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(10, 15, 29, 0.9)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#00f3ff';
  ctx.stroke();

  // Draw Camera Lens Icon
  ctx.fillStyle = '#00f3ff';
  ctx.fillRect(13, 14, 10, 8);
  ctx.beginPath();
  ctx.moveTo(23, 16);
  ctx.lineTo(28, 13);
  ctx.lineTo(28, 23);
  ctx.lineTo(23, 20);
  ctx.closePath();
  ctx.fill();

  return canvas.toDataURL();
}

function createHeliPinCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 44;
  canvas.height = 44;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(22, 22, 16, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#eab308';
  ctx.stroke();

  ctx.fillStyle = '#eab308';
  ctx.font = 'bold 12px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('AIR1', 22, 22);

  return canvas.toDataURL();
}

function createVehiclePinCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 36;
  canvas.height = 36;
  const ctx = canvas.getContext('2d');

  ctx.beginPath();
  ctx.arc(18, 18, 13, 0, 2 * Math.PI);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#84cc16';
  ctx.stroke();

  ctx.fillStyle = '#84cc16';
  ctx.fillRect(12, 14, 12, 8);

  return canvas.toDataURL();
}
