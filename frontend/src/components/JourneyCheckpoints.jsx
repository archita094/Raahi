import React, { useState, useMemo } from 'react';
import {
  MapPin,
  Footprints,
  Bus,
  Shuffle,
  Clock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Navigation,
  Calendar,
  AlertCircle,
  Car
} from 'lucide-react';

function getSingleTime(timeStr, takeLast = true) {
  if (!timeStr) return '';
  if (typeof timeStr !== 'string') return String(timeStr);
  const parts = timeStr.split('→').map(s => s.trim().replace(/^~+/, '').trim()).filter(Boolean);
  if (parts.length === 0) return timeStr.trim();
  return takeLast ? parts[parts.length - 1] : parts[0];
}

function cleanDuration(durStr) {
  if (!durStr) return '';
  return durStr.replace(/^~+/, '').trim();
}

export default function JourneyCheckpoints({
  journey = {},
  mapSegments = [],
  userWalkSegment = null,
  stopDetails = [],
  userDistanceMeters = null,
  activeSegmentIndex = 0,
  onSelectSegment,
  destinationName = ''
}) {
  const [expandedLegStops, setExpandedLegStops] = useState({});

  const toggleLegStops = (legKey, e) => {
    e.stopPropagation();
    setExpandedLegStops(prev => ({
      ...prev,
      [legKey]: !prev[legKey]
    }));
  };

  const isDirect = journey.type === 'direct';
  const legs = journey.legs || [];
  const firstCp = journey.checkpoints?.[0];
  const isConnectRide = userWalkSegment?.isConnect ||
    (userWalkSegment?.distanceMeters && userWalkSegment.distanceMeters > 1200) ||
    journey?.isFirstMileConnect ||
    firstCp?.type === 'transit_connect';

  const cleanDepTime = useMemo(() => {
    return getSingleTime(journey.departureTime, false) || '02:47 PM';
  }, [journey.departureTime]);

  const cleanArrTime = useMemo(() => {
    return getSingleTime(journey.arrivalTime, true) || '03:39 PM';
  }, [journey.arrivalTime]);

  const cleanTotalTime = useMemo(() => {
    if (!journey.totalTime) return '52 min';
    return String(journey.totalTime).replace('min ride', 'min').replace('walk', '').trim();
  }, [journey.totalTime]);

  return (
    <div className="journey-checkpoints-card">

      <div className="checkpoints-list-header">
        <div>
          <h2 className="checkpoints-title">Journey Itinerary & Live Checkpoints</h2>
          <span className="checkpoints-subtitle">Synchronized navigation through CTU transit network</span>
        </div>
        <div className="ctu-schedule-badge">
          <Calendar size={13} />
          <span>CTU Official Timetable</span>
        </div>
      </div>

      <div className="checkpoints-stream">

        {userWalkSegment ? (
          <div
            className={`checkpoint-item ${activeSegmentIndex === 0 ? 'is-active' : activeSegmentIndex > 0 ? 'is-completed' : ''}`}
            onClick={() => onSelectSegment && onSelectSegment(0)}
          >
            <div className="checkpoint-marker-col">
              <div className="checkpoint-icon-node walk-node">
                {activeSegmentIndex > 0 ? <CheckCircle2 size={16} /> : (isConnectRide ? <Car size={16} /> : <Footprints size={16} />)}
              </div>
              <div className="checkpoint-trail-line" />
            </div>

            <div className="checkpoint-body-col">
              <div className="checkpoint-card-header">
                <span className="checkpoint-step-tag">
                  {isConnectRide ? 'CHECKPOINT 1 • PASSENGER CONNECT' : 'CHECKPOINT 1 • PASSENGER START'}
                </span>
                <div className="checkpoint-dist-badge">
                  {isConnectRide ? <Car size={12} /> : <Navigation size={12} />}
                  <span>~{cleanDuration(userWalkSegment.durationText)} • {userWalkSegment.distanceText}</span>
                </div>
              </div>

              <h3 className="checkpoint-headline">
                {isConnectRide ? `Take Auto / Cab / Transit to ${userWalkSegment.to}` : `Walk to ${userWalkSegment.to}`}
              </h3>

              <p className="checkpoint-instructions">
                {userWalkSegment.distanceMeters < 50 ? (
                  <span className="text-emerald font-semibold">
                    ✓ You are at the bus stop! Prepare to board.
                  </span>
                ) : isConnectRide ? (
                  `Take an auto, e-rickshaw, or cab to ${userWalkSegment.to} boarding platform.`
                ) : (
                  `Walk from your location to ${userWalkSegment.to} boarding platform.`
                )}
              </p>
            </div>
          </div>
        ) : (
          <div
            className={`checkpoint-item ${activeSegmentIndex === 0 ? 'is-active' : ''}`}
            onClick={() => onSelectSegment && onSelectSegment(0)}
          >
            <div className="checkpoint-marker-col">
              <div className="checkpoint-icon-node walk-node">
                {isConnectRide ? <Car size={16} /> : <Footprints size={16} />}
              </div>
              <div className="checkpoint-trail-line" />
            </div>

            <div className="checkpoint-body-col">
              <div className="checkpoint-card-header">
                <span className="checkpoint-step-tag">
                  {isConnectRide ? 'CHECKPOINT 1 • CONNECT' : 'CHECKPOINT 1 • START'}
                </span>
                <div className="checkpoint-dist-badge">
                  {isConnectRide ? <Car size={12} /> : <Navigation size={12} />}
                  <span>{firstCp?.distanceText || (journey.isFirstMileConnect ? `${journey.firstMileDistanceKm} km` : 'Boarding Stop')}</span>
                </div>
              </div>

              <h3 className="checkpoint-headline">
                {firstCp?.title || (isConnectRide ? `Take Auto / Cab to ${journey.boardingStop || stopDetails[0]?.name || 'Boarding Stop'}` : `Head to ${journey.boardingStop || stopDetails[0]?.name || 'Boarding Stop'}`)}
              </h3>

              <p className="checkpoint-instructions">
                {firstCp?.instruction || (isConnectRide ? `Take an auto or cab to ${journey.boardingStop || stopDetails[0]?.name} to board your CTU bus.` : `Proceed to ${journey.boardingStop || stopDetails[0]?.name} to board your CTU bus.`)}
              </p>
            </div>
          </div>
        )}

        {isDirect && (
          <div
            className={`checkpoint-item ${activeSegmentIndex === 1 ? 'is-active' : activeSegmentIndex > 1 ? 'is-completed' : ''}`}
            onClick={() => onSelectSegment && onSelectSegment(1)}
          >
            <div className="checkpoint-marker-col">
              <div className="checkpoint-icon-node bus-node">
                {activeSegmentIndex > 1 ? <CheckCircle2 size={16} /> : <Bus size={16} />}
              </div>
              <div className="checkpoint-trail-line" />
            </div>

            <div className="checkpoint-body-col">
              <div className="checkpoint-card-header">
                <span className="checkpoint-step-tag">CHECKPOINT 2 • DIRECT BUS</span>
                <span className="checkpoint-bus-badge">
                  CTU Line {journey.busNumber} {journey.fare ? `• Ticket ${journey.fare}` : ''}
                </span>
              </div>

              <h3 className="checkpoint-headline">
                Board at {journey.boardingStop || stopDetails[0]?.name} → {journey.dropStop || stopDetails[stopDetails.length - 1]?.name}
              </h3>

              <div className="checkpoint-timing-strip">
                <div className="time-pill">
                  <Clock size={12} />
                  <span>Scheduled: {cleanDepTime} → {cleanArrTime}</span>
                </div>
                <div className="time-pill distance-pill">
                  <span>{journey.distanceKm || journey.distance} km • {cleanTotalTime}</span>
                </div>
              </div>

              {stopDetails.length > 2 && (
                <div className="stops-accordion-wrap">
                  <button
                    type="button"
                    className="stops-toggle-btn"
                    onClick={(e) => toggleLegStops('direct', e)}
                  >
                    <span>{stopDetails.length - 2} Intermediate Stops</span>
                    {expandedLegStops['direct'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {expandedLegStops['direct'] && (
                    <div className="stops-expanded-list">
                      {stopDetails.map((stop, sIdx) => (
                        <div key={sIdx} className={`stop-row ${sIdx === 0 ? 'first' : sIdx === stopDetails.length - 1 ? 'last' : ''}`}>
                          <span className="stop-index">{stop.order || sIdx + 1}</span>
                          <span className="stop-row-name">{stop.name}</span>
                          {sIdx === 0 && <span className="board-tag-sm">Board</span>}
                          {sIdx === stopDetails.length - 1 && <span className="alight-tag-sm">Alight</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {!isDirect && legs.length >= 2 && (
          <>

            <div
              className={`checkpoint-item ${activeSegmentIndex === 1 ? 'is-active' : activeSegmentIndex > 1 ? 'is-completed' : ''}`}
              onClick={() => onSelectSegment && onSelectSegment(1)}
            >
              <div className="checkpoint-marker-col">
                <div className="checkpoint-icon-node bus-node">
                  {activeSegmentIndex > 1 ? <CheckCircle2 size={16} /> : <Bus size={16} />}
                </div>
                <div className="checkpoint-trail-line" />
              </div>

              <div className="checkpoint-body-col">
                <div className="checkpoint-card-header">
                  <span className="checkpoint-step-tag">STEP 1 • FIRST BUS</span>
                  <span className="checkpoint-bus-badge">
                    CTU Line {legs[0].busNumber} {legs[0].fare ? `• Ticket ${legs[0].fare}` : ''}
                  </span>
                </div>

                <h3 className="checkpoint-headline">
                  Board at {legs[0].from} → {legs[0].to}
                </h3>

                <div className="checkpoint-timing-strip">
                  <div className="time-pill">
                    <Clock size={12} />
                    <span>Scheduled: {cleanDepTime} → {getSingleTime(journey.detailedSteps?.[0]?.time, true) || `${legs[0].estimatedTime} min`}</span>
                  </div>
                  <div className="time-pill distance-pill">
                    <span>{legs[0].distance} km • {legs[0].estimatedTime} min</span>
                  </div>
                </div>

                {legs[0].stops && legs[0].stops.length > 2 && (
                  <div className="stops-accordion-wrap">
                    <button
                      type="button"
                      className="stops-toggle-btn"
                      onClick={(e) => toggleLegStops('leg0', e)}
                    >
                      <span>{legs[0].stops.length - 2} Intermediate Stops</span>
                      {expandedLegStops['leg0'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {expandedLegStops['leg0'] && (
                      <div className="stops-expanded-list">
                        {legs[0].stops.map((stopName, sIdx) => (
                          <div key={sIdx} className={`stop-row ${sIdx === 0 ? 'first' : sIdx === legs[0].stops.length - 1 ? 'last' : ''}`}>
                            <span className="stop-index">{sIdx + 1}</span>
                            <span className="stop-row-name">{stopName}</span>
                            {sIdx === legs[0].stops.length - 1 && <span className="transfer-tag-sm">Alight for Transfer</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div
              className={`checkpoint-item ${activeSegmentIndex === 2 ? 'is-active' : activeSegmentIndex > 2 ? 'is-completed' : ''}`}
              onClick={() => onSelectSegment && onSelectSegment(2)}
            >
              <div className="checkpoint-marker-col">
                <div className="checkpoint-icon-node transfer-node">
                  {activeSegmentIndex > 2 ? <CheckCircle2 size={16} /> : <Shuffle size={16} />}
                </div>
                <div className="checkpoint-trail-line" />
              </div>

              <div className="checkpoint-body-col">
                <div className="checkpoint-card-header">
                  <span className="checkpoint-step-tag">STEP 2 • INTERCHANGE</span>
                  <span className="checkpoint-wait-badge">
                    ⏱ Wait ~{journey.transferWaitMinutes || 44} min
                  </span>
                </div>

                <h3 className="checkpoint-headline">
                  Transfer at {journey.transferStops?.[0] || legs[0].to}
                </h3>

                <p className="checkpoint-instructions">
                  Alight from Bus {legs[0].busNumber} at {journey.transferStops?.[0] || legs[0].to}. Wait ~{journey.transferWaitMinutes || 44} min and board connecting Bus {legs[1].busNumber}.
                </p>
              </div>
            </div>

            <div
              className={`checkpoint-item ${activeSegmentIndex === 3 ? 'is-active' : activeSegmentIndex > 3 ? 'is-completed' : ''}`}
              onClick={() => onSelectSegment && onSelectSegment(3)}
            >
              <div className="checkpoint-marker-col">
                <div className="checkpoint-icon-node bus-node">
                  {activeSegmentIndex > 3 ? <CheckCircle2 size={16} /> : <Bus size={16} />}
                </div>
                <div className="checkpoint-trail-line" />
              </div>

              <div className="checkpoint-body-col">
                <div className="checkpoint-card-header">
                  <span className="checkpoint-step-tag">STEP 3 • CONNECTING BUS</span>
                  <span className="checkpoint-bus-badge">
                    CTU Line {legs[1].busNumber} {legs[1].fare ? `• Ticket ${legs[1].fare}` : ''}
                  </span>
                </div>

                <h3 className="checkpoint-headline">
                  Board at {legs[1].from} → {legs[1].to}
                </h3>

                <div className="checkpoint-timing-strip">
                  <div className="time-pill">
                    <Clock size={12} />
                    <span>Scheduled: {getSingleTime(journey.detailedSteps?.[2]?.time, false) || `${legs[1].estimatedTime} min`} → {cleanArrTime}</span>
                  </div>
                  <div className="time-pill distance-pill">
                    <span>{legs[1].distance} km • {legs[1].estimatedTime} min</span>
                  </div>
                </div>

                {legs[1].stops && legs[1].stops.length > 2 && (
                  <div className="stops-accordion-wrap">
                    <button
                      type="button"
                      className="stops-toggle-btn"
                      onClick={(e) => toggleLegStops('leg1', e)}
                    >
                      <span>{legs[1].stops.length - 2} Intermediate Stops</span>
                      {expandedLegStops['leg1'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {expandedLegStops['leg1'] && (
                      <div className="stops-expanded-list">
                        {legs[1].stops.map((stopName, sIdx) => (
                          <div key={sIdx} className={`stop-row ${sIdx === 0 ? 'first' : sIdx === legs[1].stops.length - 1 ? 'last' : ''}`}>
                            <span className="stop-index">{sIdx + 1}</span>
                            <span className="stop-row-name">{stopName}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <div
          className={`checkpoint-item final-step ${activeSegmentIndex >= (mapSegments.length > 0 ? mapSegments.length - 1 : 3) ? 'is-active' : ''}`}
          onClick={() => onSelectSegment && onSelectSegment(mapSegments.length > 0 ? mapSegments.length - 1 : (isDirect ? 2 : 4))}
        >
          <div className="checkpoint-marker-col">
            <div className="checkpoint-icon-node dest-node">
              <MapPin size={16} />
            </div>
          </div>

          <div className="checkpoint-body-col">
            <div className="checkpoint-card-header">
              <span className="checkpoint-step-tag">DESTINATION CHECKPOINT</span>
              <span className="arrival-badge">
                Arrive ~{cleanArrTime}
              </span>
            </div>

            <h3 className="checkpoint-headline">
              Arrive at {destinationName || journey.destinationStop?.name || journey.dropStop || 'Destination'}
            </h3>

            <p className="checkpoint-instructions">
              Alight and complete your journey. CTU Scheduled arrival: {cleanArrTime}.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

