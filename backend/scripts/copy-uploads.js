const fs = require('fs');
const path = require('path');

// Créer le dossier uploads source s'il n'existe pas
const sourceDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(sourceDir)) {
  fs.mkdirSync(sourceDir, { recursive: true });
  console.log('Dossier uploads source créé');
}

// Copier le dossier uploads dans dist après build
const targetDir = path.join(__dirname, '../dist/uploads');

console.log('Copie du dossier uploads vers dist...');

// Créer le dossier target s'il n'existe pas
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copier tous les fichiers du dossier uploads
if (fs.existsSync(sourceDir)) {
  const files = fs.readdirSync(sourceDir);
  files.forEach(file => {
    const sourcePath = path.join(sourceDir, file);
    const targetPath = path.join(targetDir, file);
    
    // Copier le fichier
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`Fichier copié: ${file}`);
  });
  
  console.log(`${files.length} fichiers copiés avec succès`);
} else {
  console.log('Dossier uploads source non trouvé, création du dossier vide');
}
