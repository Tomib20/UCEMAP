const data = require('./data/carreras/ingenieria-informatica.json');

console.log('=== DETAILED DATA STRUCTURE ANALYSIS ===\n');

// Check for duplicate nro values
const nroSet = new Set();
const duplicates = [];
data.materias.forEach(m => {
  if (nroSet.has(m.nro)) {
    duplicates.push(m.nro);
  }
  nroSet.add(m.nro);
});

if (duplicates.length === 0) {
  console.log('✓ No duplicate materia nro values found');
} else {
  console.log(`✗ Found ${duplicates.length} duplicate nro values: ${duplicates.join(', ')}`);
}

// Check materias distribution by year
console.log('\n=== MATERIAS DISTRIBUTION BY YEAR ===');
const byYear = {};
data.materias.forEach(m => {
  if (!byYear[m.anio]) byYear[m.anio] = { c1: 0, c2: 0, total: 0 };
  byYear[m.anio][`c${m.cuatrimestre}`]++;
  byYear[m.anio].total++;
});

Object.keys(byYear).sort((a, b) => parseInt(a) - parseInt(b)).forEach(year => {
  const stats = byYear[year];
  console.log(`Year ${year}: ${stats.c1} (Q1) + ${stats.c2} (Q2) = ${stats.total} total`);
});

// Check for missing required fields
console.log('\n=== DATA QUALITY CHECKS ===');
let missingFields = [];
data.materias.forEach(m => {
  if (!m.nro) missingFields.push(`${m.nombre}: missing nro`);
  if (!m.nombre) missingFields.push(`nro ${m.nro}: missing nombre`);
  if (m.anio === undefined || m.anio === null) missingFields.push(`${m.nro}: missing anio`);
  if (m.cuatrimestre === undefined || m.cuatrimestre === null) missingFields.push(`${m.nro}: missing cuatrimestre`);
  if (!m.grupo) missingFields.push(`${m.nro}: missing grupo`);
  if (!Array.isArray(m.correlativas)) missingFields.push(`${m.nro}: correlativas is not an array`);
});

if (missingFields.length === 0) {
  console.log('✓ All required fields present in all materias');
} else {
  console.log(`✗ Found ${missingFields.length} missing field issues:`);
  missingFields.forEach(issue => console.log(`  - ${issue}`));
}

// Check for invalid anio values
const validAnios = new Set([1, 2, 3, 4, 5]);
const invalidAnios = data.materias.filter(m => !validAnios.has(m.anio));
if (invalidAnios.length === 0) {
  console.log('✓ All anio values are valid (1-5)');
} else {
  console.log(`✗ Found ${invalidAnios.length} invalid anio values`);
}

// Check for invalid cuatrimestre values
const validCuatrimestres = new Set([1, 2]);
const invalidCuatrimestres = data.materias.filter(m => !validCuatrimestres.has(m.cuatrimestre));
if (invalidCuatrimestres.length === 0) {
  console.log('✓ All cuatrimestre values are valid (1-2)');
} else {
  console.log(`✗ Found ${invalidCuatrimestres.length} invalid cuatrimestre values`);
}

// Check creditos
console.log('\n=== CREDITOS VERIFICATION ===');
const creditosSet = new Set();
data.materias.forEach(m => creditosSet.add(m.creditos));
console.log(`Unique creditos values: ${Array.from(creditosSet).sort().join(', ')}`);

