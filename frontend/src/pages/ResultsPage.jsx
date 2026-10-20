import React, { useMemo, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";

import {
  ArrowLeft,
  ArrowRight,
  Bus,
  Clock,
  Footprints,
  Route,
  Sparkles,
  Users,
  Shuffle,
  SlidersHorizontal,
  Zap,
  Navigation,
  Radio,
  MapPin
} from "lucide-react";

import Navbar from "../components/Navbar";
import AnimatedPage from "../components/AnimatedPage";

import { planJourney as planJourneyApi } from "../services/api";
import "../styles/ResultsPage.css";

const FILTERS = [
  {
    id: "all",
    label: "All Routes",
    icon: Route,
  },
  {
    id: "direct",
    label: "Direct Bus",
    icon: Bus,
  },
  {
    id: "transfer",
    label: "Bus Change",
    icon: Shuffle,
  },
  {
    id: "fastest",
    label: "Fastest",
    icon: Clock,
  },
  {
    id: "cheapest",
    label: "Cheapest",
    icon: Sparkles,
  },
];

export default function ResultsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const origin = searchParams.get("from") || "Kharar";
  const destination = searchParams.get("to") || "ISBT 17";
  const fromLat = searchParams.get("fromLat");
  const fromLng = searchParams.get("fromLng");
  const timeParam = searchParams.get("time");
  const modeParam = searchParams.get("mode") || "now";

  const [activeFilter, setActiveFilter] = useState("all");
  const [timingMode, setTimingMode] = useState(modeParam);
  const [departureTime, setDepartureTime] = useState(timeParam || "");
  const [indiaTime, setIndiaTime] = useState("");
  const [apiJourneys, setApiJourneys] = useState([]);
  const [sourceStop, setSourceStop] = useState(null);
  const [destStop, setDestStop] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [isSameLocation, setIsSameLocation] = useState(false);
  const [noRouteFound, setNoRouteFound] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setApiError(null);
    setIsSameLocation(false);
    setNoRouteFound(false);

    const origPayload = (fromLat && fromLng)
      ? { latitude: parseFloat(fromLat), longitude: parseFloat(fromLng) }
      : origin;

    planJourneyApi(origPayload, destination, {
      priority: activeFilter,
      departureTime: timeParam,
      timingMode: modeParam
    })
      .then((data) => {
        if (!isMounted) return;

        if (data.isSameLocation) {
          setIsSameLocation(true);
          setApiError(data.message || "The source and destination are the same.");
          setIsLoading(false);
          return;
        }

        if (data.noRouteFound) {
          setNoRouteFound(true);
          setApiJourneys([]);
          setIsLoading(false);
          return;
        }

        if (data.departureTime) {
          setDepartureTime(data.departureTime);
        }
        if (data.timingMode) {
          setTimingMode(data.timingMode);
        }
        if (data.indiaTime) {
          setIndiaTime(data.indiaTime);
        }

        setSourceStop(data.sourceStop || null);
        setDestStop(data.destinationStop || null);
        setExplanation(data.explanation || null);

        if (data.availableRoutes && data.availableRoutes.length > 0) {
          setApiJourneys(data.availableRoutes);
        } else {
          setNoRouteFound(true);
          setApiJourneys([]);
        }

        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setApiError(err.message || "Location not found in the current CTU data.");
        setApiJourneys([]);
        setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [origin, destination, fromLat, fromLng, timeParam, modeParam]);

  const filteredJourneys = useMemo(() => {
    let journeys = [...apiJourneys];

    switch (activeFilter) {
      case "direct":
        return journeys.filter(j => j.type === "direct");

      case "transfer":
        return journeys.filter(j => j.type === "transfer");

      case "fastest":
        return journeys.sort(
          (a, b) => getMinutes(a.totalTime) - getMinutes(b.totalTime)
        );

      case "cheapest":
        return journeys.sort(
          (a, b) => getFare(a.fare) - getFare(b.fare)
        );

      case "all":
      default:

        return journeys;
    }
  }, [activeFilter, apiJourneys]);

  const openJourney = (journeyId) => {
    const selectedJourney = filteredJourneys.find(j => j.id === journeyId);
    let navUrl = `/journey/${journeyId}?from=${encodeURIComponent(
      origin
    )}&to=${encodeURIComponent(destination)}`;

    if (fromLat && fromLng) {
      navUrl += `&fromLat=${encodeURIComponent(fromLat)}&fromLng=${encodeURIComponent(fromLng)}`;
    }

    const userLoc = (fromLat && fromLng)
      ? { lat: parseFloat(fromLat), lng: parseFloat(fromLng) }
      : null;

    navigate(
      navUrl,
      { state: { journeyData: selectedJourney, userLocation: userLoc } }
    );
  };

  return (
    <AnimatedPage className="results-page-wrapper">
      <Navbar />

      <main className="results-main-content">
          <div className="results-stage-wrapper">

            <div className="results-container">

              <section className="results-header-banner">

                <div className="banner-top-row">
                  <button
                    className="back-search-btn"
                    onClick={() => navigate("/search")}
                    type="button"
                    title="Return to search inputs"
                  >
                    <ArrowLeft size={14} />
                    <span>Modify Search</span>
                  </button>

                  <div className="banner-status-cluster">
                    {departureTime && (
                      <div
                        className={`results-timing-badge ${timingMode === 'now' ? 'is-live' : 'is-scheduled'}`}
                      >
                        {timingMode === 'now' ? (
                          <>
                            <span className="live-pulsing-beacon" />
                            <span>Departing Now • {departureTime} (IST)</span>
                          </>
                        ) : (
                          <>
                            <Clock size={12} />
                            <span>Scheduled: {departureTime}</span>
                          </>
                        )}
                      </div>
                    )}
                    <div className="results-count-badge">
                      <Route size={13} />
                      <span>{filteredJourneys.length} {filteredJourneys.length === 1 ? 'Route' : 'Routes'} Available</span>
                    </div>
                  </div>
                </div>

                <div className="banner-route-display">

                  <div className="banner-station-card origin">
                    <div className="station-role-label">
                      <span className="station-dot-indicator origin" />
                      <span>FROM</span>
                    </div>
                    <h2 className="station-name-text">{origin}</h2>
                    <div className="station-meta-badge">
                      {sourceStop ? (
                        sourceStop.isExactMatch ? (
                          <span className="station-status-pill exact">
                            <span className="pill-check">✓</span> Exact bus stop
                          </span>
                        ) : (
                          <span className="station-status-pill nearest">
                            <MapPin size={11} />
                            <span>Nearest: {sourceStop.name} ({sourceStop.distanceKm} km)</span>
                          </span>
                        )
                      ) : (
                        <span className="station-status-pill neutral">
                          <MapPin size={11} />
                          <span>Boarding Stand</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="banner-route-flow" aria-hidden="true">
                    <div className="flow-track">
                      <div className="flow-dash-line" />
                      <div className="flow-icon-bubble">
                        <Bus size={15} className="flow-bus-icon" />
                      </div>
                      <div className="flow-dash-line" />
                    </div>
                    <span className="flow-label-badge">CTU Direct Corridor</span>
                  </div>

                  <div className="banner-station-card destination">
                    <div className="station-role-label">
                      <span className="station-dot-indicator destination" />
                      <span>TO</span>
                    </div>
                    <h2 className="station-name-text">{destination}</h2>
                    <div className="station-meta-badge">
                      {destStop ? (
                        destStop.isExactMatch ? (
                          <span className="station-status-pill exact">
                            <span className="pill-check">✓</span> Exact bus stop
                          </span>
                        ) : (
                          <span className="station-status-pill nearest">
                            <MapPin size={11} />
                            <span>Nearest: {destStop.name} ({destStop.distanceKm} km)</span>
                          </span>
                        )
                      ) : (
                        <span className="station-status-pill neutral">
                          <MapPin size={11} />
                          <span>Drop-off Stand</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <section className="results-filter-bar">
                <div className="filter-title-group">
                  <SlidersHorizontal size={14} className="text-blue" />
                  <span className="filter-title-text">Compare Routes</span>
                </div>

                <div className="filter-tabs-group">
                  {FILTERS.map((filter) => {
                    const Icon = filter.icon;
                    const isActive = activeFilter === filter.id;
                    return (
                      <button
                        key={filter.id}
                        type="button"
                        className={`filter-tab-btn ${isActive ? "is-active" : ""}`}
                        onClick={() => setActiveFilter(filter.id)}
                      >
                        {Icon && <Icon size={13} className="filter-tab-icon" />}
                        <span>{filter.label}</span>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section className="results-list">
                {isLoading ? (
                  <div className="results-loading-card">
                    <div className="loading-spinner-halo">
                      <Clock size={30} className="loading-spinner-clock" />
                    </div>
                    <p className="loading-card-title">Calculating direct and transfer CTU routes...</p>
                    <span className="loading-card-subtitle">Scanning Chandigarh Tricity network & timetable schedules</span>
                  </div>
                ) : isSameLocation ? (
                  <div className="same-location-card">
                    <Route size={34} style={{ color: '#2563eb', marginBottom: '12px' }} />
                    <h3>The source and destination are the same.</h3>
                    <p>Please select different boarding and arrival points to plan your trip.</p>
                  </div>
                ) : apiError ? (
                  <div className="no-results-card">
                    <Route size={34} style={{ color: '#ef4444', marginBottom: '12px' }} />
                    <h3>{apiError}</h3>
                    <p>Please check your spelling or search for another known landmark in the Chandigarh Tricity region.</p>
                  </div>
                ) : noRouteFound || filteredJourneys.length === 0 ? (
                  <div className="no-results-card">
                    <Route size={34} style={{ color: '#64748b', marginBottom: '12px' }} />
                    <h3>No bus route was found between these locations using the current CTU data.</h3>
                    <p>
                      {activeFilter === 'direct'
                        ? "No direct bus runs between these stops. Try clicking 'Bus Change' or 'All Routes' to see transfer options."
                        : "Try changing the route filter or adjusting your starting point."}
                    </p>
                  </div>
                ) : (
                  filteredJourneys.map((journey, index) => {
                    const isDirect = journey.type === "direct";

                    return (
                      <motion.article
                        key={journey.id || index}
                        className="journey-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.05 + index * 0.06 }}
                        onClick={() => openJourney(journey.id)}
                      >
                        <div className="journey-card-inner">

                          <div className="journey-card-top">
                            <div className="journey-badges">
                              <span className={`badge-tag ${isDirect ? "badge-direct" : "badge-transfer"}`}>
                                {isDirect ? "DIRECT BUS" : "BUS CHANGE"}
                              </span>

                              <span className="crowding-badge">
                                <Users size={11} />
                                <span>{isDirect ? "No Change" : "1 Interchange"}</span>
                              </span>

                              {journey.trafficInfo && journey.trafficInfo.delayMinutes > 0 && (
                                <span style={{
                                  fontSize: '0.72rem',
                                  fontWeight: '700',
                                  backgroundColor: 'rgba(245, 158, 11, 0.18)',
                                  color: '#FBBF24',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}>
                                  <span>{journey.trafficInfo.trafficBadge}</span>
                                </span>
                              )}
                            </div>

                            <div className="journey-time-summary">
                              <Clock size={13} />
                              <span>{journey.arrivalTime || `~${journey.totalTime}`}</span>
                            </div>
                          </div>

                          {journey.scheduleInfo && (
                            <div className={`results-schedule-strip ${journey.scheduleInfo.isServiceActive ? 'active-strip' : 'inactive-strip'}`}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontWeight: '700',
                                  color: journey.scheduleInfo.isServiceActive ? '#34D399' : '#FBBF24'
                                }}>
                                  <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: journey.scheduleInfo.isServiceActive ? '#22C55E' : '#F59E0B',
                                    display: 'inline-block'
                                  }} />
                                  {journey.scheduleInfo.isServiceActive
                                    ? (journey.scheduleInfo.nextBusInMinutes === 0
                                      ? `Bus arriving now (${journey.scheduleInfo.nextBusTime})`
                                      : `Next bus in ${formatMinutesWait(journey.scheduleInfo.nextBusInMinutes)} (${journey.scheduleInfo.nextBusTime})`)
                                    : (journey.scheduleInfo.serviceStatus === 'before_first_bus'
                                      ? `First bus at ${journey.scheduleInfo.nextBusTime} (in ${formatMinutesWait(journey.scheduleInfo.nextBusInMinutes)})`
                                      : `Service concluded today • Next: ${journey.scheduleInfo.nextBusTime}`)
                                  }
                                </span>
                                <span style={{ color: '#64748B' }}>•</span>
                                <span style={{ color: '#94A3B8', fontWeight: '500' }}>
                                  {journey.scheduleInfo.frequencyDisplay}
                                </span>
                              </div>

                              {journey.scheduleInfo.upcomingDepartures && journey.scheduleInfo.upcomingDepartures.length > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: '#94A3B8', fontSize: '0.74rem' }}>Upcoming:</span>
                                  {journey.scheduleInfo.upcomingDepartures.slice(0, 3).map((depTime, depIdx) => (
                                    <span key={depIdx} className="departure-pill">
                                      {depTime}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="journey-summary">
                            <div className="summary-metric">
                              <span className="metric-val">{journey.totalTime}</span>
                              <span className="metric-lbl">Total Time</span>
                            </div>

                            <div className="summary-metric">
                              <span className="metric-val">{journey.fare}</span>
                              <span className="metric-lbl">{journey.ticketCount > 1 ? `Fare (${journey.ticketCount} tix)` : 'Estimated Fare'}</span>
                            </div>

                            <div className="summary-metric">
                              <span className="metric-val">{isDirect ? "0" : "1"}</span>
                              <span className="metric-lbl">Transfers</span>
                            </div>

                            <div className="summary-metric">
                              <span className="metric-val">{journey.walkingTime || '3 min'}</span>
                              <span className="metric-lbl">Walking</span>
                            </div>

                            <div className="summary-metric">
                              <span className="metric-val">{journey.distanceKm ? `${journey.distanceKm} km` : '12 km'}</span>
                              <span className="metric-lbl">Distance</span>
                            </div>
                          </div>

                          <div className="journey-transit-bar">
                            {journey.summarySegments?.map((segment, segmentIndex) => (
                              <React.Fragment key={`${journey.id}-${segmentIndex}`}>
                                <div className={`transit-node ${segment.type}`}>
                                  {segment.type === "walk" && <Footprints size={13} className="node-icon" />}
                                  {segment.type === "bus" && <Bus size={13} className="node-icon" />}
                                  {segment.type === "transfer" && <Shuffle size={13} className="node-icon" />}

                                  <span className="node-label">{segment.label}</span>
                                  <span className="node-time">{segment.duration}</span>
                                </div>

                                {segmentIndex < journey.summarySegments.length - 1 && (
                                  <div className="transit-connector-dot" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>

                          <div className="journey-card-bottom">
                            <div className="price-display">
                              <span className="price-label">{journey.ticketCount > 1 ? `Total Fare (${journey.ticketCount} Tickets)` : 'Estimated Fare'}</span>
                              <span className="price-amount">{journey.fare}</span>
                              {journey.fareBreakdown && journey.fareBreakdown.length > 1 && (
                                <span className="price-breakdown-subtext" style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                                  {journey.fareBreakdown.map(b => `${b.busNumber}: ${b.fare}`).join(' + ')}
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              className="view-details-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                openJourney(journey.id);
                              }}
                            >
                              <Navigation size={13} style={{ marginRight: '2px' }} />
                              <span>Live Track & Checkpoints</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })
                )}
              </section>
            </div>
          </div>
        </main>
    </AnimatedPage>
  );
}

function getMinutes(value) {
  if (!value) return 0;
  const match = String(value).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function getFare(value) {
  if (!value) return 0;
  const match = String(value).match(/[\d.]+/);
  return match ? Number(match[0]) : 0;
}

function formatMinutesWait(minutes) {
  if (typeof minutes !== 'number' || isNaN(minutes) || minutes <= 0) return 'now';
  if (minutes < 55) {
    return `${minutes} min`;
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hrs} ${hrs === 1 ? 'hour' : 'hours'}`;
  }
  return `${hrs} ${hrs === 1 ? 'hour' : 'hours'} ${mins} min`;
}

