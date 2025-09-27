/**
 * Consolidated Cities Migration Script
 * This replaces multiple migration files with a single, clean implementation
 */

import { firestore } from '../../firebaseconfig';
import { collection, addDoc, getDocs, doc, setDoc } from 'firebase/firestore';

// Cities data from the original JSON file
const CITIES_DATA = [
  "Paris", "Marseille", "Lyon", "Toulouse", "Nice", "Nantes", "Strasbourg", "Montpellier",
  "Bordeaux", "Lille", "Rennes", "Reims", "Le Havre", "Saint-Étienne", "Toulon", "Grenoble",
  "Dijon", "Angers", "Nîmes", "Villeurbanne", "Clermont-Ferrand", "Le Mans", "Aix-en-Provence",
  "Brest", "Tours", "Amiens", "Limoges", "Annecy", "Perpignan", "Boulogne-Billancourt", "Metz",
  "Besançon", "Orléans", "Saint-Denis", "Argenteuil", "Rouen", "Montreuil", "Mulhouse", "Caen",
  "Nancy", "Saint-Paul", "Roubaix", "Tourcoing", "Nanterre", "Vitry-sur-Seine", "Créteil",
  "Avignon", "Poitiers", "Dunkerque", "Aubervilliers", "Versailles", "Courbevoie", "Fort-de-France",
  "Colombes", "Asnières-sur-Seine", "Saint-Pierre", "Cherbourg-en-Cotentin", "Levallois-Perret",
  "La Rochelle", "Champigny-sur-Marne", "Antibes", "Calais", "Béziers", "Boulogne-sur-Mer",
  "Cannes", "Saint-Nazaire", "Drancy", "Mérignac", "Ajaccio", "Issy-les-Moulineaux", "Noisy-le-Grand",
  "Troyes", "La Seyne-sur-Mer", "Neuilly-sur-Seine", "Cergy", "Pessac", "Lorient", "Ivry-sur-Seine",
  "Évry-Courcouronnes", "Clichy", "Chambéry", "Saint-Maur-des-Fossés", "Niort", "Bourges",
  "Vénissieux", "Sarcelles", "Le Blanc-Mesnil", "Chelles", "Pantin", "Maisons-Alfort", "Fréjus",
  "Meaux", "Narbonne", "Hyères", "Saint-Quentin", "Valence", "Beauvais", "Cholet", "Bondy",
  "La Roche-sur-Yon", "Montauban", "Antony", "Épinay-sur-Seine", "Clamart", "Fontenay-sous-Bois",
  "Sartrouville", "Sevran", "Le Tampon", "Quimper", "Villejuif", "Albi", "Laval", "Arles",
  "Vannes", "Colmar", "Vaulx-en-Velin", "Grasse", "Cagnes-sur-Mer", "Suresnes", "Montrouge",
  "Martigues", "Saint-Herblain", "Saint-Malo", "Saint-Brieuc", "Aubagne", "Bobigny", "Carcassonne",
  "Chalon-sur-Saône", "Châlons-en-Champagne", "Meudon", "Bayonne", "Saint-Ouen-sur-Seine", "Massy",
  "Bastia", "Salon-de-Provence", "Corbeil-Essonnes", "Saint-Priest", "Tarbes", "Alfortville",
  "Rosny-sous-Bois", "Saint-Germain-en-Laye", "Livry-Gargan", "Pau", "Évreux", "Charleville-Mézières",
  "Bron", "Châteauroux", "Mantes-la-Jolie", "Gennevilliers", "Noisy-le-Sec", "Échirolles", "Sète",
  "Châtillon", "Belfort", "Villefranche-sur-Saône", "Saint-Martin-d'Hères", "La Courneuve", "Blois",
  "Saint-Laurent-du-Maroni", "Saint-Benoît", "Alès", "Le Cannet", "Montélimar", "Romans-sur-Isère",
  "Garges-lès-Gonesse", "Wattrelos", "Talence", "Angoulême", "Douai", "Thionville", "Gap", "Melun",
  "Gagny", "Draguignan", "Bagneux", "Saint-Martin", "Châtellerault", "Rezé", "Arras", "Compiègne",
  "Le Lamentin", "Villepinte", "Chartres", "Saint-Chamond", "Anglet", "Le Port", "Pontault-Combault",
  "Roanne", "Poissy", "Savigny-sur-Orge", "Saint-Joseph", "Saint-Raphaël", "Nevers", "Agen",
  "Montigny-le-Bretonneux", "Athis-Mons", "Villeneuve-Saint-Georges", "Palaiseau", "Thonon-les-Bains",
  "Conflans-Sainte-Honorine", "Saint-Martin-de-Crau", "Franconville", "Saint-Laurent-du-Var",
  "Châtenay-Malabry", "Meyzieu", "Villeneuve-d'Ascq", "L'Haÿ-les-Roses", "Vitrolles", "Bagnolet",
  "Pontoise", "Saint-Médard-en-Jalles", "Montluçon", "Le Perreux-sur-Marne", "Houilles", "Cachan",
  "Sainte-Geneviève-des-Bois", "Saint-Leu", "Le Chesnay-Rocquencourt", "Thiais", "Villeneuve-la-Garenne",
  "Bourg-en-Bresse", "Saint-Cloud", "Sannois", "Saint-Sébastien-sur-Loire", "Brive-la-Gaillarde",
  "La Ciotat", "Bruxelles", "Anvers", "Gand", "Charleroi", "Liège", "Bruges", "Namur", "Louvain",
  "Mons", "Alost", "Malines", "La Louvière", "Hasselt", "Courtrai", "Ostende", "Tournai", "Beveren",
  "Roulers", "Seraing", "Saint-Nicolas", "Mouscron", "Genk", "Dendermonde", "Braine-l'Alleud",
  "Turnhout", "Louvain-la-Neuve", "Heist-op-den-Berg", "Sint-Niklaas", "Arlon", "Wavre", "Londres",
  "Birmingham", "Manchester", "Glasgow", "Liverpool", "Leeds", "Sheffield", "Edimbourg", "Bristol",
  "Cardiff", "Leicester", "Nottingham", "Kingston upon Hull", "Newcastle upon Tyne", "Southampton",
  "Portsmouth", "Brighton", "Plymouth", "Aberdeen", "Derby", "Swansea", "Oxford", "Cambridge",
  "Coventry", "York", "Reading", "Luton", "Milton Keynes", "Preston", "Stoke-on-Trent", "Rome",
  "Milan", "Naples", "Turin", "Palerme", "Gênes", "Bologne", "Florence", "Bari", "Catane", "Venise",
  "Vérone", "Messine", "Padoue", "Trieste", "Brescia", "Tarente", "Parme", "Prato", "Modène",
  "Reggio de Calabre", "Reggio d'Émilie", "Perugia", "Livourne", "Ravenne", "Cagliari", "Foggia",
  "Salerne", "Pescara", "Monza", "Athènes", "Thessalonique", "Patras", "Le Pirée", "Larissa",
  "Héraklion", "Péristeri", "Acharnes", "Kallithéa", "Nikaia", "Glyfáda", "Volos", "Rhodes",
  "Chalandri", "Kavala", "Ioannina", "Chalcis", "Agrinio", "Chania", "Kalamata", "Trikala", "Serres",
  "Alexandroúpoli", "Kateríni", "Lamia", "Komotiní", "Kérkyra", "Xanthi", "Drama", "Veria", "Vienne",
  "Millau", "Rochefort", "Les Sables d'Olonnes", "St Malo", "Orléans", "Auch", "Tulle", "Périgueux",
  "Macon", "Barcelone", "Leuven"
];

// Country mapping for cities
const COUNTRY_MAPPING = {
  // French cities
  'Paris': 'FR', 'Marseille': 'FR', 'Lyon': 'FR', 'Toulouse': 'FR', 'Nice': 'FR',
  'Nantes': 'FR', 'Strasbourg': 'FR', 'Montpellier': 'FR', 'Bordeaux': 'FR',
  'Lille': 'FR', 'Rennes': 'FR', 'Reims': 'FR', 'Le Havre': 'FR',
  'Saint-Étienne': 'FR', 'Toulon': 'FR', 'Grenoble': 'FR', 'Dijon': 'FR',
  'Angers': 'FR', 'Nîmes': 'FR', 'Villeurbanne': 'FR', 'Clermont-Ferrand': 'FR',
  'Le Mans': 'FR', 'Aix-en-Provence': 'FR', 'Brest': 'FR', 'Tours': 'FR',
  'Amiens': 'FR', 'Limoges': 'FR', 'Annecy': 'FR', 'Perpignan': 'FR',
  'Boulogne-Billancourt': 'FR', 'Metz': 'FR', 'Besançon': 'FR', 'Orléans': 'FR',
  'Saint-Denis': 'FR', 'Argenteuil': 'FR', 'Rouen': 'FR', 'Montreuil': 'FR',
  'Mulhouse': 'FR', 'Caen': 'FR', 'Nancy': 'FR', 'Saint-Paul': 'FR',
  'Roubaix': 'FR', 'Tourcoing': 'FR', 'Nanterre': 'FR', 'Vitry-sur-Seine': 'FR',
  'Créteil': 'FR', 'Avignon': 'FR', 'Poitiers': 'FR', 'Dunkerque': 'FR',
  'Aubervilliers': 'FR', 'Versailles': 'FR', 'Courbevoie': 'FR', 'Fort-de-France': 'FR',
  'Colombes': 'FR', 'Asnières-sur-Seine': 'FR', 'Saint-Pierre': 'FR',
  'Cherbourg-en-Cotentin': 'FR', 'Levallois-Perret': 'FR', 'La Rochelle': 'FR',
  'Champigny-sur-Marne': 'FR', 'Antibes': 'FR', 'Calais': 'FR', 'Béziers': 'FR',
  'Boulogne-sur-Mer': 'FR', 'Cannes': 'FR', 'Saint-Nazaire': 'FR', 'Drancy': 'FR',
  'Mérignac': 'FR', 'Ajaccio': 'FR', 'Issy-les-Moulineaux': 'FR', 'Noisy-le-Grand': 'FR',
  'Troyes': 'FR', 'La Seyne-sur-Mer': 'FR', 'Neuilly-sur-Seine': 'FR', 'Cergy': 'FR',
  'Pessac': 'FR', 'Lorient': 'FR', 'Ivry-sur-Seine': 'FR', 'Évry-Courcouronnes': 'FR',
  'Clichy': 'FR', 'Chambéry': 'FR', 'Saint-Maur-des-Fossés': 'FR', 'Niort': 'FR',
  'Bourges': 'FR', 'Vénissieux': 'FR', 'Sarcelles': 'FR', 'Le Blanc-Mesnil': 'FR',
  'Chelles': 'FR', 'Pantin': 'FR', 'Maisons-Alfort': 'FR', 'Fréjus': 'FR',
  'Meaux': 'FR', 'Narbonne': 'FR', 'Hyères': 'FR', 'Saint-Quentin': 'FR',
  'Valence': 'FR', 'Beauvais': 'FR', 'Cholet': 'FR', 'Bondy': 'FR',
  'La Roche-sur-Yon': 'FR', 'Montauban': 'FR', 'Antony': 'FR', 'Épinay-sur-Seine': 'FR',
  'Clamart': 'FR', 'Fontenay-sous-Bois': 'FR', 'Sartrouville': 'FR', 'Sevran': 'FR',
  'Le Tampon': 'FR', 'Quimper': 'FR', 'Villejuif': 'FR', 'Albi': 'FR',
  'Laval': 'FR', 'Arles': 'FR', 'Vannes': 'FR', 'Colmar': 'FR',
  'Vaulx-en-Velin': 'FR', 'Grasse': 'FR', 'Cagnes-sur-Mer': 'FR', 'Suresnes': 'FR',
  'Montrouge': 'FR', 'Martigues': 'FR', 'Saint-Herblain': 'FR', 'Saint-Malo': 'FR',
  'Saint-Brieuc': 'FR', 'Aubagne': 'FR', 'Bobigny': 'FR', 'Carcassonne': 'FR',
  'Chalon-sur-Saône': 'FR', 'Châlons-en-Champagne': 'FR', 'Meudon': 'FR',
  'Bayonne': 'FR', 'Saint-Ouen-sur-Seine': 'FR', 'Massy': 'FR', 'Bastia': 'FR',
  'Salon-de-Provence': 'FR', 'Corbeil-Essonnes': 'FR', 'Saint-Priest': 'FR',
  'Tarbes': 'FR', 'Alfortville': 'FR', 'Rosny-sous-Bois': 'FR', 'Saint-Germain-en-Laye': 'FR',
  'Livry-Gargan': 'FR', 'Pau': 'FR', 'Évreux': 'FR', 'Charleville-Mézières': 'FR',
  'Bron': 'FR', 'Châteauroux': 'FR', 'Mantes-la-Jolie': 'FR', 'Gennevilliers': 'FR',
  'Noisy-le-Sec': 'FR', 'Échirolles': 'FR', 'Sète': 'FR', 'Châtillon': 'FR',
  'Belfort': 'FR', 'Villefranche-sur-Saône': 'FR', 'Saint-Martin-d\'Hères': 'FR',
  'La Courneuve': 'FR', 'Blois': 'FR', 'Saint-Laurent-du-Maroni': 'FR',
  'Saint-Benoît': 'FR', 'Alès': 'FR', 'Le Cannet': 'FR', 'Montélimar': 'FR',
  'Romans-sur-Isère': 'FR', 'Garges-lès-Gonesse': 'FR', 'Wattrelos': 'FR',
  'Talence': 'FR', 'Angoulême': 'FR', 'Douai': 'FR', 'Thionville': 'FR',
  'Gap': 'FR', 'Melun': 'FR', 'Gagny': 'FR', 'Draguignan': 'FR',
  'Bagneux': 'FR', 'Saint-Martin': 'FR', 'Châtellerault': 'FR', 'Rezé': 'FR',
  'Arras': 'FR', 'Compiègne': 'FR', 'Le Lamentin': 'FR', 'Villepinte': 'FR',
  'Chartres': 'FR', 'Saint-Chamond': 'FR', 'Anglet': 'FR', 'Le Port': 'FR',
  'Pontault-Combault': 'FR', 'Roanne': 'FR', 'Poissy': 'FR', 'Savigny-sur-Orge': 'FR',
  'Saint-Joseph': 'FR', 'Saint-Raphaël': 'FR', 'Nevers': 'FR', 'Agen': 'FR',
  'Montigny-le-Bretonneux': 'FR', 'Athis-Mons': 'FR', 'Villeneuve-Saint-Georges': 'FR',
  'Palaiseau': 'FR', 'Thonon-les-Bains': 'FR', 'Conflans-Sainte-Honorine': 'FR',
  'Saint-Martin-de-Crau': 'FR', 'Franconville': 'FR', 'Saint-Laurent-du-Var': 'FR',
  'Châtenay-Malabry': 'FR', 'Meyzieu': 'FR', 'Villeneuve-d\'Ascq': 'FR',
  'L\'Haÿ-les-Roses': 'FR', 'Vitrolles': 'FR', 'Bagnolet': 'FR', 'Pontoise': 'FR',
  'Saint-Médard-en-Jalles': 'FR', 'Montluçon': 'FR', 'Le Perreux-sur-Marne': 'FR',
  'Houilles': 'FR', 'Cachan': 'FR', 'Sainte-Geneviève-des-Bois': 'FR',
  'Saint-Leu': 'FR', 'Le Chesnay-Rocquencourt': 'FR', 'Thiais': 'FR',
  'Villeneuve-la-Garenne': 'FR', 'Bourg-en-Bresse': 'FR', 'Saint-Cloud': 'FR',
  'Sannois': 'FR', 'Saint-Sébastien-sur-Loire': 'FR', 'Brive-la-Gaillarde': 'FR',
  'La Ciotat': 'FR', 'Vienne': 'FR', 'Millau': 'FR', 'Rochefort': 'FR',
  'Les Sables d\'Olonnes': 'FR', 'St Malo': 'FR', 'Orléans': 'FR', 'Auch': 'FR',
  'Tulle': 'FR', 'Périgueux': 'FR', 'Macon': 'FR', 'Barcelone': 'FR',
  'Leuven': 'FR',
  
  // Belgian cities
  'Bruxelles': 'BE', 'Anvers': 'BE', 'Gand': 'BE', 'Charleroi': 'BE', 'Liège': 'BE',
  'Bruges': 'BE', 'Namur': 'BE', 'Louvain': 'BE', 'Mons': 'BE', 'Alost': 'BE',
  'Malines': 'BE', 'La Louvière': 'BE', 'Hasselt': 'BE', 'Courtrai': 'BE',
  'Ostende': 'BE', 'Tournai': 'BE', 'Beveren': 'BE', 'Roulers': 'BE',
  'Seraing': 'BE', 'Saint-Nicolas': 'BE', 'Mouscron': 'BE', 'Genk': 'BE',
  'Dendermonde': 'BE', 'Braine-l\'Alleud': 'BE', 'Turnhout': 'BE',
  'Louvain-la-Neuve': 'BE', 'Heist-op-den-Berg': 'BE', 'Sint-Niklaas': 'BE',
  'Arlon': 'BE', 'Wavre': 'BE',
  
  // UK cities
  'Londres': 'UK', 'Birmingham': 'UK', 'Manchester': 'UK', 'Glasgow': 'UK',
  'Liverpool': 'UK', 'Leeds': 'UK', 'Sheffield': 'UK', 'Edimbourg': 'UK',
  'Bristol': 'UK', 'Cardiff': 'UK', 'Leicester': 'UK', 'Nottingham': 'UK',
  'Kingston upon Hull': 'UK', 'Newcastle upon Tyne': 'UK', 'Southampton': 'UK',
  'Portsmouth': 'UK', 'Brighton': 'UK', 'Plymouth': 'UK', 'Aberdeen': 'UK',
  'Derby': 'UK', 'Swansea': 'UK', 'Oxford': 'UK', 'Cambridge': 'UK',
  'Coventry': 'UK', 'York': 'UK', 'Reading': 'UK', 'Luton': 'UK',
  'Milton Keynes': 'UK', 'Preston': 'UK', 'Stoke-on-Trent': 'UK',
  
  // Italian cities
  'Rome': 'IT', 'Milan': 'IT', 'Naples': 'IT', 'Turin': 'IT', 'Palerme': 'IT',
  'Gênes': 'IT', 'Bologne': 'IT', 'Florence': 'IT', 'Bari': 'IT', 'Catane': 'IT',
  'Venise': 'IT', 'Vérone': 'IT', 'Messine': 'IT', 'Padoue': 'IT', 'Trieste': 'IT',
  'Brescia': 'IT', 'Tarente': 'IT', 'Parme': 'IT', 'Prato': 'IT', 'Modène': 'IT',
  'Reggio de Calabre': 'IT', 'Reggio d\'Émilie': 'IT', 'Perugia': 'IT',
  'Livourne': 'IT', 'Ravenne': 'IT', 'Cagliari': 'IT', 'Foggia': 'IT',
  'Salerne': 'IT', 'Pescara': 'IT', 'Monza': 'IT',
  
  // Greek cities
  'Athènes': 'GR', 'Thessalonique': 'GR', 'Patras': 'GR', 'Le Pirée': 'GR',
  'Larissa': 'GR', 'Héraklion': 'GR', 'Péristeri': 'GR', 'Acharnes': 'GR',
  'Kallithéa': 'GR', 'Nikaia': 'GR', 'Glyfáda': 'GR', 'Volos': 'GR',
  'Rhodes': 'GR', 'Chalandri': 'GR', 'Kavala': 'GR', 'Ioannina': 'GR',
  'Chalcis': 'GR', 'Agrinio': 'GR', 'Chania': 'GR', 'Kalamata': 'GR',
  'Trikala': 'GR', 'Serres': 'GR', 'Alexandroúpoli': 'GR', 'Kateríni': 'GR',
  'Lamia': 'GR', 'Komotiní': 'GR', 'Kérkyra': 'GR', 'Xanthi': 'GR',
  'Drama': 'GR', 'Veria': 'GR',
  
  // Spanish cities
  'Barcelone': 'ES'
};

/**
 * Create a standardized city document structure
 * @param {string} cityName - Name of the city
 * @param {string} countryId - Country ID (FR, BE, UK, IT, GR, ES)
 * @returns {Object} Standardized city document
 */
const createCityDocument = (cityName, countryId) => {
  const now = new Date().toISOString();
  
  return {
    name: {
      fr: cityName,
      en: cityName,
      es: cityName,
      it: cityName
    },
    country_id: countryId,
    coordinates: {
      latitude: null,
      longitude: null
    },
    geohash: null,
    postal_codes: [],
    is_active: true,
    created_at: now,
    updated_at: now,
    migrated: true
  };
};

/**
 * Check if cities migration is needed
 * @returns {Promise<boolean>} True if migration is needed
 */
export const isMigrationNeeded = async () => {
  try {
    const citiesRef = collection(firestore, 'cities');
    const snapshot = await getDocs(citiesRef);
    return snapshot.docs.length === 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
};

/**
 * Migrate cities data to Firestore
 * @returns {Promise<Object>} Migration result
 */
export const migrateCities = async () => {
  try {
    console.log('🚀 Starting cities migration...');
    
    // Check if migration is needed
    const needsMigration = await isMigrationNeeded();
    if (!needsMigration) {
      console.log('✅ Cities already migrated');
      return { success: true, message: 'Cities already migrated' };
    }
    
    const citiesRef = collection(firestore, 'cities');
    let successCount = 0;
    let errorCount = 0;
    
    for (const cityName of CITIES_DATA) {
      try {
        const countryId = COUNTRY_MAPPING[cityName] || 'FR';
        const cityData = createCityDocument(cityName, countryId);
        
        await addDoc(citiesRef, cityData);
        successCount++;
        
        if (successCount % 50 === 0) {
          console.log(`✅ Migrated ${successCount} cities...`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error migrating city ${cityName}:`, error.message);
      }
    }
    
    console.log(`🎉 Migration completed!`);
    console.log(`✅ Successfully migrated: ${successCount} cities`);
    console.log(`❌ Errors: ${errorCount} cities`);
    
    return {
      success: true,
      message: 'Migration completed',
      stats: { successCount, errorCount }
    };
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Run migration if needed
 * @returns {Promise<Object>} Migration result
 */
export const runCitiesMigration = async () => {
  const needsMigration = await isMigrationNeeded();
  
  if (needsMigration) {
    console.log('🔄 Cities migration needed, starting...');
    return await migrateCities();
  } else {
    console.log('✅ Cities migration not needed');
    return { success: true, message: 'Migration not needed' };
  }
};

// Auto-run migration if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runCitiesMigration();
}
