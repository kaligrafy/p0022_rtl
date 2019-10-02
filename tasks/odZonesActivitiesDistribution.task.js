require('../../../config/shared/dotenv.config');
const knex = require('knex')(require('../../../knexfile'));

import _get                  from 'lodash.get';
import fs                    from 'fs';
import KDBush                from 'kdbush';
import geokdbush             from 'geokdbush';
import bbox                  from '@turf/bbox';
import bboxPolygon           from '@turf/bbox-polygon';
import inside                from '@turf/inside';
import pointToLineDistance   from '@turf/point-to-line-distance';
import { randomPoint }       from '@turf/random';
import centerOfMass          from '@turf/center-of-mass';
import polygonToLine         from '@turf/polygon-to-line';
import pointsWithinPolygon   from '@turf/points-within-polygon';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import turfLength            from '@turf/length';
import { lineString, point } from '@turf/helpers';
import turfDistance          from '@turf/distance';

import odTripsQueries from '../../../src/queries/transition/odTrips.db.queries';
import NodeCollection from '../../../src/models/transition/transit/NodeCollection';
import TrError        from '../../../src/errors/transition/transition.errors';
import { randomFromDistribution, randomFloatInRange, randomInRange } from '../../../src/utils/RandomUtils';
import { countsToRatios } from '../../../src/utils/MathsUtils';
import { _isBlank } from '../../../src/utils/LodashExtensions';

const odZones          = JSON.parse(fs.readFileSync(__dirname + '/data/od_zones_longueuil.geojson'));
const rtlRegionGeojson = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + '/data/rtl_region.geojson')).features[0].geometry);

const keepSmartCardOrigins        = true;
const smartCardOriginsOffset      = 0;
const keepSmartCardDestinations   = true;
const smartCardDestinationsOffset = 0;

const bufferAroundZonesKm      = 0.833; // 10 minutes walk, bird distance
const smartCardExpansionFactor = 1/17;

let smartCardOriginsImputedIds = {};
if (fs.existsSync(__dirname + '/data/smartCardOriginsImputedIds.json'))
{
  smartCardOriginsImputedIds = JSON.parse(fs.readFileSync(__dirname + '/data/smartCardOriginsImputedIds.json'));
}

let smartCardDestinationsImputedIds = {};
if (fs.existsSync(__dirname + '/data/smartCardDestinationsImputedIds.json'))
{
  smartCardDestinationsImputedIds = JSON.parse(fs.readFileSync(__dirname + '/data/smartCardDestinationsImputedIds.json'));
}

const odRtlOrigins = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/odRtlOrigins.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/odRtlOrigins.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        expansion_factor,
        origin_activity,
        ST_Y(origin_geography::geometry) as olat,
        ST_X(origin_geography::geometry) as olon,
        ST_Y(destination_geography::geometry) as dlat,
        ST_X(destination_geography::geometry) as dlon
      FROM tr_od_trips
      WHERE person_id IS NOT NULL
      AND mode IN ('transit', 'parkAndRide', 'kissAndRide', 'bikeAndRide')
      AND departure_time_seconds BETWEEN 21600 AND 32399
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/odRtlOrigins.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const odRtlDestinations = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/odRtlDestinations.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/odRtlDestinations.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        expansion_factor,
        destination_activity,
        ST_Y(origin_geography::geometry) as olat,
        ST_X(origin_geography::geometry) as olon,
        ST_Y(destination_geography::geometry) as dlat,
        ST_X(destination_geography::geometry) as dlon
      FROM tr_od_trips
      WHERE person_id IS NOT NULL
      AND mode IN ('transit', 'parkAndRide', 'kissAndRide', 'bikeAndRide')
      AND departure_time_seconds BETWEEN 21600 AND 32399
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/odRtlDestinations.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const smartCardRtlOrigins = function() {
  return new Promise(function(resolve, reject) {

    if (keepSmartCardOrigins && fs.existsSync(__dirname + '/data/smartCardRtlOrigins.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/smartCardRtlOrigins.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        (ROW_NUMBER() OVER (ORDER BY id) - ${smartCardOriginsOffset + 1}) AS idx,
        ROUND(ST_Y(origin_geography::geometry)::numeric,6) as olat,
        ROUND(ST_X(origin_geography::geometry)::numeric,6) as olon
        /*ST_Y(destination_geography::geometry) as dlat,
        ST_X(destination_geography::geometry) as dlon*/
      FROM tr_od_trips
      WHERE person_id IS NULL
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'))
      ORDER BY id
      LIMIT 100000 OFFSET ${smartCardOriginsOffset};
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/smartCardRtlOrigins.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const smartCardRtlDestinations = function() {
  return new Promise(function(resolve, reject) {

    if (keepSmartCardDestinations && fs.existsSync(__dirname + '/data/smartCardRtlDestinations.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/smartCardRtlDestinations.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        (ROW_NUMBER() OVER (ORDER BY id) - ${smartCardDestinationsOffset + 1}) AS idx,
        /*ST_Y(origin_geography::geometry) as olat,
        ST_X(origin_geography::geometry) as olon,*/
        ROUND(ST_Y(destination_geography::geometry)::numeric,6) as dlat,
        ROUND(ST_X(destination_geography::geometry)::numeric,6) as dlon
      FROM tr_od_trips
      WHERE person_id IS NULL
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'))
      ORDER BY id
      LIMIT 100000 OFFSET ${smartCardDestinationsOffset};
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/smartCardRtlDestinations.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

Promise.all([
  odRtlOrigins(),
  odRtlDestinations(),
  smartCardRtlOrigins(),
  smartCardRtlDestinations()
]).then(function(results) {
  const [
    odRtlOrigins,
    odRtlDestinations,
    smartCardRtlOrigins,
    smartCardRtlDestinations
  ] = results;
  
  const smartCardRtlOriginsCount      = smartCardExpansionFactor * smartCardRtlOrigins.length;
  const smartCardRtlDestinationsCount = smartCardExpansionFactor * smartCardRtlDestinations.length;
  console.log("smartCardRtlOriginsCount", smartCardRtlOriginsCount);
  console.log("smartCardRtlDestinationsCount", smartCardRtlDestinationsCount);

  let odRtlOriginsCount = 0;
  odRtlOrigins.forEach(function(odTrip, odTripIndex) {
    odRtlOriginsCount += odTrip.expansion_factor;
  });
  console.log("odRtlOriginsCount", odRtlOriginsCount);

  let odRtlDestinationsCount = 0;
  odRtlDestinations.forEach(function(odTrip) {
    odRtlDestinationsCount += odTrip.expansion_factor;
  });
  console.log("odRtlDestinationsCount", odRtlDestinationsCount);

  // get ratios of each activity for OD origins:
  const countByOriginActivity = {
    home    : 0,
    shopping: 0,
    work    : 0,
    health  : 0,
    leisure : 0,
    school  : 0,
    transfer: 0
  };
  const originActivityByIndex = {
    "0": "home",
    "1": "shopping",
    "2": "work",
    "3": "health",
    "4": "leisure",
    "5": "school",
    "6": "transfer"
  };

  odRtlOrigins.forEach(function(odTrip, odTripIndex) {
    if (['home', 'visitingFriends'].includes(odTrip.origin_activity))
    {
      countByOriginActivity.home += odTrip.expansion_factor;
    }
    else if (['shopping'].includes(odTrip.origin_activity))
    {
      countByOriginActivity.shopping += odTrip.expansion_factor;
    }
    else if (['leisure'].includes(odTrip.origin_activity))
    {
      countByOriginActivity.leisure += odTrip.expansion_factor;
    }
    else if (['medical'].includes(odTrip.origin_activity))
    {
      countByOriginActivity.health += odTrip.expansion_factor;
    }
    else if (['schoolUsual'].includes(odTrip.origin_activity))
    {
      countByOriginActivity.school += odTrip.expansion_factor;
    }
    else if (['unknown', 'other', 'fetchSomeone', 'dropSomeone'].includes(odTrip.origin_activity))
    {
      const randomInteger = randomInRange([0,5]);
      countByOriginActivity[originActivityByIndex[randomInteger]] += odTrip.expansion_factor;
    }
    else if (['workNonUsual', 'workUsual', 'onTheRoad'].includes(odTrip.origin_activity))
    {
      const randomInteger = randomInRange([1,5]);
      countByOriginActivity[originActivityByIndex[randomInteger]] += odTrip.expansion_factor;
    }
  });

  const originActivitiesRatio = countsToRatios(countByOriginActivity);
  console.log(originActivitiesRatio);

  // get ratios of each activity for OD destinations:
  const countByDestinationActivity = {
    home    : 0,
    shopping: 0,
    work    : 0,
    health  : 0,
    leisure : 0,
    school  : 0,
    transfer: 0
  };
  const destinationActivityByIndex = {
    "0": "home",
    "1": "shopping",
    "2": "work",
    "3": "health",
    "4": "leisure",
    "5": "school",
    "6": "transfer"
  };

  odRtlDestinations.forEach(function(odTrip, odTripIndex) {
    if (['home', 'visitingFriends'].includes(odTrip.destination_activity))
    {
      countByDestinationActivity.home += odTrip.expansion_factor;
    }
    else if (['shopping'].includes(odTrip.destination_activity))
    {
      countByDestinationActivity.shopping += odTrip.expansion_factor;
    }
    else if (['leisure'].includes(odTrip.destination_activity))
    {
      countByDestinationActivity.leisure += odTrip.expansion_factor;
    }
    else if (['medical'].includes(odTrip.destination_activity))
    {
      countByDestinationActivity.health += odTrip.expansion_factor;
    }
    else if (['schoolUsual'].includes(odTrip.destination_activity))
    {
      countByDestinationActivity.school += odTrip.expansion_factor;
    }
    else if (['unknown', 'other', 'fetchSomeone', 'dropSomeone'].includes(odTrip.destination_activity))
    {
      const randomInteger = randomInRange([0,5]);
      countByDestinationActivity[destinationActivityByIndex[randomInteger]] += odTrip.expansion_factor;
    }
    else if (['workNonUsual', 'workUsual', 'onTheRoad'].includes(odTrip.destination_activity))
    {
      const randomInteger = randomInRange([1,5]);
      countByDestinationActivity[destinationActivityByIndex[randomInteger]] += odTrip.expansion_factor;
    }
  });

  const destinationActivitiesRatio = countsToRatios(countByDestinationActivity);
  console.log(destinationActivitiesRatio);

  // generating smart cards origins spatial index:
  const smartCardOriginsSpatialIndex      = new KDBush(smartCardRtlOrigins, (odTrip) => odTrip.olon, (odTrip) => odTrip.olat);

  // generate linestrings from od zones for pointToLine distances:
  const odZonesOriginCalculations = {};
  odZones.features.forEach(function(odZone) {

    const                     zoneId         = odZone.properties.fid;
    const                     zoneActivity   = odZone.properties.activity;
    const                     zoneLineString = polygonToLine(odZone);
    odZonesOriginCalculations[zoneId]        = {
      geojson   : odZone,
      activity  : zoneActivity,
      lineString: zoneLineString
    };
    const zoneBbox          = bbox(odZone);
    const horizontal        = lineString([[zoneBbox[0], zoneBbox[3]],[zoneBbox[2], zoneBbox[3]]]);
    const vertical          = lineString([[zoneBbox[0], zoneBbox[3]],[zoneBbox[0], zoneBbox[1]]]);
    const width             = turfLength(horizontal);
    const height            = turfLength(vertical);
    const centroid          = centerOfMass(odZone);
    const radiusKm          = Math.max(width, height) + bufferAroundZonesKm;
    const zoneActivityRatio = originActivitiesRatio[zoneActivity];
    odZonesOriginCalculations[zoneId].bbox                = zoneBbox;
    odZonesOriginCalculations[zoneId].centroid            = centroid;
    odZonesOriginCalculations[zoneId].radiusKm            = radiusKm;
    odZonesOriginCalculations[zoneId].activityRatio       = zoneActivityRatio;
    odZonesOriginCalculations[zoneId].smartCardOriginsIds = [];

    const smartCardOriginsAroundZone = geokdbush.around(smartCardOriginsSpatialIndex, centroid.geometry.coordinates[0], centroid.geometry.coordinates[1], undefined, radiusKm);
    
    for (let i = 0, count = smartCardOriginsAroundZone.length; i < count; i++)
    {
      const originAround = smartCardOriginsAroundZone[i];

      if (smartCardOriginsImputedIds[originAround.id]) {
        continue;
      }

      const idx = parseInt(originAround.idx);
      const smartCardOrigin = smartCardRtlOrigins[idx];
      if (!smartCardOrigin.zones)
      {
        smartCardOrigin.zones = {};
      }

      const originPoint    = point([originAround.olon, originAround.olat]);
      const pointInPolygon = booleanPointInPolygon(originPoint, odZone);
      const distanceKm     = pointInPolygon ? 0 : pointToLineDistance(originPoint, zoneLineString);
      
      //console.log('pointInPolygon', pointInPolygon);

      let zoneWeight = null;
      if (distanceKm === 0)
      {
        if (zoneActivity === 'transfer')
        {
          zoneWeight = 10.0;
        }
        else
        {
          zoneWeight = zoneActivityRatio * 1.1;
        }
      }
      else if (distanceKm < 0.05)
      {
        zoneWeight = 0.9 * zoneActivityRatio;
      }
      else if (distanceKm <= 0.833)
      {
        zoneWeight = zoneActivityRatio / (Math.pow(distanceKm * 1000, 0.35));
      }
      if (zoneWeight !== null)
      {
        smartCardOrigin.zones[zoneId] = zoneWeight;
        //console.log(zoneActivity, zoneActivityRatio, distanceKm, smartCardOrigin.zones[zoneId], smartCardOrigin.zones);
      }

      smartCardOriginsAroundZone[i].zones = smartCardOrigin.zones;
      
      //smartCardOrigin.zones[zoneId] = 
      //const smartCardOrigin = smartCardOriginsAroundZone[i];
      //smartCardOriginsAroundZone[i].
    }



    //console.log(smartCardOriginsAroundZone);

    //console.log(zoneId, smartCardOriginsAroundZone.length);

    //odZonesCalculations[zoneId].width = width;
    //console.log(zoneBbox);
    //odZonesCalculations[zoneId].bboxHeight = 
  });

  const odTripsOriginsUpdatedAttributes = [];

  let sumDistances = 0;
  let countDistances = 0;
  for (let i = 0, count = smartCardRtlOrigins.length; i < count; i++)
  {
    const smartCardOrigin = smartCardRtlOrigins[i];
    if (!smartCardOriginsImputedIds[smartCardOrigin.id] && smartCardOrigin.zones)
    {
      smartCardOriginsImputedIds[smartCardOrigin.id] = true;
      const distribution    = countsToRatios(smartCardOrigin.zones);
      const assignedZoneId  = randomFromDistribution(distribution);
      const zoneGeojson     = odZonesOriginCalculations[assignedZoneId].geojson;
      const zoneBbox        = odZonesOriginCalculations[assignedZoneId].bbox;
      const zoneActivity    = odZonesOriginCalculations[assignedZoneId].activity;
      //const distanceToZone  = pointToLineDistance(point([smartCardOrigin.olon, smartCardOrigin.olat]), odZonesOriginCalculations[assignedZoneId].lineString);

      let randomPointInZone = null;
      while(randomPointInZone === null)
      {
        const randomPointInBbox = randomPoint(1, {bbox: zoneBbox}).features[0];
        if (booleanPointInPolygon(randomPointInBbox, zoneGeojson))
        {
          randomPointInZone = randomPointInBbox;
          const distance = turfDistance(point([smartCardOrigin.olon, smartCardOrigin.olat]), randomPointInZone);
          //console.log('distance', distance * 1000, distanceToZone);
          countDistances += 1;
          sumDistances += distance * 1000;
          odTripsOriginsUpdatedAttributes.push({
            id              : smartCardOrigin.id,
            origin_geography: randomPointInZone.geometry
          });
        }
      }
    }
  }

  /*console.log('averageDist', sumDistances/countDistances);

  console.log('updating changed od trips...');

  odTripsQueries.updateMultiple(odTripsOriginsUpdatedAttributes).then(function(response) {
    console.log('complete!');
    fs.writeFileSync(__dirname + '/data/smartCardOriginsImputedIds.json', JSON.stringify(smartCardOriginsImputedIds));
    process.exit();
  });*/

  






// generating smart cards destinations spatial index:
const smartCardDestinationsSpatialIndex      = new KDBush(smartCardRtlDestinations, (odTrip) => odTrip.dlon, (odTrip) => odTrip.dlat);

// generate linestrings from od zones for pointToLine distances:
const odZonesDestinationCalculations = {};
odZones.features.forEach(function(odZone) {

  const                     zoneId         = odZone.properties.fid;
  const                     zoneActivity   = odZone.properties.activity;
  const                     zoneLineString = polygonToLine(odZone);
  odZonesDestinationCalculations[zoneId]        = {
    geojson   : odZone,
    activity  : zoneActivity,
    lineString: zoneLineString
  };
  const zoneBbox          = bbox(odZone);
  const horizontal        = lineString([[zoneBbox[0], zoneBbox[3]],[zoneBbox[2], zoneBbox[3]]]);
  const vertical          = lineString([[zoneBbox[0], zoneBbox[3]],[zoneBbox[0], zoneBbox[1]]]);
  const width             = turfLength(horizontal);
  const height            = turfLength(vertical);
  const centroid          = centerOfMass(odZone);
  const radiusKm          = Math.max(width, height) + bufferAroundZonesKm;
  const zoneActivityRatio = destinationActivitiesRatio[zoneActivity];
  odZonesDestinationCalculations[zoneId].bbox                = zoneBbox;
  odZonesDestinationCalculations[zoneId].centroid            = centroid;
  odZonesDestinationCalculations[zoneId].radiusKm            = radiusKm;
  odZonesDestinationCalculations[zoneId].activityRatio       = zoneActivityRatio;
  odZonesDestinationCalculations[zoneId].smartCardDestinationsIds = [];

  const smartCardDestinationsAroundZone = geokdbush.around(smartCardDestinationsSpatialIndex, centroid.geometry.coordinates[0], centroid.geometry.coordinates[1], undefined, radiusKm);
  
  for (let i = 0, count = smartCardDestinationsAroundZone.length; i < count; i++)
  {
    const destinationAround = smartCardDestinationsAroundZone[i];

    if (smartCardDestinationsImputedIds[destinationAround.id]) {
      continue;
    }

    const idx = parseInt(destinationAround.idx);
    const smartCardDestination = smartCardRtlDestinations[idx];
    if (!smartCardDestination.zones)
    {
      smartCardDestination.zones = {};
    }

    const destinationPoint = point([destinationAround.dlon, destinationAround.dlat]);
    const pointInPolygon   = booleanPointInPolygon(destinationPoint, odZone);
    const distanceKm       = pointInPolygon ? 0 : pointToLineDistance(destinationPoint, zoneLineString);
    
    //console.log('pointInPolygon', pointInPolygon);

    let zoneWeight = null;
    if (distanceKm === 0)
    {
      if (zoneActivity === 'transfer')
      {
        zoneWeight = 10.0;
      }
      else
      {
        zoneWeight = zoneActivityRatio * 1.1;
      }
    }
    else if (distanceKm < 0.05)
    {
      zoneWeight = 0.9 * zoneActivityRatio;
    }
    else if (distanceKm <= 0.833)
    {
      zoneWeight = zoneActivityRatio / (Math.pow(distanceKm * 1000, 0.35));
    }
    if (zoneWeight !== null)
    {
      smartCardDestination.zones[zoneId] = zoneWeight;
      //console.log(zoneActivity, zoneActivityRatio, distanceKm, smartCardDestination.zones[zoneId], smartCardDestination.zones);
    }

    smartCardDestinationsAroundZone[i].zones = smartCardDestination.zones;
    
    //smartCardDestination.zones[zoneId] = 
    //const smartCardDestination = smartCardDestinationsAroundZone[i];
    //smartCardDestinationsAroundZone[i].
  }



  //console.log(smartCardDestinationsAroundZone);

  //console.log(zoneId, smartCardDestinationsAroundZone.length);

  //odZonesCalculations[zoneId].width = width;
  //console.log(zoneBbox);
  //odZonesCalculations[zoneId].bboxHeight = 
});

const odTripsDestinationsUpdatedAttributes = [];

sumDistances   = 0;
countDistances = 0;
for (let i = 0, count = smartCardRtlDestinations.length; i < count; i++)
{
  const smartCardDestination = smartCardRtlDestinations[i];
  if (!smartCardDestinationsImputedIds[smartCardDestination.id] && smartCardDestination.zones)
  {
    smartCardDestinationsImputedIds[smartCardDestination.id] = true;
    if (_isBlank(smartCardDestination.zones))
    {
      console.log('could not find a suitable zone for destination id ' + smartCardDestination.id);
      continue;
    }
    const distribution    = countsToRatios(smartCardDestination.zones);
    const assignedZoneId  = randomFromDistribution(distribution);
    const zoneGeojson     = odZonesDestinationCalculations[assignedZoneId].geojson;
    const zoneBbox        = odZonesDestinationCalculations[assignedZoneId].bbox;
    const zoneActivity    = odZonesDestinationCalculations[assignedZoneId].activity;
    //const distanceToZone  = pointToLineDistance(point([smartCardDestination.dlon, smartCardDestination.dlat]), odZonesDestinationCalculations[assignedZoneId].lineString);

    let randomPointInZone = null;
    while(randomPointInZone === null)
    {
      const randomPointInBbox = randomPoint(1, {bbox: zoneBbox}).features[0];
      if (booleanPointInPolygon(randomPointInBbox, zoneGeojson))
      {
        randomPointInZone = randomPointInBbox;
        const distance = turfDistance(point([smartCardDestination.dlon, smartCardDestination.dlat]), randomPointInZone);
        //console.log('distance', distance * 1000, distanceToZone);
        countDistances += 1;
        sumDistances += distance * 1000;
        odTripsDestinationsUpdatedAttributes.push({
          id              : smartCardDestination.id,
          destination_geography: randomPointInZone.geometry
        });
      }
    }
  }
}

console.log('averageDist', sumDistances/countDistances);

console.log('updating changed od trips...');

odTripsQueries.updateMultiple(odTripsDestinationsUpdatedAttributes).then(function(response) {
  console.log('complete!');
  fs.writeFileSync(__dirname + '/data/smartCardDestinationsImputedIds.json', JSON.stringify(smartCardDestinationsImputedIds));
  process.exit();
});




  //console.log(smartCardOriginsSpatialIndex);

  //process.exit();

});