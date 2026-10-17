
const fs = require('fs');
const path = require('path');
const https = require('https');

const TRICITY_LOCATION_DB = {
  'sector 17 isbt': { lng: 76.7865, lat: 30.7398, sector: '17', name: 'Sector 17 ISBT, Chandigarh' },
  'isbt 17': { lng: 76.7865, lat: 30.7398, sector: '17', name: 'Sector 17 ISBT, Chandigarh' },
  'isbt-17': { lng: 76.7865, lat: 30.7398, sector: '17', name: 'Sector 17 ISBT, Chandigarh' },
  'sector 43 isbt': { lng: 76.7447, lat: 30.7163, sector: '43', name: 'Sector 43 ISBT, Chandigarh' },
  'isbt 43': { lng: 76.7447, lat: 30.7163, sector: '43', name: 'Sector 43 ISBT, Chandigarh' },
  'isbt-43': { lng: 76.7447, lat: 30.7163, sector: '43', name: 'Sector 43 ISBT, Chandigarh' },
  'kharar': { lng: 76.6430, lat: 30.7491, sector: 'Kharar', name: 'Kharar Bus Stand' },
  'kharar bus stand': { lng: 76.6430, lat: 30.7491, sector: 'Kharar', name: 'Kharar Bus Stand' },
  'kila chungi': { lng: 76.6486, lat: 30.7472, sector: 'Kharar', name: 'Kila Chungi, Kharar' },
  'bansawali chungi': { lng: 76.6544, lat: 30.7444, sector: 'Kharar', name: 'Bansawali Chungi, Kharar' },
  'mundi kharar': { lng: 76.6624, lat: 30.7431, sector: 'Mundi Kharar', name: 'Mundi Kharar / Gillco' },
  'mundi kharar/gillco': { lng: 76.6624, lat: 30.7431, sector: 'Mundi Kharar', name: 'Mundi Kharar / Gillco' },
  'desumajra': { lng: 76.6711, lat: 30.7415, sector: 'Desumajra', name: 'Desumajra / Nijjar Chowk' },
  'desumajra/nijjar chowk': { lng: 76.6711, lat: 30.7415, sector: 'Desumajra', name: 'Desumajra / Nijjar Chowk' },
  'kfc': { lng: 76.6800, lat: 30.7380, sector: 'Desumajra', name: 'KFC Kharar Highway' },
  'kfc kharar': { lng: 76.6800, lat: 30.7380, sector: 'Desumajra', name: 'KFC Kharar Highway' },
  'daun': { lng: 76.6890, lat: 30.7350, sector: 'Daun', name: 'Daun Bus Stop' },
  'daun (up)': { lng: 76.6890, lat: 30.7350, sector: 'Daun', name: 'Daun Bus Stop (Up)' },
  'daun (down)': { lng: 76.6890, lat: 30.7350, sector: 'Daun', name: 'Daun Bus Stop (Down)' },
  'balongi': { lng: 76.7021, lat: 30.7314, sector: 'Balongi', name: 'Balongi Bus Stop' },
  'isbt mohali': { lng: 76.7120, lat: 30.7230, sector: 'Phase 6 Mohali', name: 'ISBT Mohali (Phase 6)' },
  'phase 6 - 35': { lng: 76.7150, lat: 30.7225, sector: 'Phase 6 Mohali', name: 'Phase 6 Bus Stop, Mohali' },
  'phase 6': { lng: 76.7150, lat: 30.7225, sector: 'Phase 6 Mohali', name: 'Phase 6 Bus Stop, Mohali' },
  'sector 55 phase 1 (35)': { lng: 76.7260, lat: 30.7170, sector: 'Phase 1 Mohali', name: 'Sector 55 / Phase 1, Mohali' },
  'phase 1': { lng: 76.7260, lat: 30.7170, sector: 'Phase 1 Mohali', name: 'Phase 1, Mohali' },
  'phase-2 bassi theatre': { lng: 76.7320, lat: 30.7175, sector: 'Phase 2 Mohali', name: 'Phase 2 Bassi Theatre, Mohali' },
  'furniture chowk (ut border)': { lng: 76.7410, lat: 30.7180, sector: 'UT Border', name: 'Furniture Chowk (UT Border)' },
  'furniture chowk': { lng: 76.7410, lat: 30.7180, sector: 'UT Border', name: 'Furniture Chowk (UT Border)' },
  'sector 42/53': { lng: 76.7440, lat: 30.7185, sector: '42/53', name: 'Sector 42/53 Dividing Road' },
  'sector 53/42': { lng: 76.7440, lat: 30.7185, sector: '42/53', name: 'Sector 53/42 Dividing Road' },
  'sector 42/43': { lng: 76.7530, lat: 30.7240, sector: '42/43', name: 'Sector 42/43 Dividing Road' },
  'attawa chowk towards kissan bhawan': { lng: 76.7590, lat: 30.7270, sector: '35/36/42/43', name: 'Attawa Chowk towards Kissan Bhawan' },
  'attawa chowk towards 43': { lng: 76.7590, lat: 30.7270, sector: '35/36/42/43', name: 'Attawa Chowk towards 43' },
  'sector 36/35 flower market': { lng: 76.7640, lat: 30.7290, sector: '35', name: 'Sector 36/35 Flower Market' },
  'sector 35/36 flower market': { lng: 76.7640, lat: 30.7290, sector: '35', name: 'Sector 35/36 Flower Market' },
  'sector 36/35 kissan bhawan': { lng: 76.7680, lat: 30.7310, sector: '35', name: 'Sector 36/35 Kissan Bhawan' },
  'sector 35/36 kissan bhawan': { lng: 76.7680, lat: 30.7310, sector: '35', name: 'Sector 36/35 Kissan Bhawan' },
  'sector 22/35': { lng: 76.7730, lat: 30.7330, sector: '22/35', name: 'Sector 22/35 (Aroma Chowk)' },
  'sector 35/22': { lng: 76.7730, lat: 30.7330, sector: '22/35', name: 'Sector 35/22 (Aroma Chowk)' },
  'sector 21/22 aroma': { lng: 76.7730, lat: 30.7330, sector: '22/21', name: 'Sector 21/22 Aroma' },
  'sector 23/22': { lng: 76.7790, lat: 30.7360, sector: '22/23', name: 'Sector 23/22' },
  'chandigarh university': { lng: 76.5750, lat: 30.7686, sector: 'Gharuan', name: 'Chandigarh University (CU), Gharuan' },
  'chandigarh university mohali': { lng: 76.5750, lat: 30.7686, sector: 'Gharuan', name: 'Chandigarh University (CU), Gharuan' },
  'cu': { lng: 76.5750, lat: 30.7686, sector: 'Gharuan', name: 'Chandigarh University (CU), Gharuan' },
  'cu gharuan': { lng: 76.5750, lat: 30.7686, sector: 'Gharuan', name: 'Chandigarh University (CU), Gharuan' },
  'gharuan': { lng: 76.5680, lat: 30.7650, sector: 'Gharuan', name: 'Gharuan' },
  'cgc landran': { lng: 76.6660, lat: 30.6880, sector: 'Landran', name: 'CGC Landran' },
  'cgc jhanjeri': { lng: 76.6450, lat: 30.6550, sector: 'Jhanjeri', name: 'CGC Jhanjeri' },
  'balongi': { lng: 76.7020, lat: 30.7260, sector: 'Balongi', name: 'Balongi Bus Stop' },
  'isbt mohali phase 8': { lng: 76.7210, lat: 30.7025, sector: 'Phase 8 Mohali', name: 'ISBT Mohali (Phase 8)' },
  'ctu workshop': { lng: 76.8185, lat: 30.7115, sector: 'Ind Area 1', name: 'CTU Workshop / Depot 1, Industrial Area Phase 1' },
  'ctu workshop / depot 1': { lng: 76.8185, lat: 30.7115, sector: 'Ind Area 1', name: 'CTU Workshop / Depot 1, Industrial Area Phase 1' },
  'sohana': { lng: 76.7118, lat: 30.6865, sector: 'Sohana', name: 'Sohana' },
  'landran': { lng: 76.6660, lat: 30.6880, sector: 'Landran', name: 'Landran' },
  'dera bassi': { lng: 76.8436, lat: 30.5843, sector: 'Dera Bassi', name: 'Dera Bassi Bus Stand' },
  'zirakpur': { lng: 76.8180, lat: 30.6425, sector: 'Zirakpur', name: 'Zirakpur' },
  'railway crossing towards railway station': { lng: 76.8205, lat: 30.7075, sector: 'Railway Crossing', name: 'Railway Crossing towards Railway Station' },
  'railway crossing': { lng: 76.8205, lat: 30.7075, sector: 'Railway Crossing', name: 'Railway Crossing, Chandigarh' },
  'panjab university': { lng: 76.7686, lat: 30.7589, sector: '14', name: 'Panjab University (Sector 14)' },
  'pgi': { lng: 76.7745, lat: 30.7634, sector: '12', name: 'PGIMER Hospital, Sector 12' },
  'pgimer': { lng: 76.7745, lat: 30.7634, sector: '12', name: 'PGIMER Hospital, Sector 12' },
  'elante mall': { lng: 76.8028, lat: 30.7056, sector: 'Ind Area 1', name: 'Elante Mall, Industrial Area Phase 1' },
  'chandigarh railway station': { lng: 76.8207, lat: 30.7081, sector: 'Railway Station', name: 'Chandigarh Railway Station' },
  'railway station': { lng: 76.8207, lat: 30.7081, sector: 'Railway Station', name: 'Chandigarh Railway Station' },
  'r/stn': { lng: 76.8207, lat: 30.7081, sector: 'Railway Station', name: 'Chandigarh Railway Station' },
  'sukhna lake': { lng: 76.8125, lat: 30.7422, sector: '6', name: 'Sukhna Lake, Sector 6' },
  'rock garden': { lng: 76.8042, lat: 30.7525, sector: '1', name: 'Rock Garden, Sector 1' },
  'manimajra': { lng: 76.8456, lat: 30.7258, sector: 'Manimajra', name: 'Manimajra Bus Stand' },
  'mani majra': { lng: 76.8456, lat: 30.7258, sector: 'Manimajra', name: 'Manimajra Bus Stand' },
  'm.majra': { lng: 76.8456, lat: 30.7258, sector: 'Manimajra', name: 'Manimajra Bus Stand' },
  'mansa devi': { lng: 76.8489, lat: 30.7441, sector: 'Mansa Devi', name: 'Mansa Devi Complex, Panchkula' },
  'mata mansa devi': { lng: 76.8489, lat: 30.7441, sector: 'Mansa Devi', name: 'Mata Mansa Devi Shrine' },
  'bhankarpur (up)': { lng: 76.8320, lat: 30.6050, sector: 'Dera Bassi', name: 'Bhankarpur (Up)' },
  'bhankarpur (down)': { lng: 76.8320, lat: 30.6050, sector: 'Dera Bassi', name: 'Bhankarpur (Down)' },
  'hallo majra (down)': { lng: 76.7920, lat: 30.7020, sector: 'Hallo Majra', name: 'Hallo Majra (Down)' },
  'jhurheri': { lng: 76.7910, lat: 30.6650, sector: 'Airport', name: 'Jhurheri' },
  'new airport chowk- mohali (up)': { lng: 76.7810, lat: 30.6680, sector: 'Airport', name: 'New Airport Chowk' },
  'sector 80/67': { lng: 76.7210, lat: 30.6860, sector: '80/67', name: 'Sector 80/67 Mohali' },
  'sector 79/68': { lng: 76.7120, lat: 30.6860, sector: '79/68', name: 'Sector 79/68 Mohali' },
  'sector 66a/82': { lng: 76.7325, lat: 30.6678, sector: '66A/82', name: 'Sector 66A/82 Mohali' },
  'sector 82/66 aero city': { lng: 76.7685, lat: 30.6538, sector: 'Aero City', name: 'Sector 82/66 Aero City' },
  'kaimbwala 1': { lng: 76.8150, lat: 30.7650, sector: 'Kaimbwala', name: 'Kaimbwala' },
  'indira colony up': { lng: 76.8400, lat: 30.7280, sector: 'Manimajra', name: 'Indira Colony Up' },
  'indira colony down': { lng: 76.8400, lat: 30.7280, sector: 'Manimajra', name: 'Indira Colony Down' },
  'modern complex': { lng: 76.8420, lat: 30.7260, sector: 'Manimajra', name: 'Modern Complex' },
  'railway crossing towards 28 grain market': { lng: 76.8150, lat: 30.7180, sector: '28', name: 'Railway Crossing Towards 28 Grain Market' },
  'daddu majra colony': { lng: 76.7380, lat: 30.7510, sector: '38W', name: 'Daddu Majra Colony' },
  'bella vista': { lng: 76.8450, lat: 30.7020, sector: 'Panchkula', name: 'Bella Vista' },
  'industrial area phase 2/phase 1': { lng: 76.7950, lat: 30.7080, sector: 'Ind Area', name: 'Industrial Area Phase 2/Phase 1' },
  'dolphin chowk': { lng: 76.8350, lat: 30.7280, sector: 'IT Park', name: 'Dolphin Chowk, IT Park' },
  'kishangarh': { lng: 76.8250, lat: 30.7320, sector: 'Kishangarh', name: 'Kishangarh, Chandigarh' },
  'kishangarh up': { lng: 76.8250, lat: 30.7320, sector: 'Kishangarh', name: 'Kishangarh Up, Chandigarh' },
  'kishangarh down': { lng: 76.8250, lat: 30.7320, sector: 'Kishangarh', name: 'Kishangarh Down, Chandigarh' },
  'golf range': { lng: 76.8100, lat: 30.7420, sector: '6', name: 'Chandigarh Golf Range, Sector 6' },
  'lake chowk': { lng: 76.8080, lat: 30.7400, sector: '5/6', name: 'Lake Chowk, Sector 5/6' },
  'sector 26 police line': { lng: 76.8160, lat: 30.7260, sector: '26', name: 'Police Lines, Sector 26' },
  'back side police line sector 26': { lng: 76.8160, lat: 30.7260, sector: '26', name: 'Police Lines, Sector 26' },
  'kissan bhawan': { lng: 76.7680, lat: 30.7310, sector: '35', name: 'Kissan Bhawan, Sector 35' },
  'kishan bhavan': { lng: 76.7680, lat: 30.7310, sector: '35', name: 'Kissan Bhawan, Sector 35' },
  'sector 34a/35b jw marriot': { lng: 76.7710, lat: 30.7230, sector: '35', name: 'JW Marriott, Sector 35' },
  'sector 34/35': { lng: 76.7710, lat: 30.7210, sector: '34/35', name: 'Sector 34/35 Dividing Road' },
  'sector 34d/35c': { lng: 76.7670, lat: 30.7190, sector: '35', name: 'Sector 34D/35C Chowk' },
  'sector 44/43': { lng: 76.7500, lat: 30.7154, sector: '43/44', name: 'Sector 43/44 Dividing Road' },
  'sector 43c': { lng: 76.7451, lat: 30.7208, sector: '43', name: 'Sector 43C, Chandigarh' },
  'sector 17/18': { lng: 76.7898, lat: 30.7374, sector: '17/18', name: 'Sector 17/18 Dividing Road' },
  'sector 17/18 (govt. press)': { lng: 76.7898, lat: 30.7374, sector: '17/18', name: 'Govt. Press, Sector 17/18' },
  'sector 18/17': { lng: 76.7898, lat: 30.7374, sector: '17/18', name: 'Sector 18/17 Bus Stop' },
  'sector 8/9': { lng: 76.7980, lat: 30.7430, sector: '8/9', name: 'Sector 8/9 Dividing Road' },
  'sector 8/5': { lng: 76.7885, lat: 30.7455, sector: '8/5', name: 'Sector 8/5 Dividing Road' },
  'ram darbar': { lng: 76.7901, lat: 30.6912, sector: 'Ram Darbar', name: 'Ram Darbar, Chandigarh' },
  'maloya': { lng: 76.7214, lat: 30.7385, sector: 'Maloya', name: 'New Maloya Colony' },
  'new maloya colony': { lng: 76.7214, lat: 30.7385, sector: 'Maloya', name: 'New Maloya Colony' },
  'dhanas': { lng: 76.7412, lat: 30.7621, sector: 'Dhanas', name: 'Dhanas Village' },
  'khuda lahora': { lng: 76.7601, lat: 30.7712, sector: 'Khuda Lahora', name: 'Khuda Lahora' },
  'khuda alisher': { lng: 76.7890, lat: 30.7780, sector: 'Khuda Alisher', name: 'Khuda Alisher' },
  'naya gaon': { lng: 76.7940, lat: 30.7810, sector: 'Naya Gaon', name: 'Naya Gaon' },
  'it park': { lng: 76.8312, lat: 30.7245, sector: 'IT Park', name: 'IT Park, Chandigarh' },
  'tribune chowk': { lng: 76.7852, lat: 30.7088, sector: '29/31', name: 'Tribune Chowk' },
  'housing board': { lng: 76.8398, lat: 30.7225, sector: 'Housing Board', name: 'Housing Board Chowk' },
  'h/b': { lng: 76.8398, lat: 30.7225, sector: 'Housing Board', name: 'Housing Board Chowk' },
  'kala gram': { lng: 76.8354, lat: 30.7231, sector: 'Manimajra', name: 'Kala Gram' },
  'kalagram': { lng: 76.8354, lat: 30.7231, sector: 'Manimajra', name: 'Kala Gram' },
  'phase 8 bus stand': { lng: 76.7210, lat: 30.7025, sector: 'Phase 8 Mohali', name: 'Phase 8 Bus Stand, Mohali' },
  'phase 11': { lng: 76.7350, lat: 30.6800, sector: 'Phase 11 Mohali', name: 'Phase 11, Mohali' },
  'sector 22 market': { lng: 76.7712, lat: 30.7350, sector: '22', name: 'Sector 22 Market, Chandigarh' },
  'aroma chowk': { lng: 76.7750, lat: 30.7330, sector: '22/21', name: 'Aroma Chowk, Sector 22' },
  'sector 34 bus bay': { lng: 76.7690, lat: 30.7220, sector: '34', name: 'Sector 34 Bus Bay, Chandigarh' },
  'raipur kalan': { lng: 76.8288, lat: 30.6875, sector: 'Raipur Kalan', name: 'Raipur Kalan' },
  'nada sahib': { lng: 76.8850, lat: 30.6950, sector: 'Panchkula', name: 'Nada Sahib Gurudwara' },
  'pec': { lng: 76.7830, lat: 30.7660, sector: '12', name: 'Punjab Engineering College (PEC)' },
  'punjab engineering college': { lng: 76.7830, lat: 30.7660, sector: '12', name: 'Punjab Engineering College (PEC)' },
  'high court': { lng: 76.8060, lat: 30.7590, sector: '1', name: 'Punjab and Haryana High Court' },
  'new airport': { lng: 76.7880, lat: 30.6730, sector: 'Airport', name: 'Shaheed Bhagat Singh International Airport' },
  'mani majra town': { lng: 76.8480, lat: 30.7210, sector: 'Manimajra', name: 'Mani Majra Town' },
  'housing board chowk towards isbt 43': { lng: 76.8398, lat: 30.7225, sector: 'Housing Board', name: 'Housing Board Chowk Towards ISBT 43' },
  'housing board chowk towards panchkula': { lng: 76.8398, lat: 30.7225, sector: 'Housing Board', name: 'Housing Board Chowk Towards Panchkula' },
  'kalagram up': { lng: 76.8354, lat: 30.7231, sector: 'Manimajra', name: 'Kalagram Up' },
  'kalagram down': { lng: 76.8354, lat: 30.7231, sector: 'Manimajra', name: 'Kalagram Down' },
  'ut secretariat towards high court': { lng: 76.7869, lat: 30.7480, sector: '9', name: 'UT Secretariat Towards High Court' },
  'ut secretariat towards isbt 43': { lng: 76.7869, lat: 30.7480, sector: '9', name: 'UT Secretariat Towards ISBT 43' },
  'mla flats (up)': { lng: 76.7950, lat: 30.7550, sector: '3/4', name: 'MLA Flats (Up)' },
  'punjab civil secretariat': { lng: 76.8000, lat: 30.7580, sector: '1', name: 'Punjab Civil Secretariat, Sector 1' },
  'sec-39/water works--13 a towards isbt 43': { lng: 76.7320, lat: 30.7480, sector: '39', name: 'Sector 39 Water Works' },
  'sec-39/water works--13 c': { lng: 76.7320, lat: 30.7480, sector: '39', name: 'Sector 39 Water Works' },
  'lakhnaur (dc office mohali)': { lng: 76.7020, lat: 30.6870, sector: '76', name: 'Lakhnaur (DC Office Mohali)' },
  'lakhnaur': { lng: 76.7020, lat: 30.6870, sector: '76', name: 'Lakhnaur' },
  'landran (down)': { lng: 76.6660, lat: 30.6880, sector: 'Landran', name: 'Landran' },
  'landran (up)': { lng: 76.6660, lat: 30.6880, sector: 'Landran', name: 'Landran' },
  'chappar chiri': { lng: 76.6800, lat: 30.7020, sector: 'Chappar Chiri', name: 'Chappar Chiri' },
  'santemajra': { lng: 76.6500, lat: 30.7200, sector: 'Santemajra', name: 'Santemajra' },
  'yps chowk (up)': { lng: 76.7260, lat: 30.7110, sector: 'Phase 7/8', name: 'YPS Chowk (Up)' },
  'yps chowk (down)': { lng: 76.7260, lat: 30.7110, sector: 'Phase 7/8', name: 'YPS Chowk (Down)' },
  'sector 70/69': { lng: 76.7080, lat: 30.6970, sector: '70/69', name: 'Sector 70/69' },
  'sector 69/70': { lng: 76.7080, lat: 30.6970, sector: '69/70', name: 'Sector 69/70' },
  'new opd (up)': { lng: 76.7750, lat: 30.7650, sector: '12', name: 'New OPD (Up), PGI' },
  'new opd (down)': { lng: 76.7750, lat: 30.7650, sector: '12', name: 'New OPD (Down), PGI' },
  'g.m.c.h. 32': { lng: 76.7790, lat: 30.7090, sector: '32', name: 'GMCH Sector 32' },
  'gmch 32': { lng: 76.7790, lat: 30.7090, sector: '32', name: 'GMCH Sector 32' },
  'kaali baari mandir towards 3brd': { lng: 76.7867, lat: 30.6970, sector: '47', name: 'Kaali Baari Mandir' },
  'kaali baari mandir towards 47': { lng: 76.7867, lat: 30.6970, sector: '47', name: 'Kaali Baari Mandir' },
  'industrial area phase 2 in front tata motors': { lng: 76.7850, lat: 30.7020, sector: 'Ind Area 2', name: 'Industrial Area Phase 2 (Tata Motors)' },
  'industrial area phase 2 near prtc': { lng: 76.7820, lat: 30.7040, sector: 'Ind Area 2', name: 'Industrial Area Phase 2 (PRTC)' },
  'industrial area phase 2 near passport office': { lng: 76.7820, lat: 30.7040, sector: 'Ind Area 2', name: 'Industrial Area Phase 2 (Passport Office)' },
  'industrial area phase 2': { lng: 76.7830, lat: 30.7030, sector: 'Ind Area 2', name: 'Industrial Area Phase 2' },
  'industrial area phase-1': { lng: 76.8080, lat: 30.7100, sector: 'Ind Area 1', name: 'Industrial Area Phase 1' },
  'colony no. 4': { lng: 76.8120, lat: 30.7100, sector: 'Ind Area 1', name: 'Colony No. 4, Industrial Area Phase 1' },
  'poultry farm': { lng: 76.8040, lat: 30.7050, sector: 'Ind Area 1', name: 'Poultry Farm Chowk' },
  'dadu majra village': { lng: 76.7350, lat: 30.7500, sector: '38W', name: 'Dadu Majra Village' },
  'transport chowk (up)': { lng: 76.8180, lat: 30.7220, sector: '26', name: 'Transport Chowk (Up)' },
  'transport chowk (down)': { lng: 76.8180, lat: 30.7220, sector: '26', name: 'Transport Chowk (Down)' },
  'majri chowk': { lng: 76.8520, lat: 30.6980, sector: 'Panchkula', name: 'Majri Chowk, Panchkula' },
  'saketri': { lng: 76.8450, lat: 30.7500, sector: 'Panchkula', name: 'Saketri' }
};

const CACHE_FILE_PATH = path.join(__dirname, '../data/geocoding_cache.json');
let inMemoryCache = null;

function loadGeocodeCache() {
  if (inMemoryCache) return inMemoryCache;
  inMemoryCache = new Map();
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const data = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8'));
      for (const [k, v] of Object.entries(data)) {
        inMemoryCache.set(k.toLowerCase().trim(), v);
      }
    }
  } catch (err) {
    console.warn('[Geocoding] Could not load disk cache:', err.message);
  }
  return inMemoryCache;
}

function saveGeocodeCache() {
  if (!inMemoryCache) return;
  try {
    const obj = {};
    for (const [k, v] of inMemoryCache.entries()) {
      obj[k] = v;
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), 'utf8');
  } catch (err) {
    console.warn('[Geocoding] Could not save disk cache:', err.message);
  }
}

let lastNominatimCallTime = 0;
async function throttleNominatim() {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimCallTime;
  if (timeSinceLast < 1100) {
    const delay = 1100 - timeSinceLast;
    await new Promise(r => setTimeout(r, delay));
  }
  lastNominatimCallTime = Date.now();
}

function fetchFromNominatim(query) {
  return new Promise(async (resolve) => {
    await throttleNominatim();

    const sanitized = encodeURIComponent(query);

    const url = `https://nominatim.openstreetmap.org/search?q=${sanitized}&format=json&limit=1&viewbox=76.50,30.95,77.05,30.55`;

    const req = https.get(url, {
      headers: {
        'User-Agent': 'RaahiTransitPlanner/1.0 (transit-planner@raahi.app)'
      },
      timeout: 5000
    }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const item = list[0];
            resolve({
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              name: item.display_name,
              source: 'nominatim'
            });
            return;
          }
        } catch (e) {

        }
        resolve(null);
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

const SECTOR_COORDINATES = {
  1: { lat: 30.7580, lng: 76.8040, name: 'Sector 1 (Capitol Complex)' },
  2: { lat: 30.7580, lng: 76.7970, name: 'Sector 2' },
  3: { lat: 30.7560, lng: 76.7900, name: 'Sector 3' },
  4: { lat: 30.7540, lng: 76.7820, name: 'Sector 4' },
  5: { lat: 30.7500, lng: 76.7750, name: 'Sector 5' },
  6: { lat: 30.7480, lng: 76.8120, name: 'Sector 6 (Sukhna Lake)' },
  7: { lat: 30.7380, lng: 76.8110, name: 'Sector 7' },
  8: { lat: 30.7410, lng: 76.8020, name: 'Sector 8' },
  9: { lat: 30.7450, lng: 76.7940, name: 'Sector 9' },
  10: { lat: 30.7500, lng: 76.7860, name: 'Sector 10 (Museum & Arts)' },
  11: { lat: 30.7560, lng: 76.7780, name: 'Sector 11' },
  12: { lat: 30.7630, lng: 76.7740, name: 'Sector 12 (PGIMER Hospital)' },
  14: { lat: 30.7590, lng: 76.7680, name: 'Sector 14 (Panjab University)' },
  15: { lat: 30.7520, lng: 76.7740, name: 'Sector 15' },
  16: { lat: 30.7450, lng: 76.7820, name: 'Sector 16 (Cricket Stadium)' },
  17: { lat: 30.7398, lng: 76.7865, name: 'Sector 17 (ISBT & City Centre)' },
  18: { lat: 30.7350, lng: 76.7930, name: 'Sector 18' },
  19: { lat: 30.7300, lng: 76.8010, name: 'Sector 19' },
  20: { lat: 30.7240, lng: 76.7950, name: 'Sector 20' },
  21: { lat: 30.7280, lng: 76.7850, name: 'Sector 21' },
  22: { lat: 30.7330, lng: 76.7770, name: 'Sector 22 (Aroma Chowk / Market)' },
  23: { lat: 30.7390, lng: 76.7690, name: 'Sector 23' },
  24: { lat: 30.7460, lng: 76.7620, name: 'Sector 24' },
  25: { lat: 30.7520, lng: 76.7550, name: 'Sector 25' },
  26: { lat: 30.7260, lng: 76.8160, name: 'Sector 26 (Grain Market / Police Lines)' },
  27: { lat: 30.7200, lng: 76.8080, name: 'Sector 27' },
  28: { lat: 30.7140, lng: 76.8150, name: 'Sector 28' },
  29: { lat: 30.7060, lng: 76.8060, name: 'Sector 29' },
  30: { lat: 30.7120, lng: 76.7980, name: 'Sector 30' },
  31: { lat: 30.7000, lng: 76.7990, name: 'Sector 31' },
  32: { lat: 30.7060, lng: 76.7910, name: 'Sector 32 (GMCH Hospital)' },
  33: { lat: 30.7120, lng: 76.7830, name: 'Sector 33' },
  34: { lat: 30.7180, lng: 76.7750, name: 'Sector 34 (Commercial Hub)' },
  35: { lat: 30.7240, lng: 76.7670, name: 'Sector 35 (JW Marriott / Market)' },
  36: { lat: 30.7300, lng: 76.7600, name: 'Sector 36' },
  37: { lat: 30.7360, lng: 76.7520, name: 'Sector 37' },
  38: { lat: 30.7420, lng: 76.7450, name: 'Sector 38' },
  39: { lat: 30.7400, lng: 76.7380, name: 'Sector 39' },
  40: { lat: 30.7340, lng: 76.7450, name: 'Sector 40' },
  41: { lat: 30.7280, lng: 76.7520, name: 'Sector 41' },
  42: { lat: 30.7220, lng: 76.7590, name: 'Sector 42' },
  43: { lat: 30.7208, lng: 76.7451, name: 'Sector 43 (ISBT 43)' },
  44: { lat: 30.7100, lng: 76.7550, name: 'Sector 44' },
  45: { lat: 30.7040, lng: 76.7620, name: 'Sector 45' },
  46: { lat: 30.6980, lng: 76.7690, name: 'Sector 46' },
  47: { lat: 30.6920, lng: 76.7760, name: 'Sector 47' },
  48: { lat: 30.6860, lng: 76.7680, name: 'Sector 48' },
  49: { lat: 30.6920, lng: 76.7610, name: 'Sector 49' },
  50: { lat: 30.6980, lng: 76.7540, name: 'Sector 50' },
  51: { lat: 30.7040, lng: 76.7470, name: 'Sector 51' },
  52: { lat: 30.7100, lng: 76.7400, name: 'Sector 52' },
  53: { lat: 30.7160, lng: 76.7330, name: 'Sector 53' },
  54: { lat: 30.7220, lng: 76.7260, name: 'Sector 54' },
  55: { lat: 30.7260, lng: 76.7170, name: 'Sector 55 (Phase 1 Mohali)' },
  56: { lat: 30.7320, lng: 76.7200, name: 'Sector 56' },
  57: { lat: 30.7180, lng: 76.7120, name: 'Sector 57' },
  58: { lat: 30.7120, lng: 76.7050, name: 'Sector 58' },
  59: { lat: 30.7060, lng: 76.6980, name: 'Sector 59' },
  60: { lat: 30.7000, lng: 76.7150, name: 'Sector 60 (Phase 3B2 Mohali)' },
  61: { lat: 30.7100, lng: 76.7280, name: 'Sector 61' },
  62: { lat: 30.7040, lng: 76.7210, name: 'Sector 62 (Phase 7/8 Mohali)' },
  63: { lat: 30.6980, lng: 76.7350, name: 'Sector 63' },
  64: { lat: 30.6920, lng: 76.7280, name: 'Sector 64' },
  65: { lat: 30.6860, lng: 76.7210, name: 'Sector 65' },
  66: { lat: 30.6720, lng: 76.7350, name: 'Sector 66' },
  67: { lat: 30.6660, lng: 76.7280, name: 'Sector 67' },
  68: { lat: 30.6780, lng: 76.7210, name: 'Sector 68' },
  69: { lat: 30.6900, lng: 76.7140, name: 'Sector 69' },
  70: { lat: 30.6960, lng: 76.7070, name: 'Sector 70' },
  71: { lat: 30.7020, lng: 76.7000, name: 'Sector 71' }
};

function getSectorCoordinates(sectorNum) {
  const sec = parseInt(sectorNum, 10);
  if (isNaN(sec)) return null;

  if (SECTOR_COORDINATES[sec]) {
    const s = SECTOR_COORDINATES[sec];
    return {
      lng: s.lng,
      lat: s.lat,
      sector: String(sec),
      name: s.name || `Sector ${sec}, Chandigarh`
    };
  }

  return {
    lng: parseFloat((76.7200 - ((sec - 60) * 0.003)).toFixed(4)),
    lat: parseFloat((30.7000 - ((sec - 60) * 0.005)).toFixed(4)),
    sector: String(sec),
    name: `Sector ${sec}, Chandigarh Tricity`
  };
}

async function geocode(placeName) {
  if (!placeName || typeof placeName !== 'string') {
    throw new Error('Invalid place name provided for geocoding.');
  }

  const clean = placeName.trim().toLowerCase();
  const cache = loadGeocodeCache();

  if (TRICITY_LOCATION_DB[clean]) {
    const item = TRICITY_LOCATION_DB[clean];
    const res = {
      name: item.name,
      sector: item.sector,
      address: item.name,
      longitude: item.lng,
      latitude: item.lat,
      location: {
        type: 'Point',
        coordinates: [item.lng, item.lat]
      }
    };
    cache.set(clean, { lat: item.lat, lng: item.lng, name: item.name, sector: item.sector });
    saveGeocodeCache();
    return res;
  }

  if (cache.has(clean)) {
    const hit = cache.get(clean);
    return {
      name: hit.name || placeName,
      sector: hit.sector || null,
      address: hit.address || hit.name || placeName,
      longitude: hit.lng,
      latitude: hit.lat,
      location: {
        type: 'Point',
        coordinates: [hit.lng, hit.lat]
      }
    };
  }

  for (const [key, item] of Object.entries(TRICITY_LOCATION_DB)) {
    if (clean === key || (clean.length > 5 && (clean.includes(key) || key.includes(clean)))) {
      const res = {
        name: item.name,
        sector: item.sector,
        address: item.name,
        longitude: item.lng,
        latitude: item.lat,
        location: {
          type: 'Point',
          coordinates: [item.lng, item.lat]
        }
      };
      cache.set(clean, { lat: item.lat, lng: item.lng, name: item.name, sector: item.sector });
      saveGeocodeCache();
      return res;
    }
  }

  const secMatch = clean.match(/(?:sector|sec)\s*(\d+)/i) || clean.match(/^(\d+)\s*(?:mkt|market)?$/i);
  if (secMatch) {
    const secCoords = getSectorCoordinates(secMatch[1]);
    if (secCoords) {
      const res = {
        name: placeName.trim(),
        sector: secCoords.sector,
        address: secCoords.name,
        longitude: secCoords.lng,
        latitude: secCoords.lat,
        location: {
          type: 'Point',
          coordinates: [secCoords.lng, secCoords.lat]
        }
      };
      cache.set(clean, { lat: secCoords.lat, lng: secCoords.lng, name: secCoords.name, sector: secCoords.sector });
      saveGeocodeCache();
      return res;
    }
  }

  const nomQuery = `${placeName}, Chandigarh Tricity, Punjab, India`;
  const nomResult = await fetchFromNominatim(nomQuery) || await fetchFromNominatim(`${placeName}, Chandigarh`);
  if (nomResult) {
    const res = {
      name: placeName.trim(),
      sector: null,
      address: nomResult.name,
      longitude: nomResult.lng,
      latitude: nomResult.lat,
      location: {
        type: 'Point',
        coordinates: [nomResult.lng, nomResult.lat]
      }
    };
    cache.set(clean, { lat: nomResult.lat, lng: nomResult.lng, name: placeName.trim(), sector: null });
    saveGeocodeCache();
    return res;
  }

  return null;
}

async function reverseGeocode(latitude, longitude) {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Invalid latitude/longitude numbers provided.');
  }

  let minDistance = Infinity;
  let closest = null;

  for (const item of Object.values(TRICITY_LOCATION_DB)) {
    const dLat = item.lat - latitude;
    const dLng = item.lng - longitude;
    const dist = Math.sqrt(dLat * dLat + dLng * dLng);

    if (dist < minDistance) {
      minDistance = dist;
      closest = item;
    }
  }

  if (closest && minDistance < 0.05) {
    return {
      name: closest.name,
      sector: closest.sector,
      latitude,
      longitude
    };
  }

  return {
    name: `Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
    sector: null,
    latitude,
    longitude
  };
}

async function searchLocations(query) {
  if (!query || typeof query !== 'string') return [];
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results = [];
  const seen = new Set();

  for (const [key, item] of Object.entries(TRICITY_LOCATION_DB)) {
    const itemName = (item.name || '').toLowerCase();
    const itemSec = (item.sector || '').toLowerCase();
    if (key.includes(q) || itemName.includes(q) || (itemSec && `sector ${itemSec}`.includes(q))) {
      const nameKey = item.name.toLowerCase();
      if (!seen.has(nameKey)) {
        seen.add(nameKey);
        results.push({
          id: `db-${key}`,
          name: item.name,
          detail: item.sector ? `Sector ${item.sector}, Chandigarh Tricity` : 'Chandigarh Transit Hub',
          lat: item.lat,
          lng: item.lng,
          isTransitStop: itemName.includes('isbt') || itemName.includes('bus') || itemName.includes('chowk')
        });
      }
    }
  }

  if (q.includes('universi') || q.includes('chandi') || q.includes('cu') || q.includes('gharuan')) {
    const cuKey = 'chandigarh university';
    if (TRICITY_LOCATION_DB[cuKey] && !seen.has(TRICITY_LOCATION_DB[cuKey].name.toLowerCase())) {
      seen.add(TRICITY_LOCATION_DB[cuKey].name.toLowerCase());
      results.unshift({
        id: 'db-cu',
        name: TRICITY_LOCATION_DB[cuKey].name,
        detail: 'NH-05, Gharuan, Mohali',
        lat: TRICITY_LOCATION_DB[cuKey].lat,
        lng: TRICITY_LOCATION_DB[cuKey].lng,
        isTransitStop: false
      });
    }
  }

  const secMatch = q.match(/(?:sector|sec)\s*(\d+)/i) || q.match(/^(\d+)$/);
  if (secMatch) {
    const secNum = parseInt(secMatch[1], 10);
    const secData = getSectorCoordinates(secNum);
    if (secData && !seen.has(secData.name.toLowerCase())) {
      seen.add(secData.name.toLowerCase());
      results.push({
        id: `sec-${secNum}`,
        name: secData.name,
        detail: 'Chandigarh Le Corbusier Sector',
        lat: secData.lat,
        lng: secData.lng,
        isTransitStop: false
      });
    }
  }

  try {
    const stopsPath = path.join(__dirname, '../data/stops_for_gemini_enrichment.json');
    if (fs.existsSync(stopsPath)) {
      const stopsData = JSON.parse(fs.readFileSync(stopsPath, 'utf8'));
      for (const st of stopsData) {
        if (st.name && st.name.toLowerCase().includes(q)) {
          const stopKey = st.name.toLowerCase();
          if (!seen.has(stopKey) && st.latitude && st.longitude) {
            seen.add(stopKey);
            results.push({
              id: `stop-${st.name}`,
              name: st.name,
              detail: st.sector ? `Sector ${st.sector} Transit Stop` : 'CTU Bus Stop',
              lat: Number(st.latitude),
              lng: Number(st.longitude),
              isTransitStop: true
            });
            if (results.length >= 10) break;
          }
        }
      }
    }
  } catch (err) {

  }

  if (results.length < 4 && q.length >= 3) {
    try {
      const nomQuery = `${query}, Chandigarh Tricity, Punjab, India`;
      const nomRes = await fetchFromNominatim(nomQuery);
      if (nomRes && !seen.has(nomRes.name.toLowerCase())) {
        seen.add(nomRes.name.toLowerCase());
        results.push({
          id: `nom-${Date.now()}`,
          name: query.trim(),
          detail: nomRes.name,
          lat: nomRes.lat,
          lng: nomRes.lng,
          isTransitStop: false
        });
      }
    } catch (e) {

    }
  }

  return results.slice(0, 8);
}

module.exports = {
  geocode,
  reverseGeocode,
  searchLocations,
  TRICITY_LOCATION_DB,
  SECTOR_COORDINATES
};

