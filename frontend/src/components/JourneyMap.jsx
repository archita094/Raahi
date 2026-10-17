import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation,
  Bus,
  MapPin,
  Clock,
  Layers,
  RotateCcw,
  Sparkles,
  Info,
  Compass,
  ArrowRight,
  Footprints
} from 'lucide-react';

function createMarkerIcon({ color = '#2563eb', pulse = false, label = '', isLarge = false, isIntermediate = false }) {
  if (isIntermediate) {

    const size = 12;
    return L.divIcon({
      className: 'custom-intermediate-point-marker',
      html: `
        <div class="intermediate-stop-node" title="${label}">
          <span class="intermediate-stop-point"></span>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2 - 3]
    });
  }

  const size = isLarge ? 22 : 18;
  const pulseHtml = pulse ? `<span class="marker-pulse-ring" style="border-color: ${color};"></span>` : '';

  return L.divIcon({
    className: 'custom-free-marker',
    html: `
      <div class="marker-outer" style="width: ${size}px; height: ${size}px; background-color: ${color};">
        ${pulseHtml}
        <span class="marker-inner-dot"></span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2 - 4]
  });
}

function createLocationArrowIcon(heading = 0, isEstimated = false) {
  const width = 110;
  const height = 72;
  const badgeText = isEstimated ? 'Your Location (Approx)' : 'Your Location';
  const pulseClass = isEstimated ? 'estimated' : 'live';

  return L.divIcon({
    className: 'custom-location-arrow-marker',
    html: `
      <div class="user-location-arrow-container">
        <div class="user-arrow-pill-badge ${pulseClass}">
          <span class="user-live-indicator ${pulseClass}"></span>
          <span>${badgeText}</span>
        </div>
        <div class="user-arrow-graphic-wrapper">
          <div class="user-arrow-beam-cone" style="transform: rotate(${heading}deg);"></div>
          <span class="user-arrow-pulse-ring ${pulseClass}"></span>
          <div class="user-arrow-heading-rotator" style="transform: rotate(${heading}deg);">
            <div class="user-arrow-core-disc">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="#ffffff" class="user-chevron-svg">
                <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    `,
    iconSize: [width, height],
    iconAnchor: [width / 2, 42],
    popupAnchor: [0, -42]
  });
}

function calculateBearing(p1, p2) {
  if (!p1 || !p2 || isNaN(p1.lat) || isNaN(p2.lat)) return 0;
  const lat1 = (Number(p1.lat) * Math.PI) / 180;
  const lon1 = (Number(p1.lng) * Math.PI) / 180;
  const lat2 = (Number(p2.lat) * Math.PI) / 180;
  const lon2 = (Number(p2.lng) * Math.PI) / 180;
  const dLon = lon2 - lon1;

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  const brng = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((brng + 360) % 360);
}

function snapPointToPolyline(point, polyline) {
  if (!polyline || polyline.length < 2) {
    const lat = Number(point.lat !== undefined ? point.lat : point[0]);
    const lng = Number(point.lng !== undefined ? point.lng : point[1]);
    return { snapped: [lat, lng], distanceMeters: 0, tTotal: 0 };
  }
  const pLat = Number(point.lat !== undefined ? point.lat : point[0]);
  const pLng = Number(point.lng !== undefined ? point.lng : point[1]);

  let minDistance = Infinity;
  let bestPoint = [pLat, pLng];
  let bestSegmentIdx = 0;
  let bestT = 0;

  for (let i = 0; i < polyline.length - 1; i++) {
    const aLat = Number(polyline[i][0]);
    const aLng = Number(polyline[i][1]);
    const bLat = Number(polyline[i + 1][0]);
    const bLng = Number(polyline[i + 1][1]);

    const cosLat = Math.cos(((aLat + bLat) / 2 * Math.PI) / 180);
    const dx = (bLng - aLng) * cosLat;
    const dy = bLat - aLat;
    const lenSq = dx * dx + dy * dy;

    let t = 0;
    if (lenSq > 0) {
      const px = (pLng - aLng) * cosLat;
      const py = pLat - aLat;
      t = Math.max(0, Math.min(1, (px * dx + py * dy) / lenSq));
    }

    const projLat = aLat + t * (bLat - aLat);
    const projLng = aLng + t * (bLng - aLng);

    const distLat = (pLat - projLat) * 111320;
    const distLng = (pLng - projLng) * 111320 * cosLat;
    const distM = Math.sqrt(distLat * distLat + distLng * distLng);

    if (distM < minDistance) {
      minDistance = distM;
      bestPoint = [projLat, projLng];
      bestSegmentIdx = i;
      bestT = t;
    }
  }

  return { snapped: bestPoint, distanceMeters: minDistance, tTotal: bestSegmentIdx + bestT };
}

export default function JourneyMap({
  userLocation = null,
  startLocation = null,
  destinationLocation = null,
  mapSegments = [],
  stopDetails = [],
  activeSegmentIndex = 0,
  activeCheckpointIndex = 0,
  onSelectSegment,
  onSelectCheckpoint,
  sourceName = 'Start',
  destinationName = 'Destination',
  totalTime = '',
  arrivalTime = '',
  distanceKm = null,
  busNumber = '',
  isGpsDenied = false,
  onRequestGps
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const tileLayerRef = useRef(null);

  const [mapType, setMapType] = useState('light');
  const [showLegend, setShowLegend] = useState(false);

  const cleanArrivalTime = useMemo(() => {
    if (!arrivalTime) return '10:45 PM';
    if (arrivalTime.includes('→')) {
      const parts = arrivalTime.split('→');
      return parts[parts.length - 1].trim();
    }
    return arrivalTime;
  }, [arrivalTime]);

  const cleanTotalTime = useMemo(() => {
    if (!totalTime) return '35 min';
    return totalTime.replace('min ride', 'min').replace('walk', '').trim();
  }, [totalTime]);

  const cleanDistance = useMemo(() => {
    if (distanceKm) return `${distanceKm} km`;
    return '14.2 km';
  }, [distanceKm]);

  const routePoints = useMemo(() => {
    if (stopDetails && stopDetails.length > 0) {
      const parsed = stopDetails
        .map((s, idx) => {
          const lat = parseFloat(s.lat || s.latitude);
          const lng = parseFloat(s.lng || s.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            return {
              lat,
              lng,
              name: s.name || `Stop ${idx + 1}`,
              time: s.time || (idx === 0 ? '+0 min' : `+${idx * 7} min`),
              isBoarding: idx === 0,
              isAlighting: idx === stopDetails.length - 1,
              order: idx + 1
            };
          }
          return null;
        })
        .filter(Boolean);

      const deduped = [];
      for (const pt of parsed) {
        if (deduped.length === 0) {
          deduped.push(pt);
        } else {
          const prev = deduped[deduped.length - 1];
          const dist = Math.abs(prev.lat - pt.lat) + Math.abs(prev.lng - pt.lng);
          if (dist > 0.0002) {
            deduped.push(pt);
          }
        }
      }
      return deduped;
    }

    return [
      { lat: 30.7415, lng: 76.7681, name: sourceName || 'ISBT Sector 17', time: '+0 min', isBoarding: true },
      { lat: 30.7323, lng: 76.7725, name: 'Sector 22 Market', time: '+8 min' },
      { lat: 30.7224, lng: 76.7812, name: 'Aroma Chowk', time: '+15 min' },
      { lat: 30.7135, lng: 76.7924, name: 'Transport Chowk', time: '+22 min' },
      { lat: 30.7051, lng: 76.8013, name: destinationName || 'Sector 43 ISBT', time: '+32 min', isAlighting: true }
    ];
  }, [stopDetails, sourceName, destinationName]);

  const userToBoardingDistKm = useMemo(() => {
    if (!userLocation || !routePoints[0]) return null;
    const dLat = (userLocation.lat - routePoints[0].lat) * 111;
    const dLng = (userLocation.lng - routePoints[0].lng) * 96;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);
    if (dist > 15.0) return null;
    return dist >= 1.0 ? `${dist.toFixed(1)} km` : `${Math.round(dist * 1000)} m`;
  }, [userLocation, routePoints]);

  const isUserAtBoarding = useMemo(() => {
    if (!userLocation || !routePoints[0]) return true;
    const dLat = (userLocation.lat - routePoints[0].lat) * 111000;
    const dLng = (userLocation.lng - routePoints[0].lng) * 96000;
    const distM = Math.sqrt(dLat * dLat + dLng * dLng);
    return distM <= 90;
  }, [userLocation, routePoints]);

  const centerCoord = useMemo(() => {
    if (routePoints.length > 0) {
      const mid = Math.floor(routePoints.length / 2);
      return [routePoints[mid].lat, routePoints[mid].lng];
    }
    return [30.7333, 76.7794];
  }, [routePoints]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: centerCoord,
        zoom: 13,
        zoomControl: false,
        attributionControl: false
      });

      const osmTiles = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap contributors'
        }
      );
      osmTiles.addTo(map);
      tileLayerRef.current = osmTiles;

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    if (routePoints.length === 0) return;

    const allBoundsCoords = [];

    const hasValidSegmentGeometries = Array.isArray(mapSegments) && mapSegments.some(
      s => Array.isArray(s.geometry) && s.geometry.length > 1
    );

    if (hasValidSegmentGeometries) {
      mapSegments.forEach((seg) => {
        if (!Array.isArray(seg.geometry) || seg.geometry.length < 2) return;

        const segCoords = seg.geometry.map(pt => [Number(pt[0]), Number(pt[1])]);
        segCoords.forEach(c => allBoundsCoords.push(c));

        if (seg.type === 'walk' || seg.type === 'connect') {

          const walkLine = L.polyline(segCoords, {
            color: '#475569',
            weight: 4,
            dashArray: '6, 8',
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
          });
          layerGroup.addLayer(walkLine);
        } else {

          const halo = L.polyline(segCoords, {
            color: '#93c5fd',
            weight: 10,
            opacity: 0.45,
            lineCap: 'round',
            lineJoin: 'round'
          });
          layerGroup.addLayer(halo);

          const line = L.polyline(segCoords, {
            color: seg.color || '#2563eb',
            weight: 5,
            opacity: 0.95,
            lineCap: 'round',
            lineJoin: 'round'
          });
          layerGroup.addLayer(line);
        }
      });
    } else {

      const latLngs = routePoints.map(pt => [pt.lat, pt.lng]);
      latLngs.forEach(c => allBoundsCoords.push(c));

      const halo = L.polyline(latLngs, {
        color: '#93c5fd',
        weight: 10,
        opacity: 0.45,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(halo);

      const line = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round'
      });
      layerGroup.addLayer(line);
    }

    const busCorridorCoords = [];
    if (hasValidSegmentGeometries) {
      mapSegments.forEach(seg => {
        if (seg.type !== 'walk' && seg.type !== 'connect' && Array.isArray(seg.geometry) && seg.geometry.length > 1) {
          seg.geometry.forEach(p => busCorridorCoords.push([Number(p[0]), Number(p[1])]));
        }
      });
      if (busCorridorCoords.length === 0) {
        mapSegments.forEach(seg => {
          if (Array.isArray(seg.geometry) && seg.geometry.length > 1) {
            seg.geometry.forEach(p => busCorridorCoords.push([Number(p[0]), Number(p[1])]));
          }
        });
      }
    }

    const onPathStopsToRender = [];
    routePoints.forEach((pt, idx) => {
      const isBoarding = pt.isBoarding || idx === 0;
      const isAlighting = pt.isAlighting || idx === routePoints.length - 1;

      if (hasValidSegmentGeometries && busCorridorCoords.length > 1) {
        const snap = snapPointToPolyline(pt, busCorridorCoords);

        if (isBoarding) {
          onPathStopsToRender.push({
            ...pt,
            snappedPos: busCorridorCoords[0],
            tTotal: 0,
            originalIndex: idx
          });
        } else if (isAlighting) {
          onPathStopsToRender.push({
            ...pt,
            snappedPos: busCorridorCoords[busCorridorCoords.length - 1],
            tTotal: busCorridorCoords.length,
            originalIndex: idx
          });
        } else if (snap.distanceMeters <= 1100) {

          onPathStopsToRender.push({
            ...pt,
            snappedPos: snap.snapped,
            tTotal: snap.tTotal,
            originalIndex: idx
          });
        }
      } else {

        onPathStopsToRender.push({
          ...pt,
          snappedPos: [pt.lat, pt.lng],
          tTotal: idx,
          originalIndex: idx
        });
      }
    });

    onPathStopsToRender.sort((a, b) => a.tTotal - b.tTotal);

    onPathStopsToRender.forEach((pt, renderIdx) => {

      const pos = pt.snappedPos;
      allBoundsCoords.push(pos);

      let iconColor = '#2563eb';
      let isLarge = false;
      let pulse = false;
      const isIntermediate = !pt.isBoarding && !pt.isAlighting;

      if (pt.isBoarding) {
        iconColor = '#10b981';
        isLarge = true;
        pulse = true;
      } else if (pt.isAlighting) {
        iconColor = '#ef4444';
        isLarge = true;
        pulse = true;
      }

      const marker = L.marker(pos, {
        icon: createMarkerIcon({
          color: iconColor,
          pulse,
          isLarge,
          isIntermediate,
          label: pt.name
        }),
        title: pt.name,
        zIndexOffset: isIntermediate ? 350 : 600
      });

      const popupContent = `
        <div style="font-family: inherit; padding: 4px 6px; color: #0f172a; min-width: 175px;">
          <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: ${iconColor};">
            ${pt.isBoarding ? '🟢 Starting Bus Stand' : pt.isAlighting ? '🔴 Destination Bus Stand' : `🔵 Bus Stop ${renderIdx + 1}`}
          </div>
          <div style="font-size: 13px; font-weight: 700; margin-top: 3px; color: #0f172a;">${pt.name}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 2px;">Scheduled: ${pt.time}</div>
        </div>
      `;

      marker.bindPopup(popupContent, { offset: [0, -10] });

      marker.on('click', () => {
        if (onSelectCheckpoint) onSelectCheckpoint(pt.originalIndex);
      });

      layerGroup.addLayer(marker);
    });

    if (userLocation && userLocation.lat && userLocation.lng) {
      const startPt = routePoints[0];
      const distFromStart = startPt
        ? Math.sqrt(Math.pow((userLocation.lat - startPt.lat) * 111, 2) + Math.pow((userLocation.lng - startPt.lng) * 96, 2))
        : 0;
      const isUserNearby = distFromStart <= 25.0;

      if (isUserNearby) {
        const userPos = [userLocation.lat, userLocation.lng];
        allBoundsCoords.push(userPos);

        const headingAngle = routePoints.length > 0
          ? calculateBearing(userLocation, routePoints[0])
          : 0;

        const userMarker = L.marker(userPos, {
          icon: createLocationArrowIcon(headingAngle, userLocation.isEstimated),
          title: 'Your Current Location (Live GPS)',
          zIndexOffset: 1000
        }).bindPopup(`
          <div style="font-family: inherit; padding: 4px 6px; color: #0f172a; min-width: 190px;">
            <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #2563eb; display: flex; align-items: center; gap: 4px;">
              <span>🧭</span>
              <span>${userLocation.isEstimated ? 'Your Location (Estimated)' : 'Your Current Location (GPS)'}</span>
            </div>
            <div style="font-size: 13px; font-weight: 700; margin-top: 3px; color: #0f172a;">Live Passenger Signal</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              ${userToBoardingDistKm ? `${userToBoardingDistKm} to ${routePoints[0]?.name || 'Boarding Stop'}` : 'Live location active'}
            </div>
          </div>
        `, { offset: [0, -10] });

        layerGroup.addLayer(userMarker);

        if (routePoints[0] && !isUserAtBoarding) {
          const hasExistingConnect = Array.isArray(mapSegments) && mapSegments.some(
            s => (s.type === 'walk' || s.type === 'connect') && Array.isArray(s.geometry) && s.geometry.length > 1
          );
          if (!hasExistingConnect) {
            const userAccessLine = L.polyline([
              userPos,
              [routePoints[0].lat, routePoints[0].lng]
            ], {
              color: '#475569',
              weight: 3.5,
              dashArray: '6, 8',
              opacity: 0.85,
              lineCap: 'round',
              lineJoin: 'round'
            });
            layerGroup.addLayer(userAccessLine);
          }
        }
      }
    }

    try {
      if (allBoundsCoords.length > 0) {
        map.fitBounds(L.latLngBounds(allBoundsCoords), {
          padding: [50, 50],
          maxZoom: 15
        });
      }
    } catch (e) {
      map.setView(centerCoord, 13);
    }
  }, [routePoints, mapSegments, userLocation, userToBoardingDistKm, isUserAtBoarding, centerCoord, onSelectCheckpoint]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleFitRoute = () => {
    if (!mapInstanceRef.current || routePoints.length === 0) return;
    const latLngs = routePoints.map(p => [p.lat, p.lng]);
    if (userLocation) latLngs.push([userLocation.lat, userLocation.lng]);
    mapInstanceRef.current.fitBounds(L.latLngBounds(latLngs), { padding: [50, 50] });
  };

  const handleLocateUser = () => {
    if (!mapInstanceRef.current || !userLocation) {
      if (onRequestGps) onRequestGps();
      return;
    }
    mapInstanceRef.current.flyTo([userLocation.lat, userLocation.lng], 15, {
      duration: 1.0
    });
  };

  const toggleMapType = () => {
    const map = mapInstanceRef.current;
    if (!map || !tileLayerRef.current) return;

    map.removeLayer(tileLayerRef.current);

    if (mapType === 'light') {

      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 19 }
      );
      satLayer.addTo(map);
      tileLayerRef.current = satLayer;
      setMapType('satellite');
    } else {

      const osmLayer = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 19 }
      );
      osmLayer.addTo(map);
      tileLayerRef.current = osmLayer;
      setMapType('light');
    }
  };

  return (
    <div className="free-journey-map-card">

      <div className="map-hud-top">
        <div className="map-hud-pill">
          <span className="live-pulse-dot" />
          <span className="hud-title">Live Transit</span>
          <span className="hud-divider">•</span>
          <span className="hud-bus-number">{busNumber ? `Line ${busNumber}` : 'CTU Express'}</span>
        </div>

        <div className="map-hud-actions">
          {userLocation && (
            <button
              type="button"
              onClick={handleLocateUser}
              className="hud-action-btn icon-only"
              title="Focus on Your Location"
              aria-label="Focus on Your Location"
            >
              <Navigation size={14} className="text-blue" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className={`hud-action-btn icon-only ${showLegend ? 'is-active' : ''}`}
            title="Toggle Map Route Guide & Legend"
            aria-label="Toggle Route Guide"
          >
            <Info size={14} />
          </button>
          <button
            type="button"
            onClick={toggleMapType}
            className="hud-action-btn icon-only"
            title={mapType === 'light' ? 'Switch to Satellite View' : 'Switch to Street Map'}
            aria-label="Toggle Satellite"
          >
            <Layers size={14} />
          </button>
          <button
            type="button"
            onClick={handleFitRoute}
            className="hud-action-btn icon-only"
            title="Recenter and Fit Full Journey"
            aria-label="Recenter Map"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      <div
        ref={mapContainerRef}
        className="leaflet-map-element"
        style={{ width: '100%', height: '540px', borderRadius: '22px', zIndex: 1 }}
      />

      <div className="map-zoom-controls">
        <button type="button" onClick={handleZoomIn} className="map-zoom-btn" title="Zoom in">+</button>
        <button type="button" onClick={handleZoomOut} className="map-zoom-btn" title="Zoom out">−</button>
      </div>

      {showLegend && (
        <div className="map-floating-legend-overlay">
          <div className="legend-header">
            <span className="legend-header-title">Map Route Guide</span>
            <button
              type="button"
              onClick={() => setShowLegend(false)}
              className="legend-close-btn"
              title="Close Guide"
            >
              ×
            </button>
          </div>
          <div className="legend-grid">
            <div className="legend-row">
              <div className="legend-symbol-cell">
                <div className="legend-user-arrow">
                  <svg viewBox="0 0 24 24" width="11" height="11" fill="#ffffff">
                    <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"/>
                  </svg>
                </div>
              </div>
              <div className="legend-text-cell">
                <span className="legend-title">Location Arrow</span>
                <span className="legend-desc">Your Live Signal</span>
              </div>
            </div>

            <div className="legend-row">
              <div className="legend-symbol-cell">
                <span className="legend-dot-symbol green" />
              </div>
              <div className="legend-text-cell">
                <span className="legend-title">Green Marker</span>
                <span className="legend-desc">Starting Bus Stand</span>
              </div>
            </div>

            <div className="legend-row">
              <div className="legend-symbol-cell">
                <span className="legend-dot-symbol blue" />
              </div>
              <div className="legend-text-cell">
                <span className="legend-title">Blue Points</span>
                <span className="legend-desc">Intermediate Stops</span>
              </div>
            </div>

            <div className="legend-row">
              <div className="legend-symbol-cell">
                <span className="legend-dot-symbol red" />
              </div>
              <div className="legend-text-cell">
                <span className="legend-title">Red Marker</span>
                <span className="legend-desc">Destination Stand</span>
              </div>
            </div>

            <div className="legend-row">
              <div className="legend-symbol-cell">
                <span className="legend-line-symbol dashed" />
              </div>
              <div className="legend-text-cell">
                <span className="legend-title">Dashed Line</span>
                <span className="legend-desc">Access to Bus Stop</span>
              </div>
            </div>

            <div className="legend-row">
              <div className="legend-symbol-cell">
                <span className="legend-line-symbol solid" />
              </div>
              <div className="legend-text-cell">
                <span className="legend-title">Solid Blue Line</span>
                <span className="legend-desc">Transit Corridor</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="map-bottom-bar">
        {!isUserAtBoarding && userToBoardingDistKm && (
          <div className="bottom-metric">
            <Footprints size={15} className="metric-icon text-slate" />
            <div className="metric-info">
              <span className="metric-val">{userToBoardingDistKm}</span>
              <span className="metric-lbl">To Boarding</span>
            </div>
          </div>
        )}

        <div className="bottom-metric">
          <Bus size={15} className="metric-icon text-blue" />
          <div className="metric-info">
            <span className="metric-val">{cleanDistance}</span>
            <span className="metric-lbl">Transit Corridor</span>
          </div>
        </div>

        <div className="bottom-metric">
          <Clock size={15} className="metric-icon text-emerald" />
          <div className="metric-info">
            <span className="metric-val">{cleanTotalTime}</span>
            <span className="metric-lbl">Est. Duration</span>
          </div>
        </div>

        <div className="bottom-metric">
          <Navigation size={15} className="metric-icon text-indigo" />
          <div className="metric-info">
            <span className="metric-val">{cleanArrivalTime}</span>
            <span className="metric-lbl">Destination ETA</span>
          </div>
        </div>
      </div>

      <style>{`
        .free-journey-map-card {
          position: relative;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 26px;
          padding: 16px;
          box-shadow:
            0 16px 38px -8px rgba(15, 23, 42, 0.08),
            0 4px 12px -2px rgba(15, 23, 42, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          overflow: hidden;
        }

        .map-hud-top {
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 10;
          pointer-events: none;
          gap: 12px;
        }

        .map-hud-pill {
          pointer-events: auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(226, 232, 240, 0.9);
          padding: 7px 14px;
          border-radius: 9999px;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(14px);
          max-width: 240px;
          white-space: nowrap;
        }

        .live-pulse-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow: 0 0 8px #10b981;
          animation: pulse 1.8s infinite;
          flex-shrink: 0;
        }

        .hud-title {
          font-size: 0.8rem;
          font-weight: 700;
          color: #0f172a;
        }

        .hud-divider {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .hud-bus-number {
          font-size: 0.8rem;
          font-weight: 700;
          color: #2563eb;
        }

        .map-hud-actions {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 7px;
          flex-shrink: 0;
        }

        .hud-action-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(226, 232, 240, 0.9);
          color: #334155;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.06);
          backdrop-filter: blur(14px);
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .hud-action-btn.icon-only {
          width: 36px;
          height: 36px;
          padding: 0;
          border-radius: 50%;
        }

        .hud-action-btn:hover,
        .hud-action-btn.is-active {
          background: #ffffff;
          color: #2563eb;
          border-color: #bfdbfe;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(37, 99, 235, 0.15);
        }

        .leaflet-map-element {
          border-radius: 20px;
          box-shadow: inset 0 0 0 1px rgba(226, 232, 240, 0.8);
          overflow: hidden;
        }

        .leaflet-tile {
          filter: contrast(0.96) brightness(1.02) saturate(0.85);
        }

        .map-zoom-controls {
          position: absolute;
          right: 20px;
          bottom: 24px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 10;
        }

        .map-zoom-btn {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(226, 232, 240, 0.9);
          color: #0f172a;
          font-size: 1.1rem;
          font-weight: 600;
          line-height: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
          backdrop-filter: blur(12px);
          transition: all 0.2s ease;
        }

        .map-zoom-btn:hover {
          background: #ffffff;
          color: #2563eb;
          border-color: #2563eb;
        }

        .map-floating-legend-overlay {
          position: absolute;
          top: 68px;
          right: 20px;
          z-index: 10;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(226, 232, 240, 0.95);
          border-radius: 18px;
          padding: 13px 15px;
          box-shadow: 0 12px 28px -4px rgba(15, 23, 42, 0.12);
          backdrop-filter: blur(16px);
          width: 240px;
          max-width: calc(100% - 40px);
          animation: fadeIn 0.2s ease;
        }

        .legend-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid #e2e8f0;
        }

        .legend-header-title {
          font-size: 0.74rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #0f172a;
        }

        .legend-close-btn {
          background: none;
          border: none;
          font-size: 1.1rem;
          color: #64748b;
          cursor: pointer;
          line-height: 1;
          padding: 0 4px;
        }

        .legend-close-btn:hover {
          color: #0f172a;
        }

        .legend-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .legend-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .legend-symbol-cell {
          width: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .legend-user-arrow {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #2563eb;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.35);
        }

        .legend-dot-symbol {
          width: 11px;
          height: 11px;
          border-radius: 50%;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 5px rgba(15, 23, 42, 0.2);
        }

        .legend-dot-symbol.green { background: #10b981; }
        .legend-dot-symbol.blue {
          background: #ffffff;
          border: 2px solid #2563eb;
          width: 8px;
          height: 8px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.3);
        }
        .legend-dot-symbol.red { background: #ef4444; }

        .legend-line-symbol {
          height: 3px;
          width: 16px;
          border-radius: 2px;
        }

        .legend-line-symbol.dashed {
          border-top: 2.5px dashed #475569;
          height: 0;
        }

        .legend-line-symbol.solid {
          background: #2563eb;
          box-shadow: 0 0 5px rgba(37, 99, 235, 0.4);
        }

        .legend-text-cell {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }

        .legend-title {
          font-size: 0.74rem;
          font-weight: 700;
          color: #0f172a;
        }

        .legend-desc {
          font-size: 0.66rem;
          color: #64748b;
        }

        .map-bottom-bar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(105px, 1fr));
          gap: 12px;
          align-items: center;
          margin-top: 14px;
          padding: 12px 18px;
          background: rgba(248, 250, 252, 0.95);
          border: 1px solid #e2e8f0;
          border-radius: 18px;
        }

        .bottom-metric {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .metric-icon {
          flex-shrink: 0;
        }

        .metric-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .metric-val {
          display: block;
          font-size: 0.92rem;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .metric-lbl {
          display: block;
          font-size: 0.67rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-top: 2px;
          white-space: nowrap;
        }

        .custom-intermediate-point-marker {
          background: transparent !important;
          border: none !important;
        }

        .intermediate-stop-node {
          width: 12px;
          height: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          pointer-events: auto;
        }

        .intermediate-stop-point {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #2563eb;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.45);
          display: block;
          transition: transform 0.15s cubic-bezier(0.2, 0, 0, 1), background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .intermediate-stop-node:hover .intermediate-stop-point {
          transform: scale(1.6);
          background: #2563eb;
          border-color: #ffffff;
          box-shadow: 0 2px 8px rgba(37, 99, 235, 0.7);
        }

        .custom-free-marker {
          background: transparent !important;
          border: none !important;
        }

        .marker-outer {
          position: relative;
          border-radius: 50%;
          border: 2.5px solid #ffffff;
          box-shadow: 0 3px 10px rgba(15, 23, 42, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .marker-inner-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ffffff;
        }

        .marker-pulse-ring {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 2px solid #2563eb;
          opacity: 0.75;
          animation: pulse-ring 2s cubic-bezier(0.2, 0, 1) infinite;
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.8); opacity: 0; }
        }

        .custom-location-arrow-marker {
          background: transparent !important;
          border: none !important;
        }

        .user-location-arrow-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: auto;
          cursor: pointer;
        }

        .user-arrow-pill-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(15, 23, 42, 0.92);
          color: #ffffff;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 3px 9px;
          border-radius: 9999px;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.28);
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.25);
          margin-bottom: 5px;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .user-arrow-pill-badge.estimated {
          background: rgba(30, 41, 59, 0.92);
          border-color: rgba(245, 158, 11, 0.4);
        }

        .user-location-arrow-container:hover .user-arrow-pill-badge {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(15, 23, 42, 0.35);
        }

        .user-live-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #38bdf8;
          box-shadow: 0 0 6px #38bdf8;
          animation: user-indicator-pulse 1.8s infinite;
        }

        .user-live-indicator.estimated {
          background: #f59e0b;
          box-shadow: 0 0 6px #f59e0b;
        }

        @keyframes user-indicator-pulse {
          0% { transform: scale(0.9); opacity: 0.9; }
          50% { transform: scale(1.3); opacity: 1; }
          100% { transform: scale(0.9); opacity: 0.9; }
        }

        .user-arrow-graphic-wrapper {
          position: relative;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-arrow-beam-cone {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 0;
          height: 0;
          pointer-events: none;
          transform-origin: center center;
        }

        .user-arrow-beam-cone::after {
          content: '';
          position: absolute;
          bottom: 12px;
          left: -22px;
          width: 44px;
          height: 40px;
          background: linear-gradient(to top, rgba(37, 99, 235, 0.45) 0%, rgba(56, 189, 248, 0.15) 60%, rgba(56, 189, 248, 0.0) 100%);
          clip-path: polygon(50% 100%, 0% 0%, 100% 0%);
          pointer-events: none;
        }

        .user-arrow-pulse-ring {
          position: absolute;
          inset: -6px;
          border-radius: 50%;
          background: rgba(37, 99, 235, 0.22);
          border: 2px solid #2563eb;
          animation: user-radar-wave 2.2s cubic-bezier(0.2, 0, 0, 1) infinite;
          pointer-events: none;
        }

        .user-arrow-pulse-ring.estimated {
          background: rgba(245, 158, 11, 0.18);
          border-color: #f59e0b;
        }

        @keyframes user-radar-wave {
          0% { transform: scale(0.8); opacity: 0.95; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        .user-arrow-heading-rotator {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.35s cubic-bezier(0.2, 0, 0, 1);
          transform-origin: center center;
        }

        .user-arrow-core-disc {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          border: 2.5px solid #ffffff;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-chevron-svg {
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.4));
        }

        .text-blue { color: #2563eb; }
        .text-emerald { color: #059669; }
        .text-indigo { color: #4f46e5; }
        .text-slate { color: #475569; }
      `}</style>
    </div>
  );
}

