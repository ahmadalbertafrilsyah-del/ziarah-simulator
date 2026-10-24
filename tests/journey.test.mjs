import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeRoute, positionAtDistance } from '../lib/geo.mjs';
import { advanceJourney, validateJourneyRoute } from '../lib/journey.mjs';
const fixture = JSON.parse(readFileSync(new URL('../data/example-route.json',import.meta.url)));

test('Ampel–Giri stored road geometry decodes and ends at the route endpoint', () => {
 const route = validateJourneyRoute(normalizeRoute(fixture.response));
 assert.ok(route.coordinates.length > 500);
 assert.ok(route.distanceM > 20000 && route.distanceM < 25000);
 assert.deepEqual(positionAtDistance(route, 0), route.coordinates[0]);
 assert.deepEqual(positionAtDistance(route, route.distanceM), route.coordinates.at(-1));
 const halfway = positionAtDistance(route, route.distanceM / 2);
 assert.ok(halfway.every(Number.isFinite));
});
test('distance is independent of frame rate and cannot overshoot arrival', () => {
 let d=0;
 for(let i=0;i<600;i++) d=advanceJourney(d,100000,1/60,30).traveled;
 assert.ok(Math.abs(d-advanceJourney(0,100000,10,30).traveled)<1e-7);
 assert.deepEqual(advanceJourney(999,1000,1,120),{traveled:1000,arrived:true});
 assert.equal(advanceJourney(100,1000,0,30).traveled,100);
});
test('invalid or missing road geometry is rejected instead of fabricated', () => {
 for(const data of [null,{}, {coordinates:[[112,-7]],durationSec:10},
  {coordinates:[[112,-7],[113,-7]],durationSec:0},
  {coordinates:[[112,-7],[999,-7]],durationSec:10},
  {coordinates:[[112,-7],[112,-7]],durationSec:10}]) {
  assert.throws(()=>validateJourneyRoute(data));
 }
});
