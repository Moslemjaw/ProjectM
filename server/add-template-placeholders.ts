import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

// Read the template
const templatePath = path.join(process.cwd(), 'server/templates/evaluation_template.docx');
const content = fs.readFileSync(templatePath, 'binary');

const zip = new PizZip(content);
const doc = new Docxtemplater(zip, {
  paragraphLoop: true,
  linebreaks: true,
});

// Extract the XML to add placeholders manually
const documentXml = zip.files['word/document.xml'].asText();

// Replace static content with placeholders
let modifiedXml = documentXml;

// Project Information placeholders
modifiedXml = modifiedXml.replace(
  /(<w:t>)(9217453e-024f-4d6e-8a33-0d27257e3401)(<\/w:t>)/g,
  '$1{{project.id}}$3'
);
modifiedXml = modifiedXml.replace(
  /(<w:t>)(AI Research Project Low Budget - 1761130043521)(<\/w:t>)/g,
  '$1{{project.title}}$3'
);

// Criteria scores and comments - we need to find and replace the score/comment cells
// This is tricky because we need to identify the exact cells in the evaluation table

// For now, let's create a simpler approach - add placeholders in the template manually
console.log('Template extracted. You need to manually add placeholders.');
console.log('Placeholders needed:');
console.log('- {{project.id}}');
console.log('- {{project.title}}');
console.log('- {{criteria.backgroundIntroduction}}');
console.log('- {{criteriaComments.backgroundIntroduction}}');
console.log('- {{criteria.noveltyOriginality}}');
console.log('- {{criteriaComments.noveltyOriginality}}');
console.log('- {{criteria.clearObjectives}}');
console.log('- {{criteriaComments.clearObjectives}}');
console.log('- {{criteria.disseminationResults}}');
console.log('- {{criteriaComments.disseminationResults}}');
console.log('- {{criteria.significance}}');
console.log('- {{criteriaComments.significance}}');
console.log('- {{criteria.feasibilityPlanning}}');
console.log('- {{criteriaComments.feasibilityPlanning}}');
console.log('- {{totalScore}}');
console.log('- {{reviewer.name}}');
console.log('- {{reviewer.designation}}');
console.log('- {{reviewer.organization}}');
console.log('- {{reviewer.discipline}}');
console.log('- {{reviewer.phone}}');
console.log('- {{reviewer.email}}');
console.log('- {{signatureText}}');

// Save the modified XML back
zip.file('word/document.xml', modifiedXml);
const buf = zip.generate({ type: 'nodebuffer' });

const outputPath = path.join(process.cwd(), 'server/templates/evaluation_template_with_placeholders.docx');
fs.writeFileSync(outputPath, buf);

console.log('\nTemplate with initial placeholders saved to:', outputPath);
console.log('You may need to manually edit this file to add remaining placeholders.');
