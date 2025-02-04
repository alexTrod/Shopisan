import { Pool } from 'pg';
import { firestore } from "../../../../firebaseconfig";
import { collection, getDocs } from "firebase/firestore";



const postgresDB = new Pool({
  user: 'uepl143k8shhti',
  host: 'c89c8h4kkah9ri.cluster-czz5s0kz4scl.eu-west-1.rds.amazonaws.com', 
  database: 'd83q9ejjmp0267',
  password: 'p9e1c9d9472d4e540ccd60f24ec8ee1078834e53164369fc6a23b7515927b30de',
  port: 5432,
});

// Helper function to create URL-friendly slugs
function createSlug(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}



async function migrateLocationData() {
  const countries = await postgresDB.query('SELECT * FROM countries');
  console.log(countries);
  for (const country of countries) {
    await firestore.collection('countries').doc(country.code).set({
      name: country.name,
      iso:country.iso,
      id: country.code
    });
  }

  // 2. Migrate cities as sub-collections
  const cities = await postgresDB.query('SELECT cities.*, countries.code FROM cities JOIN countries ON cities.country_id = countries.id');
  for (const city of cities) {
    await firestore
      .collection('countries')
      .doc(city.code)
      .collection('cities')
      .doc(createSlug(city.name))
      .set({
        name: city.name,
        storeCount: 0  // Will update this later
      });
  }

  // 3. Migrate store addresses with embedded location data
  const storeAddresses = await postgresDB.query(`
    SELECT 
      sa.*,
      c.name as city_name,
      co.code as country_code,
      co.name as country_name
    FROM store_addresses sa
    JOIN cities c ON sa.city_id = c.id
    JOIN countries co ON c.country_id = co.id
  `);

  for (const address of storeAddresses) {
    // Create the store document with embedded location
    await firestore.collection('stores').doc(address.store_id).set({
      location: {
        country: {
          id: address.country_code,
          name: address.country_name
        },
        city: {
          id: createSlug(address.city_name),
          name: address.city_name
        },
        address: {
          street: address.street_address,
          postalCode: address.postal_code
        },
        geopoint: new firestore.GeoPoint(
          address.latitude,
          address.longitude
        ),
        geohash: createGeohash(address.latitude, address.longitude)
      }
    }, { merge: true });  // Use merge to preserve other store data

    // Update city store count
    await firestore
      .collection('countries')
      .doc(address.country_code)
      .collection('cities')
      .doc(createSlug(address.city_name))
      .update({
        storeCount: firestore.FieldValue.increment(1)
      });
  }
}