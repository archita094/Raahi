
export const MOCK_LOCATIONS = [
  { id: 'loc-1', name: 'Sector 17 ISBT', detail: 'Central Bus Terminus, Chandigarh' },
  { id: 'loc-2', name: 'Sector 43 ISBT', detail: 'Inter State Bus Terminal, Chandigarh' },
  { id: 'loc-3', name: 'Panjab University (Sector 14)', detail: 'Main Campus Gate 1, Chandigarh' },
  { id: 'loc-4', name: 'Elante Mall', detail: 'Industrial Area Phase 1, Chandigarh' },
  { id: 'loc-5', name: 'Sukhna Lake', detail: 'Sector 6, Chandigarh' },
  { id: 'loc-6', name: 'Rock Garden', detail: 'Sector 1, Chandigarh' },
  { id: 'loc-7', name: 'Sector 22 Market', detail: 'Mobile Market & Shopping Hub, Chandigarh' },
  { id: 'loc-8', name: 'Chandigarh Railway Station', detail: 'Industrial Area Phase 1, Daria' },
  { id: 'loc-9', name: 'Phase 8 Bus Stand', detail: 'Industrial Area, Mohali' },
  { id: 'loc-10', name: 'IT Park Chandigarh', detail: 'Kishangarh, Chandigarh' },
  { id: 'loc-11', name: 'Sector 34 Bus Bay', detail: 'Educational & Commercial Hub, Chandigarh' },
  { id: 'loc-12', name: 'PGIMER Hospital', detail: 'Sector 12, Chandigarh' },
  { id: 'loc-13', name: 'Chandigarh University (CU)', detail: 'NH-05, Gharuan, Mohali' },
  { id: 'loc-14', name: 'Kharar Bus Stand', detail: 'CTU Transit Hub, Kharar' },
  { id: 'loc-15', name: 'Zirakpur', detail: 'Ambala-Chandigarh Highway Hub' },
  { id: 'loc-16', name: 'Dera Bassi', detail: 'CTU Outer Terminal, Dera Bassi' }
];

export const MOCK_JOURNEYS = [
  {
    id: 'rec-1',
    type: 'recommended',
    tag: 'RECOMMENDED',
    totalTime: '42 min',
    arrivalTime: 'Arrive by 8:32 PM',
    fare: '₹25',
    walkingTime: '9 min',
    transfersCount: '2 transfers',
    highlight: true,
    summarySegments: [
      { type: 'walk', label: 'Walk', duration: '5 min' },
      { type: 'bus', label: 'Bus 20', duration: '18 min', routeCode: '20' },
      { type: 'transfer', label: 'Transfer', duration: '4 min' },
      { type: 'bus', label: 'Bus 35', duration: '11 min', routeCode: '35' },
      { type: 'walk', label: 'Walk', duration: '4 min' }
    ],
    detailedSteps: [
      {
        stepIndex: 1,
        type: 'walk',
        title: 'Walk to Sector 17 Bus Stop',
        duration: '5 min',
        distance: '350m',
        instruction: 'Head south towards Jan Marg, turn right onto Bus Stand Road.'
      },
      {
        stepIndex: 2,
        type: 'bus',
        title: 'Take Bus 20',
        lineCode: '20',
        routeName: 'Sector 17 ISBT → ISBT-43',
        duration: '18 min',
        stopsCount: 7,
        instruction: 'Board CTU Bus 20 at Bay 4. Get off at ISBT-43 Interchange platform.'
      },
      {
        stepIndex: 3,
        type: 'transfer',
        title: 'Change at ISBT-43',
        duration: '4 min',
        instruction: 'Walk 120m across central concourse to Bay 12 for connecting Bus 35.'
      },
      {
        stepIndex: 4,
        type: 'bus',
        title: 'Take Bus 35',
        lineCode: '35',
        routeName: 'ISBT-43 → Sector 63 Express',
        duration: '11 min',
        stopsCount: 4,
        instruction: 'Board Bus 35. Alight at Sector 63 Junction Stop.'
      },
      {
        stepIndex: 5,
        type: 'walk',
        title: 'Walk to destination',
        duration: '4 min',
        distance: '280m',
        instruction: 'Walk east along Sector 63 main boulevard to your final arrival point.'
      }
    ]
  },
  {
    id: 'fast-1',
    type: 'fastest',
    tag: 'FASTEST',
    totalTime: '34 min',
    arrivalTime: 'Arrive by 8:24 PM',
    fare: '₹35',
    walkingTime: '4 min',
    transfersCount: 'Direct • 0 transfers',
    highlight: false,
    summarySegments: [
      { type: 'walk', label: 'Walk', duration: '2 min' },
      { type: 'bus', label: 'Bus 210 Express', duration: '30 min', routeCode: '210' },
      { type: 'walk', label: 'Walk', duration: '2 min' }
    ],
    detailedSteps: [
      {
        stepIndex: 1,
        type: 'walk',
        title: 'Walk to Main Express Stand',
        duration: '2 min',
        distance: '150m',
        instruction: 'Walk north to Bay 1 Direct Express Terminal.'
      },
      {
        stepIndex: 2,
        type: 'bus',
        title: 'Take Express Bus 210',
        lineCode: '210',
        routeName: 'Direct AC Corridor Line',
        duration: '30 min',
        stopsCount: 3,
        instruction: 'Board Non-stop AC Express 210. Alight directly at destination hub.'
      },
      {
        stepIndex: 3,
        type: 'walk',
        title: 'Walk to destination',
        duration: '2 min',
        distance: '120m',
        instruction: 'Cross pedestrian crossing to enter main plaza entrance.'
      }
    ]
  },
  {
    id: 'cheap-1',
    type: 'cheapest',
    tag: 'CHEAPEST',
    totalTime: '51 min',
    arrivalTime: 'Arrive by 8:41 PM',
    fare: '₹15',
    walkingTime: '14 min',
    transfersCount: '1 transfer',
    highlight: false,
    summarySegments: [
      { type: 'walk', label: 'Walk', duration: '8 min' },
      { type: 'bus', label: 'Bus 7', duration: '28 min', routeCode: '7' },
      { type: 'transfer', label: 'Transfer', duration: '3 min' },
      { type: 'bus', label: 'Bus 12', duration: '6 min', routeCode: '12' },
      { type: 'walk', label: 'Walk', duration: '6 min' }
    ],
    detailedSteps: [
      {
        stepIndex: 1,
        type: 'walk',
        title: 'Walk to Sector 17/18 Junction',
        duration: '8 min',
        distance: '550m',
        instruction: 'Walk south-east along Madhya Marg to Sector 17/18 feeder shelter.'
      },
      {
        stepIndex: 2,
        type: 'bus',
        title: 'Take Local Bus 7',
        lineCode: '7',
        routeName: 'Feeder Line 7',
        duration: '28 min',
        stopsCount: 12,
        instruction: 'Board CTU Ordinary Bus 7. Alight at Sector 34 Bus Bay.'
      },
      {
        stepIndex: 3,
        type: 'transfer',
        title: 'Change at Sector 34 Bus Bay',
        duration: '3 min',
        instruction: 'Cross to adjacent shelter platform for Bus 12.'
      },
      {
        stepIndex: 4,
        type: 'bus',
        title: 'Take Bus 12',
        lineCode: '12',
        routeName: 'Sector 34 → Destination Shuttle',
        duration: '6 min',
        stopsCount: 2,
        instruction: 'Board Bus 12 for short 2-stop shuttle segment.'
      },
      {
        stepIndex: 5,
        type: 'walk',
        title: 'Walk to destination',
        duration: '6 min',
        distance: '420m',
        instruction: 'Walk straight along sector inner road to destination destination.'
      }
    ]
  }
];

