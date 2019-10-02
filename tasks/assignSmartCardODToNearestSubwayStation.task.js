require('../../../config/shared/dotenv.config');
const knex = require('knex')(require('../../../knexfile'));

import _get      from 'lodash.get';
import fs        from 'fs';
import geokdbush from 'geokdbush';

import odTripsQueries from '../../../src/queries/transition/odTrips.db.queries';
import NodeCollection from '../../../src/models/transition/transit/NodeCollection';
import TrError        from '../../../src/errors/transition/transition.errors';
import { randomFromDistribution, randomFloatInRange } from '../../../src/utils/RandomUtils';

const mtlRegionGeojson            = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + '/data/mtl_region.geojson')).features[0].geometry);
const rtlRegionGeojson            = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + '/data/rtl_region.geojson')).features[0].geometry);
const metroLongueuilRegionGeojson = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + '/data/metro_longueuil_region.geojson')).features[0].geometry);

const smartCardExpansionFactor = 1/17;

const smartCardRtl2Mtl = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/smartCardRtl2Mtl.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/smartCardRtl2Mtl.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NULL
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${mtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/smartCardRtl2Mtl.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const smartCardRtl2ML = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/smartCardRtl2ML.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/smartCardRtl2ML.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NULL
      AND NOT ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${metroLongueuilRegionGeojson}'))
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${metroLongueuilRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/smartCardRtl2ML.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const smartCardMtl2Rtl = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/smartCardMtl2Rtl.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/smartCardMtl2Rtl.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NULL
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${mtlRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/smartCardMtl2Rtl.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const smartCardML2Rtl = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/smartCardML2Rtl.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/smartCardML2Rtl.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NULL
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${metroLongueuilRegionGeojson}'))
      AND NOT ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${metroLongueuilRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/smartCardML2Rtl.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const odRtl2ML = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/odRtl2ML.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/odRtl2ML.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        expansion_factor,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NOT NULL
      AND mode IN ('transit', 'parkAndRide', 'kissAndRide', 'bikeAndRide')
      AND departure_time_seconds BETWEEN 21600 AND 32399
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${metroLongueuilRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/odRtl2ML.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const odMtl2Rtl = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/odMtl2Rtl.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/odMtl2Rtl.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        expansion_factor,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NOT NULL
      AND mode IN ('transit', 'parkAndRide', 'kissAndRide', 'bikeAndRide')
      AND departure_time_seconds BETWEEN 21600 AND 32399
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${mtlRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/odMtl2Rtl.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const odMtl2ML = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/odMtl2ML.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/odMtl2ML.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        expansion_factor,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NOT NULL
      AND mode IN ('transit', 'parkAndRide', 'kissAndRide', 'bikeAndRide')
      AND departure_time_seconds BETWEEN 21600 AND 32399
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${mtlRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${metroLongueuilRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/odMtl2ML.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const odRtl2Mtl = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/odRtl2Mtl.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/odRtl2Mtl.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        expansion_factor,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NOT NULL
      AND mode IN ('transit', 'parkAndRide', 'kissAndRide', 'bikeAndRide')
      AND departure_time_seconds BETWEEN 21600 AND 32399
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${mtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/odRtl2Mtl.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};

const odML2Rtl = function() {
  return new Promise(function(resolve, reject) {

    if (fs.existsSync(__dirname + '/data/odML2Rtl.json'))
    {
      return resolve(JSON.parse(fs.readFileSync(__dirname + '/data/odML2Rtl.json')));
    }

    return knex.raw(`
      SELECT 
        id,
        expansion_factor,
        ST_Y(origin_geography::geometry) as origin_lat,
        ST_X(origin_geography::geometry) as origin_lon,
        ST_Y(destination_geography::geometry) as destination_lat,
        ST_X(destination_geography::geometry) as destination_lon
      FROM tr_od_trips
      WHERE person_id IS NOT NULL
      AND mode IN ('transit', 'parkAndRide', 'kissAndRide', 'bikeAndRide')
      AND departure_time_seconds BETWEEN 21600 AND 32399
      AND ST_INTERSECTS(origin_geography, ST_GeomFromGeoJSON('${metroLongueuilRegionGeojson}'))
      AND ST_INTERSECTS(destination_geography, ST_GeomFromGeoJSON('${rtlRegionGeojson}'));
    `).then(function(response) {
      const odTrips = _get(response, 'rows');
      fs.writeFileSync(__dirname + '/data/odML2Rtl.json', JSON.stringify(odTrips));
      resolve(odTrips);
    });
  });
};


const subwayStations = function() {

  return new Promise(function(resolve, reject) {
    return knex.raw(`
      SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', COALESCE(jsonb_agg(features.feature), '[]'::jsonb)
      ) as geojson
      FROM (
        SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         inputs.integer_id,
          'geometry',   ST_AsGeoJSON(inputs.geography)::jsonb,
          'properties', inputs.properties
        ) AS feature
        FROM (
          SELECT 
            id,
            geography,
            integer_id,
            json_build_object(
              'id', id,
              'internal_id', internal_id,
              'code', code,
              'name', name,
              'geography', ST_AsGeoJSON(geography)::jsonb, /* we should remove this, verify in code if we use geography in geojson collection */
              'integer_id', integer_id
            ) AS properties
          FROM tr_transit_nodes 
          WHERE name LIKE 'STATION %'
          ORDER BY integer_id
        ) inputs
      ) features;
    `).then(function(response) {
      const geojson = _get(response, 'rows[0].geojson');
      geojson ? resolve(geojson) : reject(new TrError(
        'cannot fetch transit nodes geojson collection because database did not return a valid geojson',
        '',
        "TransitNodesGeojsonCollectionCouldNotBeFetchedBecauseDatabaseError"
      ));
    }).catch(function(error) {
      reject(new TrError(
        `cannot fetch transit nodes geojson collection because of a database error (knex error: ${error})`,
        '',
        "TransitNodesGeojsonCollectionCouldNotBeFetchedBecauseDatabaseError"
      ));
    });
  });
};

Promise.all([
  smartCardRtl2Mtl(),
  smartCardRtl2ML(),
  smartCardMtl2Rtl(),
  smartCardML2Rtl(),
  odRtl2ML(),
  odMtl2ML(),
  odMtl2Rtl(),
  odRtl2Mtl(),
  odML2Rtl(),
  subwayStations()
]).then(function(results) {
  const [
    smartCardRtl2Mtl,
    smartCardRtl2ML,
    smartCardMtl2Rtl,
    smartCardML2Rtl,
    odRtl2ML,
    odMtl2ML,
    odMtl2Rtl,
    odRtl2Mtl,
    odML2Rtl,
    nodesGeojson
  ] = results;

  const smartCardRtl2MtlCount = smartCardExpansionFactor * smartCardRtl2Mtl.length;
  const smartCardRtl2MLCount  = smartCardExpansionFactor * smartCardRtl2ML.length;
  const smartCardMtl2RtlCount = smartCardExpansionFactor * smartCardMtl2Rtl.length;
  const smartCardML2RtlCount  = smartCardExpansionFactor * smartCardML2Rtl.length;

  console.log("smartCardRtl2Mtl", smartCardRtl2MtlCount);
  console.log("smartCardRtl2ML" , smartCardRtl2MLCount );
  console.log("smartCardMtl2Rtl", smartCardMtl2RtlCount);
  console.log("smartCardML2Rtl" , smartCardML2RtlCount );
  
  let odRtl2MLCount = 0;
  odRtl2ML.forEach(function(odTrip) {
    odRtl2MLCount += odTrip.expansion_factor;
  });
  console.log("odRtl2ML", odRtl2MLCount);

  let odMtl2MLCount = 0;
  odMtl2ML.forEach(function(odTrip) {
    odMtl2MLCount += odTrip.expansion_factor;
  });
  console.log("odMtl2ML", odMtl2MLCount);

  let odMtl2RtlCount = 0;
  odMtl2Rtl.forEach(function(odTrip) {
    odMtl2RtlCount += odTrip.expansion_factor;
  });
  console.log("odMtl2Rtl", odMtl2RtlCount);

  let odRtl2MtlCount = 0;
  odRtl2Mtl.forEach(function(odTrip) {
    odRtl2MtlCount += odTrip.expansion_factor;
  });
  console.log("odRtl2Mtl", odRtl2MtlCount);

  let odML2RtlCount = 0;
  odML2Rtl.forEach(function(odTrip) {
    odML2RtlCount += odTrip.expansion_factor;
  });
  console.log("odML2Rtl", odML2RtlCount);

  const ratioMtl2ML = odML2RtlCount / smartCardML2RtlCount;
  console.log("ratioMtl2ML", ratioMtl2ML);

  const ratioML2Mtl = (smartCardRtl2MLCount - odRtl2MLCount) / (smartCardRtl2MLCount);
  console.log("ratioML2Mtl", ratioML2Mtl);

  // smartCardMtl2Rtl: move origins to subway stations

  // smartCardML2Rtl: move ratioMtl2ML % of origins to subway stations

  // smartCardRtl2Mtl: move destinations to subway stations

  // smartCardRtl2ML: move ratioML2Mtl % of destinations to subway stations

  console.log("Stations count", nodesGeojson.features.length);

  const nodeCollection = new NodeCollection(nodesGeojson.features);

  // get percentage of od rtl2Mtl coming from each subway station:

  const countOriginsBySubwayStationId   = {};
  const countOriginsBySubwayStationName = {};
  const ratioOriginsBySubwayStationId   = {};
  const ratioOriginsBySubwayStationName = {};
  let   countOriginsTotal               = 0;
  nodeCollection.features.forEach(function(node) {
    countOriginsBySubwayStationId[node.properties.id]     = 0;
    countOriginsBySubwayStationName[node.properties.name] = 0;
    ratioOriginsBySubwayStationId[node.properties.id]     = 0;
    ratioOriginsBySubwayStationName[node.properties.name] = 0;
  });

  odMtl2Rtl.forEach(function(odTrip) {
    let nearestNodeDistance = Infinity;
    let nearestNode         = null;

    nodeCollection.features.forEach(function(node) {
      const distance = geokdbush.distance(odTrip.origin_lon, odTrip.origin_lat, node.geometry.coordinates[0], node.geometry.coordinates[1]);
      if (distance < nearestNodeDistance)
      {
        nearestNodeDistance = distance;
        nearestNode         = node;
      }
    });

    if (nearestNode)
    {
      countOriginsBySubwayStationId[nearestNode.properties.id]     += odTrip.expansion_factor;
      countOriginsBySubwayStationName[nearestNode.properties.name] += odTrip.expansion_factor;
      countOriginsTotal                                            += odTrip.expansion_factor;
    }
  });

  for (const nodeId in countOriginsBySubwayStationId)
  {
    ratioOriginsBySubwayStationId[nodeId] = countOriginsBySubwayStationId[nodeId] / countOriginsTotal;
  }
  for (const nodeName in countOriginsBySubwayStationName)
  {
    ratioOriginsBySubwayStationName[nodeName] = countOriginsBySubwayStationName[nodeName] / countOriginsTotal;
  }

  //console.log('ratioOriginsBySubwayStationName', ratioOriginsBySubwayStationName);

    // get percentage of od rtl2Mtl going to each subway station:

  const countDestinationsBySubwayStationId   = {};
  const countDestinationsBySubwayStationName = {};
  const ratioDestinationsBySubwayStationId   = {};
  const ratioDestinationsBySubwayStationName = {};
  let   countDestinationsTotal               = 0;
  nodeCollection.features.forEach(function(node) {
    countDestinationsBySubwayStationId[node.properties.id]     = 0;
    countDestinationsBySubwayStationName[node.properties.name] = 0;
    ratioDestinationsBySubwayStationId[node.properties.id]     = 0;
    ratioDestinationsBySubwayStationName[node.properties.name] = 0;
  });

  odRtl2Mtl.forEach(function(odTrip) {
    let nearestNodeDistance = Infinity;
    let nearestNode         = null;

    nodeCollection.features.forEach(function(node) {
      const distance = geokdbush.distance(odTrip.destination_lon, odTrip.destination_lat, node.geometry.coordinates[0], node.geometry.coordinates[1]);
      if (distance < nearestNodeDistance)
      {
        nearestNodeDistance = distance;
        nearestNode         = node;
      }
    });

    if (nearestNode)
    {
      countDestinationsBySubwayStationId[nearestNode.properties.id]     += odTrip.expansion_factor;
      countDestinationsBySubwayStationName[nearestNode.properties.name] += odTrip.expansion_factor;
      countDestinationsTotal                                            += odTrip.expansion_factor;
    }
  });

  for (const nodeId in countDestinationsBySubwayStationId)
  {
    ratioDestinationsBySubwayStationId[nodeId] = countDestinationsBySubwayStationId[nodeId] / countDestinationsTotal;
  }
  for (const nodeName in countDestinationsBySubwayStationName)
  {
    ratioDestinationsBySubwayStationName[nodeName] = countDestinationsBySubwayStationName[nodeName] / countDestinationsTotal;
  }

  //console.log('ratioDestinationsBySubwayStationName', ratioDestinationsBySubwayStationName);


  const odTripsUpdatedAttributes = [];

  const countSmartCardOriginsBySubwayStationId   = {};
  const countSmartCardOriginsBySubwayStationName = {};
  const ratioSmartCardOriginsBySubwayStationId   = {};
  const ratioSmartCardOriginsBySubwayStationName = {};
  let   countSmartCardOriginsTotal               = 0;
  nodeCollection.features.forEach(function(node) {
    countSmartCardOriginsBySubwayStationId[node.properties.id]     = 0;
    countSmartCardOriginsBySubwayStationName[node.properties.name] = 0;
    ratioSmartCardOriginsBySubwayStationId[node.properties.id]     = 0;
    ratioSmartCardOriginsBySubwayStationName[node.properties.name] = 0;
  });

  // update origins of smart card trips from Mtl: DONE
  /*smartCardMtl2Rtl.forEach(function(odTrip) {
    const nodeId = randomFromDistribution(ratioOriginsBySubwayStationId);
    const node   = nodeCollection.getById(nodeId);

    countSmartCardOriginsBySubwayStationId  [nodeId]               += smartCardExpansionFactor;
    countSmartCardOriginsBySubwayStationName[node.properties.name] += smartCardExpansionFactor;
    countSmartCardOriginsTotal                                     += smartCardExpansionFactor;
    odTripsUpdatedAttributes.push({
      id: odTrip.id,
      origin_geography: {
        type: 'Point',
        coordinates: node.geometry.coordinates
      }
    });
  });*/

  for (const nodeId in countSmartCardOriginsBySubwayStationName)
  {
    ratioSmartCardOriginsBySubwayStationId[nodeId] = countSmartCardOriginsBySubwayStationName[nodeId] / countSmartCardOriginsTotal;
  }
  for (const nodeName in countSmartCardOriginsBySubwayStationName)
  {
    ratioSmartCardOriginsBySubwayStationName[nodeName] = countSmartCardOriginsBySubwayStationName[nodeName] / countSmartCardOriginsTotal;
  }



  const countSmartCardDestinationsBySubwayStationId   = {};
  const countSmartCardDestinationsBySubwayStationName = {};
  const ratioSmartCardDestinationsBySubwayStationId   = {};
  const ratioSmartCardDestinationsBySubwayStationName = {};
  let   countSmartCardDestinationsTotal               = 0;
  nodeCollection.features.forEach(function(node) {
    countSmartCardDestinationsBySubwayStationId[node.properties.id]     = 0;
    countSmartCardDestinationsBySubwayStationName[node.properties.name] = 0;
    ratioSmartCardDestinationsBySubwayStationId[node.properties.id]     = 0;
    ratioSmartCardDestinationsBySubwayStationName[node.properties.name] = 0;
  });

  // update destinations of smart card trips to Mtl: DONE
  /*smartCardRtl2Mtl.forEach(function(odTrip) {
    const nodeId = randomFromDistribution(ratioDestinationsBySubwayStationId);
    const node   = nodeCollection.getById(nodeId);

    countSmartCardDestinationsBySubwayStationId  [nodeId]               += smartCardExpansionFactor;
    countSmartCardDestinationsBySubwayStationName[node.properties.name] += smartCardExpansionFactor;
    countSmartCardDestinationsTotal                                     += smartCardExpansionFactor;
    odTripsUpdatedAttributes.push({
      id: odTrip.id,
      destination_geography: {
        type: 'Point',
        coordinates: node.geometry.coordinates
      }
    });countSmartCardDestinationsBySubwayStationName
  });*/

  for (const nodeId in countSmartCardDestinationsBySubwayStationName)
  {
    ratioSmartCardDestinationsBySubwayStationId[nodeId] = countSmartCardDestinationsBySubwayStationName[nodeId] / countSmartCardDestinationsTotal;
  }
  for (const nodeName in countSmartCardDestinationsBySubwayStationName)
  {
    ratioSmartCardDestinationsBySubwayStationName[nodeName] = countSmartCardDestinationsBySubwayStationName[nodeName] / countSmartCardDestinationsTotal;
  }

  //console.log('ratioSmartCardDestinationsBySubwayStationName', ratioSmartCardDestinationsBySubwayStationName);


  // update origins of smart card trips from ML to Rtl (most origins are from mtl instead) DONE
  /*smartCardML2Rtl.forEach(function(odTrip) {
    if (randomFloatInRange([0.0,1.0]) > ratioMtl2ML)
    {
      const nodeId = randomFromDistribution(ratioOriginsBySubwayStationId);
      const node   = nodeCollection.getById(nodeId);
      odTripsUpdatedAttributes.push({
        id: odTrip.id,
        origin_geography: {
          type: 'Point',
          coordinates: node.geometry.coordinates
        }
      });
    }
    
  });*/

  // update destinations of smart card trips from Rtl to ML (most destinations are to mtl instead)
  smartCardRtl2ML.forEach(function(odTrip) {
    if (randomFloatInRange([0.0,1.0]) <= ratioML2Mtl)
    {
      const nodeId = randomFromDistribution(ratioDestinationsBySubwayStationId);
      const node   = nodeCollection.getById(nodeId);
      
      odTripsUpdatedAttributes.push({
        id: odTrip.id,
        destination_geography: {
          type: 'Point',
          coordinates: node.geometry.coordinates
        }
      });
    }
    
  });

  console.log('updating changed od trips...');

  odTripsQueries.updateMultiple(odTripsUpdatedAttributes).then(function(response) {
    console.log('complete!');
    process.exit();
  });

});