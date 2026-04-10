const data = require('./data/carreras/ingenieria-informatica.json');

// Create a map of all materia nros
const materiaMap = {};
data.materias.forEach(m => {
  materiaMap[m.nro] = m.nombre;
});

// Group materias by grupo
const groups = {};
data.materias.forEach(m => {
  if (!groups[m.grupo]) groups[m.grupo] = [];
  groups[m.grupo].push({ nro: m.nro, nombre: m.nombre });
});

// Check for orphan correlativa references
const orphanReferences = [];
const correlativaMap = {};

data.materias.forEach(m => {
  if (m.correlativas && Array.isArray(m.correlativas)) {
    m.correlativas.forEach(corrNro => {
      if (!materiaMap[corrNro]) {
        orphanReferences.push({
          materia: `${m.nro} - ${m.nombre}`,
          orphanNro: corrNro
        });
      }
      // Track all correlativa references
      if (!correlativaMap[corrNro]) {
        correlativaMap[corrNro] = [];
      }
      correlativaMap[corrNro].push(`${m.nro} - ${m.nombre}`);
    });
  }
});

console.log('=== MATERIAS COUNT BY GROUP ===');
Object.keys(groups).sort().forEach(grupo => {
  console.log(`${grupo}: ${groups[grupo].length} materias`);
});

console.log('\n=== TOTAL MATERIAS ===');
console.log(`Total: ${data.materias.length} materias`);

console.log('\n=== SCHEMA CONSISTENCY ===');
console.log(`Schema expects "id" property, but data uses "nro" property`);
console.log(`Schema expects "correlativas" as array of strings, but data has array of numbers`);

if (orphanReferences.length === 0) {
  console.log('\n=== CORRELATIVA REFERENCES VALIDATION ===');
  console.log('✓ All correlativa references are valid (no orphan references found)');
} else {
  console.log('\n=== ORPHAN CORRELATIVE REFERENCES FOUND ===');
  orphanReferences.forEach(ref => {
    console.log(`  - ${ref.materia} references nonexistent materia nro: ${ref.orphanNro}`);
  });
}

console.log('\n=== MATERIAS BY CORRELATIVE STRENGTH ===');
const sortedCorrelatives = Object.entries(correlativaMap)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 10);

sortedCorrelatives.forEach(([nro, deps]) => {
  const materia = materiaMap[nro];
  console.log(`  ${nro} (${materia}): ${deps.length} dependencies`);
});
