import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Clock,
  IndianRupee,
  Footprints,
  Bus,
  Shuffle,
  Share2,
  Bookmark,
  Sparkles,
  CreditCard,
  X,
  Radio,
  CheckCircle2,
  AlertCircle,
  Navigation
} from 'lucide-react';
import AnimatedPage from '../components/AnimatedPage';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import JourneyMap from '../components/JourneyMap';
import JourneyCheckpoints from '../components/JourneyCheckpoints';
import { planJourneyApi, enrichJourneyGeometryApi, getWalkingRouteApi } from '../services/api';
import { MOCK_JOURNEYS } from '../data/mockJourneys';
import '../styles/JourneyDetailsPage.css';

function calculateMeters(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 180;
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

export default function JourneyDetailsPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const origin = searchParams.get('from') || 'Kharar';
  const destination = searchParams.get('to') || 'Railway Crossing towards Railway Station';

  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [ticketBooked, setTicketBooked] = useState(false);

  const [liveJourney, setLiveJourney] = useState(location.state?.journeyData || null);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(0);

  const [userLocation, setUserLocation] = useState(() => {
    if (location.state?.userLocation?.lat && location.state?.userLocation?.lng) {
      return location.state.userLocation;
    }
    const qLat = parseFloat(searchParams.get('fromLat'));
    const qLng = parseFloat(searchParams.get('fromLng'));
    if (!isNaN(qLat) && !isNaN(qLng)) {
      return { lat: qLat, lng: qLng };
    }

    const match = origin.match(/\(?([0-9]+\.[0-9]+)[,\s]+([0-9]+\.[0-9]+)\)?/);
    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        return { lat, lng };
      }
    }
    return null;
  });

  const [isGpsDenied, setIsGpsDenied] = useState(false);
  const [userWalkInfo, setUserWalkInfo] = useState(null);

  useEffect(() => {
    if (!liveJourney && origin && destination) {
      planJourneyApi(origin, destination)
        .then((res) => {
          if (res.availableRoutes && res.availableRoutes.length > 0) {
            const found = res.availableRoutes.find((r) => r.id === id) || res.availableRoutes[0];
            setLiveJourney(found);
          }
        })
        .catch((err) => {
          console.warn('[JourneyDetails] Could not fetch journey from API, using fallback:', err);
        });
    }
  }, [liveJourney, origin, destination, id]);

  const journey = liveJourney || MOCK_JOURNEYS.find((j) => j.id === id) || MOCK_JOURNEYS[0];

  const stopDetails = useMemo(() => {
    if (journey.stopDetails && journey.stopDetails.length > 0) {
      return journey.stopDetails;
    }
    if (journey.stops && journey.stops.length > 0) {
      return journey.stops.map((s, i) => ({
        name: s,
        lat: 30.7488 - i * 0.003,
        lng: 76.6429 + i * 0.010,
        order: i + 1,
        isBoarding: i === 0,
        isAlighting: i === journey.stops.length - 1
      }));
    }
    return [
      { name: origin, lat: 30.7488, lng: 76.6429, order: 1, isBoarding: true },
      { name: destination, lat: 30.7075, lng: 76.8205, order: 2, isAlighting: true }
    ];
  }, [journey, origin, destination]);

  const requestLocation = useCallback(() => {
    const assignEstimatedLocation = () => {
      setUserLocation((prev) => {
        if (prev) return prev;
        const first = stopDetails[0];
        if (first && first.lat && first.lng) {

          return {
            lat: Number(first.lat) + 0.0042,
            lng: Number(first.lng) - 0.0055,
            isEstimated: true
          };
        }
        return { lat: 30.7488, lng: 76.6429, isEstimated: true };
      });
    };

    if (!('geolocation' in navigator)) {
      setIsGpsDenied(true);
      assignEstimatedLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng, isSimulated: false, isEstimated: false });
        setIsGpsDenied(false);

        const watcher = navigator.geolocation.watchPosition(
          (watchPos) => {
            setUserLocation({
              lat: watchPos.coords.latitude,
              lng: watchPos.coords.longitude,
              isSimulated: false,
              isEstimated: false
            });
          },
          () => { },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );

        return () => navigator.geolocation.clearWatch(watcher);
      },
      (err) => {
        console.warn('[JourneyDetails] Geolocation permission denied or unavailable:', err.message);
        setIsGpsDenied(true);
        assignEstimatedLocation();
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  }, [stopDetails]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    const firstStop = stopDetails[0];
    if (userLocation && userLocation.lat && firstStop && firstStop.lat) {

      const dLat = (userLocation.lat - firstStop.lat) * 111;
      const dLng = (userLocation.lng - firstStop.lng) * 96;
      const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
      if (distKm > 15.0) {
        setUserWalkInfo(null);
        return;
      }

      getWalkingRouteApi(userLocation.lat, userLocation.lng, firstStop.lat, firstStop.lng)
        .then((res) => {
          if (res && res.distanceMeters <= 15000) {
            setUserWalkInfo({
              from: 'Your Location',
              to: firstStop.name,
              distanceMeters: res.distanceMeters,
              distanceText: res.distanceText,
              durationMinutes: res.durationMinutes,
              durationText: res.durationText,
              geometry: res.geometry,
              geometryUnavailable: res.geometryUnavailable
            });
          }
        })
        .catch(() => { });
    }
  }, [userLocation, stopDetails]);

  useEffect(() => {
    if (journey && (!journey.mapSegments || journey.mapSegments.length === 0)) {
      const firstStop = stopDetails[0];
      let nearbyUser = null;
      if (userLocation && firstStop) {
        const dLat = (Number(userLocation.lat) - Number(firstStop.lat)) * 111;
        const dLng = (Number(userLocation.lng) - Number(firstStop.lng)) * 96;
        if (Math.sqrt(dLat * dLat + dLng * dLng) <= 25.0) {
          nearbyUser = userLocation;
        }
      }

      enrichJourneyGeometryApi(journey, nearbyUser, destination, origin)
        .then((enriched) => {
          if (enriched && enriched.mapSegments) {
            setLiveJourney(enriched);
          }
        })
        .catch((err) => {
          console.warn('[JourneyDetails] Could not enrich journey geometries:', err.message);
        });
    }
  }, [journey, userLocation, destination, origin, stopDetails]);

  const mapSegments = useMemo(() => {
    let segs = [];
    if (journey.mapSegments && journey.mapSegments.length > 0) {
      segs = journey.mapSegments
        .filter(s => {
          if (s.type === 'walk' || s.type === 'connect' || s.segmentId === 'seg-origin-connect') {
            if (s.distanceMeters && s.distanceMeters > 25000) return false;
            if (Array.isArray(s.geometry) && s.geometry.length >= 2) {
              const p1 = s.geometry[0];
              const p2 = s.geometry[s.geometry.length - 1];
              const dLat = (p1[0] - p2[0]) * 111;
              const dLng = (p1[1] - p2[1]) * 96;
              if (Math.sqrt(dLat * dLat + dLng * dLng) > 25) return false;
            }
          }
          return true;
        })
        .map(s => ({ ...s }));
    } else if (journey.legs && journey.legs.length > 0) {
      segs = journey.legs.map((leg, idx) => ({
        segmentId: `leg-${idx + 1}`,
        type: 'bus',
        busNumber: leg.busNumber,
        from: leg.from,
        to: leg.to,
        distanceKm: leg.distance,
        intermediateStops: leg.stops || [],
        geometry: null,
        isApproximation: true,
        status: 'upcoming'
      }));
    }

    const firstStop = stopDetails[0];

    let isUserNearby = false;
    if (userLocation && firstStop) {
      const dLat = (Number(userLocation.lat) - Number(firstStop.lat)) * 111000;
      const dLng = (Number(userLocation.lng) - Number(firstStop.lng)) * 96000;
      const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));
      isUserNearby = distM <= 25000;
    }

    const sourcePt = (isUserNearby ? userLocation : null) || journey.startLocation || journey.originInfo;

    const existingOriginIdx = segs.findIndex(s =>
      s.type === 'connect' || s.type === 'walk' || s.segmentId === 'seg-origin-connect'
    );

    if (userWalkInfo && firstStop && userWalkInfo.distanceMeters <= 25000) {
      const isConnect = userWalkInfo.distanceMeters > 1200 || userWalkInfo.isConnect || journey.isFirstMileConnect;
      let geom = userWalkInfo.geometry;
      if (!geom || !Array.isArray(geom) || geom.length < 2) {
        if (sourcePt && firstStop) {
          geom = [
            [Number(sourcePt.lat), Number(sourcePt.lng)],
            [Number(firstStop.lat), Number(firstStop.lng)]
          ];
        }
      }

      const originSeg = {
        segmentId: 'seg-origin-connect',
        type: isConnect ? 'connect' : 'walk',
        title: isConnect
          ? `Connect to ${firstStop.name} (Auto / Cab / Transit)`
          : `Walk to ${firstStop.name}`,
        from: userWalkInfo.from || sourcePt?.name || 'Your Location',
        fromCoords: sourcePt ? { lat: Number(sourcePt.lat), lng: Number(sourcePt.lng) } : null,
        to: firstStop.name,
        toCoords: { lat: Number(firstStop.lat), lng: Number(firstStop.lng) },
        distanceMeters: userWalkInfo.distanceMeters,
        distanceText: userWalkInfo.distanceText,
        durationMinutes: userWalkInfo.durationMinutes,
        durationText: userWalkInfo.durationText,
        geometry: geom,
        status: 'active'
      };

      if (existingOriginIdx >= 0) {
        segs[existingOriginIdx] = { ...segs[existingOriginIdx], ...originSeg, geometry: geom || segs[existingOriginIdx].geometry };
      } else {
        segs.unshift(originSeg);
      }
    } else if (sourcePt && firstStop) {

      const dLat = (Number(sourcePt.lat) - Number(firstStop.lat)) * 111000;
      const dLng = (Number(sourcePt.lng) - Number(firstStop.lng)) * 96000;
      const distM = Math.round(Math.sqrt(dLat * dLat + dLng * dLng));

      if (distM > 60 && distM <= 25000 && existingOriginIdx === -1) {
        const isConnect = distM > 1200 || journey.isFirstMileConnect;
        const mins = isConnect ? Math.max(8, Math.round((distM / 1000) * 2)) : Math.max(1, Math.round(distM / 80));
        segs.unshift({
          segmentId: 'seg-origin-connect',
          type: isConnect ? 'connect' : 'walk',
          title: isConnect ? `Connect to ${firstStop.name} (Auto / Cab / Transit)` : `Walk to ${firstStop.name}`,
          from: sourcePt.name || 'Your Location',
          fromCoords: { lat: Number(sourcePt.lat), lng: Number(sourcePt.lng) },
          to: firstStop.name,
          toCoords: { lat: Number(firstStop.lat), lng: Number(firstStop.lng) },
          distanceMeters: distM,
          distanceText: distM >= 1000 ? `${(distM / 1000).toFixed(1)} km` : `${distM} m`,
          durationMinutes: mins,
          durationText: isConnect ? `~${mins} min ride` : `${mins} min walk`,
          geometry: [
            [Number(sourcePt.lat), Number(sourcePt.lng)],
            [Number(firstStop.lat), Number(firstStop.lng)]
          ],
          status: 'active'
        });
      }
    }

    return segs;
  }, [journey, userWalkInfo, userLocation, stopDetails]);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleBookTicket = (e) => {
    e.preventDefault();
    setTicketBooked(true);
    setTimeout(() => {
      setTicketBooked(false);
      setBookingModalOpen(false);
    }, 2500);
  };

  return (
    <AnimatedPage className="details-page-wrapper">
      <Navbar />

      <main className="details-main-content">
        <div className="details-stage-wrapper">
          <div className="container details-container">

            <div className="details-top-bar">
              <motion.button
                whileHover={{ scale: 1.03, x: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/results?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`)}
                className="back-to-results-btn"
              >
                <ArrowLeft size={16} />
                <span>Back to Results</span>
              </motion.button>

              <div className="details-mock-pill">
                <Radio size={14} className="text-blue animate-pulse" />
                <span>
                  {userLocation ? 'Live Passenger GPS Signal' : (isGpsDenied ? 'Starting from Boarding Stop' : 'Acquiring GPS...')}
                </span>
              </div>
            </div>

            <motion.div
              className="details-header-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
            >
              <div className="details-title-row">
                <div>
                  <span className="details-tag-pill">
                    {journey.tag || (journey.type === 'direct' ? 'DIRECT BUS' : 'BUS CHANGE')} ROUTE
                  </span>
                  <h1 className="serif-headline details-title">{origin} → {destination}</h1>
                </div>

                <div className="details-quick-actions">
                  <button
                    onClick={() => setBookmarked(!bookmarked)}
                    className={`icon-action-btn ${bookmarked ? 'is-active' : ''}`}
                    title="Save route"
                  >
                    <Bookmark size={18} fill={bookmarked ? "#3B82F6" : "none"} color={bookmarked ? "#3B82F6" : "currentColor"} />
                    <span>{bookmarked ? 'Saved' : 'Save'}</span>
                  </button>
                  <button onClick={handleShare} className="icon-action-btn" title="Share route">
                    <Share2 size={18} />
                    <span>{copied ? 'Copied Link!' : 'Share'}</span>
                  </button>
                </div>
              </div>

              <div className="details-stats-bar">
                <div className="d-stat">
                  <Clock size={20} className="d-stat-icon text-sky" />
                  <div>
                    <span className="d-stat-val">
                      {journey.totalTime}
                    </span>
                    <span className="d-stat-lbl">
                      Scheduled: {journey.arrivalTime}
                    </span>
                  </div>
                </div>

                <div className="d-stat-divider" />

                <div className="d-stat">
                  <IndianRupee size={20} className="d-stat-icon text-blue" />
                  <div>
                    <span className="d-stat-val">{journey.fare}</span>
                    <span className="d-stat-lbl">
                      {journey.ticketCount > 1
                        ? `${journey.ticketCount} separate tickets (${journey.fareBreakdown?.map(b => `${b.busNumber}: ${b.fare}`).join(' + ') || ''})`
                        : 'Total fare (1 ticket)'}
                    </span>
                  </div>
                </div>

                <div className="d-stat-divider" />

                <div className="d-stat">
                  <Bus size={20} className="d-stat-icon text-emerald" />
                  <div>
                    <span className="d-stat-val">
                      {journey.distanceKm ? `${journey.distanceKm} km` : (journey.distance ? `${journey.distance} km` : '19.2 km')}
                    </span>
                    <span className="d-stat-lbl">
                      Transit corridor
                    </span>
                  </div>
                </div>

                <div className="d-stat-divider" />

                <div className="d-stat">
                  <Shuffle size={20} className="d-stat-icon text-slate" />
                  <div>
                    <span className="d-stat-val">{journey.transfersCount || 'Direct'}</span>
                    <span className="d-stat-lbl">Interchanges</span>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="details-grid">

              <motion.div
                className="checkpoints-col"
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <JourneyCheckpoints
                  journey={journey}
                  mapSegments={mapSegments}
                  userWalkSegment={userWalkInfo || journey.userWalkSegment}
                  stopDetails={stopDetails}
                  userDistanceMeters={userWalkInfo?.distanceMeters || null}
                  activeSegmentIndex={activeSegmentIndex}
                  onSelectSegment={(idx) => setActiveSegmentIndex(idx)}
                  destinationName={destination}
                />
              </motion.div>

              <div className="map-summary-col">

                <motion.div
                  className="map-card-wrapper"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <JourneyMap
                    userLocation={userLocation}
                    startLocation={journey.startLocation || journey.originInfo || (mapSegments[0]?.fromCoords ? { lat: mapSegments[0].fromCoords.lat, lng: mapSegments[0].fromCoords.lng, name: mapSegments[0].from } : null)}
                    destinationLocation={journey.destinationLocation || journey.destinationInfo || null}
                    mapSegments={mapSegments}
                    stopDetails={stopDetails}
                    activeSegmentIndex={activeSegmentIndex}
                    onSelectSegment={(idx) => setActiveSegmentIndex(idx)}
                    sourceName={origin}
                    destinationName={destination}
                    isGpsDenied={isGpsDenied}
                    onRequestGps={requestLocation}
                    totalTime={journey.totalTime}
                    arrivalTime={journey.arrivalTime}
                    distanceKm={journey.distanceKm || journey.distance}
                    busNumber={journey.busNumber || journey.legs?.[0]?.busNumber}
                  />
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </AnimatedPage>
  );
}

