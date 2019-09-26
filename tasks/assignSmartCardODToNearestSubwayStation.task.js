require('../../../config/shared/dotenv.config');
const knex = require('knex')(require('../../../knexfile'));

import _get from 'lodash.get';
import fs   from 'fs';

import odTripsQueries from '../../../src/queries/transition/odTrips.db.queries';
import NodeCollection from '../../../src/models/transition/transit/NodeCollection';
import TrError        from '../../../src/errors/transition/transition.errors';

const mtlRegionGeojson            = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + '/data/mtl_region.geojson')).features[0].geometry);
const rtlRegionGeojson            = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + '/data/rtl_region.geojson')).features[0].geometry);
const metroLongueuilRegionGeojson = JSON.stringify(JSON.parse(fs.readFileSync(__dirname + '/data/metro_longueuil_region.geojson')).features[0].geometry);

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
    nodesGeojson
  ] = results;
  console.log("smartCardRtl2Mtl", smartCardRtl2Mtl.length / 17);
  console.log("smartCardRtl2ML" , smartCardRtl2ML.length  / 17);
  console.log("smartCardMtl2Rtl", smartCardMtl2Rtl.length / 17);
  console.log("smartCardML2Rtl" , smartCardML2Rtl.length  / 17);

  let sumExpansionFactors = 0;
  odRtl2ML.forEach(function(odTrip) {
    sumExpansionFactors += odTrip.expansion_factor;
  });
  console.log("odRtl2ML", sumExpansionFactors);

  sumExpansionFactors = 0;
  odMtl2ML.forEach(function(odTrip) {
    sumExpansionFactors += odTrip.expansion_factor;
  });
  console.log("odMtl2ML", sumExpansionFactors);

  sumExpansionFactors = 0;
  odMtl2Rtl.forEach(function(odTrip) {
    sumExpansionFactors += odTrip.expansion_factor;
  });
  console.log("odMtl2Rtl", sumExpansionFactors);


  console.log("Stations count", nodesGeojson.features.length);

  const nodeCollection = new NodeCollection(nodesGeojson.features);




  process.exit();
});