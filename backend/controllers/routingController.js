
const { routingService } = require('../services/routingService');
const { geocode, searchLocations } = require('../services/geocodingService');

function snapPointToPolyline(point, polyline) {
  if (!polyline || polyline.length < 2) {
    return { snapped: [Number(point.lat), Number(point.lng)], distanceMeters: 0, tTotal: 0 };
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

function snapAndFilterStops(stops, polyline, maxDistM = 280) {
  if (!Array.isArray(stops) || stops.length === 0) return [];
  if (!Array.isArray(polyline) || polyline.length < 2) return stops;

  const result = [];
  stops.forEach((s, idx) => {
    const isFirst = idx === 0;
    const isLast = idx === stops.length - 1;
    const snap = snapPointToPolyline(s, polyline);

    if (isFirst) {
      result.push({
        ...s,
        lat: polyline[0][0],
        lng: polyline[0][1],
        tTotal: 0
      });
    } else if (isLast) {
      result.push({
        ...s,
        lat: polyline[polyline.length - 1][0],
        lng: polyline[polyline.length - 1][1],
        tTotal: polyline.length - 1
      });
    } else if (snap.distanceMeters <= maxDistM) {
      result.push({
        ...s,
        lat: snap.snapped[0],
        lng: snap.snapped[1],
        tTotal: snap.tTotal
      });
    }
  });

  result.sort((a, b) => a.tTotal - b.tTotal);
  return result;
}

async function getWalkingRoute(req, res, next) {
  try {
    const fromLat = parseFloat(req.query.fromLat);
    const fromLng = parseFloat(req.query.fromLng);
    const toLat = parseFloat(req.query.toLat);
    const toLng = parseFloat(req.query.toLng);

    if (isNaN(fromLat) || isNaN(fromLng) || isNaN(toLat) || isNaN(toLng)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COORDINATES',
          message: 'fromLat, fromLng, toLat, and toLng must be valid numbers.'
        }
      });
    }

    const result = await routingService.getWalkingRoute(
      { lat: fromLat, lng: fromLng },
      { lat: toLat, lng: toLng }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getRoadCorridorRoute(req, res, next) {
  try {
    const { stops } = req.body;
    if (!Array.isArray(stops) || stops.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STOPS',
          message: 'stops must be an array of at least 2 coordinate objects.'
        }
      });
    }

    const result = await routingService.getRoadCorridorRoute(stops);
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function enrichJourney(req, res, next) {
  try {
    const { journey, userLocation, destination, origin } = req.body;
    if (!journey) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_JOURNEY',
          message: 'A journey object is required to enrich.'
        }
      });
    }

    const enriched = { ...journey };
    const segments = [];

    const stopDetails = journey.stopDetails || [];
    const firstStop = stopDetails[0];

    const originStr = origin || journey.origin || journey.originInfo?.query || journey.checkpoints?.[0]?.from || null;
    let startCoords = null;

    if (journey.startLocation?.lat && journey.startLocation?.lng) {
      startCoords = {
        lat: Number(journey.startLocation.lat),
        lng: Number(journey.startLocation.lng),
        name: journey.startLocation.name || originStr || 'Start'
      };
    } else if (journey.originInfo?.lat && journey.originInfo?.lng) {
      startCoords = {
        lat: Number(journey.originInfo.lat),
        lng: Number(journey.originInfo.lng),
        name: journey.originInfo.query || originStr || 'Start'
      };
    } else if (originStr && firstStop && originStr.toLowerCase().trim() !== firstStop.name.toLowerCase().trim()) {
      try {
        const originGeo = await geocode(originStr);
        if (originGeo && originGeo.latitude && originGeo.longitude) {
          startCoords = {
            lat: originGeo.latitude,
            lng: originGeo.longitude,
            name: originGeo.name || originStr
          };
        }
      } catch (err) {

      }
    }

    let candidateStart = startCoords;
    if (userLocation && userLocation.lat && userLocation.lng && firstStop) {
      const dLat = (Number(userLocation.lat) - firstStop.lat) * 111000;
      const dLng = (Number(userLocation.lng) - firstStop.lng) * 96000;
      const userDistM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

      const isExplicitUserLoc = originStr && (
        originStr.toLowerCase().includes('current') ||
        originStr.toLowerCase().includes('location') ||
        originStr.toLowerCase().includes('gps') ||
        originStr.toLowerCase().includes('my location')
      );

      if (isExplicitUserLoc || (!startCoords && userDistM <= 25000) || (userDistM <= 3000 && userDistM > 80)) {
        candidateStart = {
          lat: Number(userLocation.lat),
          lng: Number(userLocation.lng),
          name: startCoords?.name ? `${startCoords.name} (Your GPS)` : 'Your Location'
        };
      }
    }

    let userWalkSegment = null;
    if (candidateStart && firstStop) {
      const dLat = (candidateStart.lat - firstStop.lat) * 111000;
      const dLng = (candidateStart.lng - firstStop.lng) * 96000;
      const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

      if ((distM > 60 && distM <= 25000) || journey.isFirstMileConnect || journey.checkpoints?.[0]?.type === 'transit_connect') {
        const walkRes = await routingService.getWalkingRoute(
          { lat: candidateStart.lat, lng: candidateStart.lng },
          { lat: firstStop.lat, lng: firstStop.lng }
        );
        const isConnect = (walkRes.distanceMeters || distM) > 1200 || journey.isFirstMileConnect;
        const connectMinutes = isConnect
          ? Math.max(8, Math.round(((walkRes.distanceMeters || distM) / 1000) * 2))
          : walkRes.durationMinutes;

        userWalkSegment = {
          segmentId: 'seg-origin-connect',
          type: isConnect ? 'connect' : 'walk',
          title: isConnect
            ? `Connect to ${firstStop.name} (Auto / Cab / Transit)`
            : `Walk to ${firstStop.name}`,
          from: startCoords?.name || originStr || candidateStart.name,
          fromCoords: { lat: candidateStart.lat, lng: candidateStart.lng },
          to: firstStop.name,
          toCoords: { lat: firstStop.lat, lng: firstStop.lng },
          distanceMeters: walkRes.distanceMeters || distM,
          distanceText: isConnect
            ? `${((walkRes.distanceMeters || distM) / 1000).toFixed(1)} km`
            : (walkRes.distanceText || `${distM} m`),
          durationMinutes: connectMinutes,
          durationText: isConnect ? `~${connectMinutes} min` : walkRes.durationText,
          isConnect,
          geometry: (walkRes.geometry && Array.isArray(walkRes.geometry) && walkRes.geometry.length > 0) ? walkRes.geometry : [[Number(candidateStart.lat), Number(candidateStart.lng)], [Number(firstStop.lat), Number(firstStop.lng)]],
          geometryUnavailable: false,
          status: 'active'
        };
        segments.push(userWalkSegment);
      }
    }

    if (journey.type === 'direct') {

      const busStops = stopDetails.map(s => ({ lat: s.lat, lng: s.lng, name: s.name }));
      const roadRoute = await routingService.getRoadCorridorRoute(busStops);
      const cleanGeom = (roadRoute.geometry && Array.isArray(roadRoute.geometry) && roadRoute.geometry.length > 0) ? roadRoute.geometry : busStops.map(s => [Number(s.lat), Number(s.lng)]);
      const onPathStops = snapAndFilterStops(stopDetails, cleanGeom, 1100);
      enriched.stopDetails = onPathStops;

      const busSegment = {
        segmentId: `seg-bus-${journey.busNumber || 'direct'}`,
        type: 'bus',
        busNumber: journey.busNumber,
        from: journey.boardingStop || firstStop?.name,
        to: journey.dropStop || stopDetails[stopDetails.length - 1]?.name,
        departureTime: journey.departureTime,
        arrivalTime: journey.arrivalTime?.includes('→') ? journey.arrivalTime.split('→')[1].trim() : journey.arrivalTime,
        scheduledDuration: journey.totalTimeMinutes || parseInt(journey.totalTime, 10) || 30,
        baselineDurationSeconds: roadRoute.baselineDurationSeconds,
        distanceKm: journey.distanceKm || journey.distance,
        intermediateStops: onPathStops,
        geometry: cleanGeom,
        isApproximation: true,
        isGeometryUnavailable: roadRoute.isUnavailable,
        color: '#2563EB',
        status: 'upcoming'
      };
      segments.push(busSegment);
    } else if (Array.isArray(journey.legs) && journey.legs.length > 0) {

      const allOnPathStops = [];
      for (let legIdx = 0; legIdx < journey.legs.length; legIdx++) {
        const leg = journey.legs[legIdx];
        const legStops = (leg.stopDetails || []).map(s => ({ lat: s.lat, lng: s.lng, name: s.name }));
        const roadRoute = await routingService.getRoadCorridorRoute(legStops);
        const cleanGeom = (roadRoute.geometry && Array.isArray(roadRoute.geometry) && roadRoute.geometry.length > 0) ? roadRoute.geometry : legStops.map(s => [Number(s.lat), Number(s.lng)]);
        const onPathLegStops = snapAndFilterStops(leg.stopDetails || [], cleanGeom, 1100);
        onPathLegStops.forEach(s => allOnPathStops.push(s));

        const busSegment = {
          segmentId: `seg-leg-${legIdx + 1}-${leg.busNumber}`,
          type: 'bus',
          legIndex: legIdx + 1,
          busNumber: leg.busNumber,
          from: leg.from || leg.boardingStop,
          to: leg.to || leg.dropStop,
          departureTime: legIdx === 0 ? journey.departureTime : (journey.legs[1]?.departureTime || 'Connecting'),
          arrivalTime: leg.estimatedTime ? `${leg.estimatedTime} min` : '',
          scheduledDuration: leg.estimatedTime || 15,
          baselineDurationSeconds: roadRoute.baselineDurationSeconds,
          distanceKm: leg.distance,
          intermediateStops: onPathLegStops,
          geometry: cleanGeom,
          isApproximation: true,
          isGeometryUnavailable: false,
          color: legIdx === 0 ? '#2563EB' : '#0284C7',
          status: 'upcoming'
        };
        segments.push(busSegment);

        if (legIdx < journey.legs.length - 1) {
          const transferStopName = journey.transferStops?.[0] || leg.to;
          const transferStopDetail = stopDetails.find(s => s.name === transferStopName) || { name: transferStopName, lat: 30.7208, lng: 76.7451 };

          const transferSegment = {
            segmentId: `seg-transfer-${legIdx + 1}`,
            type: 'transfer',
            title: `Transfer at ${transferStopName}`,
            hub: transferStopName,
            hubCoords: { lat: transferStopDetail.lat, lng: transferStopDetail.lng },
            waitDurationMinutes: journey.transferWaitMinutes || 5,
            connectingBusNumber: journey.legs[legIdx + 1]?.busNumber,
            geometry: null,
            status: 'upcoming'
          };
          segments.push(transferSegment);
        }
      }
      if (allOnPathStops.length > 0) {
        enriched.stopDetails = allOnPathStops;
      }
    }

    const lastStop = stopDetails[stopDetails.length - 1];
    const finalDestStr = destination || journey.destination;
    if (lastStop && finalDestStr) {
      const isSameAsLastStop = lastStop.name.toLowerCase().trim() === finalDestStr.toLowerCase().trim() ||
        lastStop.name.toLowerCase().includes(finalDestStr.toLowerCase()) ||
        finalDestStr.toLowerCase().includes(lastStop.name.toLowerCase());

      if (!isSameAsLastStop) {

        const destGeo = await geocode(finalDestStr);
        if (destGeo && destGeo.latitude && destGeo.longitude) {
          const finalWalkRes = await routingService.getWalkingRoute(
            { lat: lastStop.lat, lng: lastStop.lng },
            { lat: destGeo.latitude, lng: destGeo.longitude }
          );

          if (finalWalkRes.distanceMeters > 80) {
            const destWalkSegment = {
              segmentId: 'seg-dest-walk',
              type: 'walk_to_destination',
              title: `Walk to ${finalDestStr}`,
              from: lastStop.name,
              to: finalDestStr,
              distanceMeters: finalWalkRes.distanceMeters,
              distanceText: finalWalkRes.distanceText,
              durationMinutes: finalWalkRes.durationMinutes,
              durationText: finalWalkRes.durationText,
              geometry: (finalWalkRes.geometry && Array.isArray(finalWalkRes.geometry) && finalWalkRes.geometry.length > 0) ? finalWalkRes.geometry : [[Number(lastStop.lat), Number(lastStop.lng)], [Number(destGeo.latitude), Number(destGeo.longitude)]],
              geometryUnavailable: false,
              status: 'upcoming'
            };
            segments.push(destWalkSegment);
          }
        }
      }
    }

    enriched.mapSegments = segments;
    enriched.userWalkSegment = userWalkSegment;
    enriched.originSegment = userWalkSegment;
    if (candidateStart) {
      enriched.startLocation = candidateStart;
    }

    res.json({
      success: true,
      data: enriched
    });
  } catch (error) {
    next(error);
  }
}

async function getAutocompleteSuggestions(req, res, next) {
  try {
    const q = req.query.q || req.query.query || '';
    const results = await searchLocations(q);
    res.json({
      success: true,
      data: results
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getWalkingRoute,
  getRoadCorridorRoute,
  enrichJourney,
  getAutocompleteSuggestions
};

