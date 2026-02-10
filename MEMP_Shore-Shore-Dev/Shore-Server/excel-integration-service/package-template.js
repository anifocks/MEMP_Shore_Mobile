// Node.js script to replace {{BASE_URL}} in manifest.template.xml and zip manifest.xml + Excel template
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

if (process.argv.length < 5) {
  console.log('Usage: node package-template.js <BASE_URL> <ExcelTemplatePath> <OutputZipPath>');
  process.exit(1);
}

const BASE_URL = process.argv[2];
const excelTemplatePath = process.argv[3];
const outputZipPath = process.argv[4];

const templatePath = path.join(__dirname, 'manifest.template.xml');
const manifestPath = path.join(__dirname, 'manifest.xml');

let manifest = fs.readFileSync(templatePath, 'utf8');
manifest = manifest.replace(/{{BASE_URL}}/g, BASE_URL);
fs.writeFileSync(manifestPath, manifest);

const output = fs.createWriteStream(outputZipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function () {
  console.log(`Created ${outputZipPath} (${archive.pointer()} total bytes)`);
});

archive.on('error', function(err){
  throw err;
});

archive.pipe(output);
archive.file(manifestPath, { name: 'manifest.xml' });
archive.file(excelTemplatePath, { name: path.basename(excelTemplatePath) });
archive.finalize();
