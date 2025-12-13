import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the template
const templatePath = path.join(__dirname, 'templates/evaluation_template.docx');
const content = fs.readFileSync(templatePath, 'binary');

const zip = new PizZip(content);

// Get the document XML
let documentXml = zip.files['word/document.xml'].asText();

console.log('Original template loaded. Adding placeholders...\n');

// Replace project ID
documentXml = documentXml.replace(
  /9217453e-024f-4d6e-8a33-0d27257e3401/g,
  '{{projectId}}'
);

// Replace project title
documentXml = documentXml.replace(
  /AI Research Project Low Budget - 1761130043521/g,
  '{{projectTitle}}'
);

// Extract and modify the evaluation table section
const tableStart = documentXml.indexOf('External Reviewer Evaluation Report');
const tableEnd = documentXml.indexOf('Overall Evaluator Score');

if (tableStart > 0 && tableEnd > tableStart) {
  let tableSection = documentXml.substring(tableStart, tableEnd);
  let beforeTable = documentXml.substring(0, tableStart);
  let afterTable = documentXml.substring(tableEnd);
  
  // Replace scores and comments in sequence
  tableSection = tableSection
    .replace(/(<w:t>)5(<\/w:t>)/, '$1{{score1}}$2')  // First 5
    .replace(/(<w:t>)ad(<\/w:t>)/, '$1{{comment1}}$2')  // First comment
    .replace(/(<w:t>)5(<\/w:t>)/, '$1{{score2}}$2')  // Second 5
    .replace(/(<w:t>)sc(<\/w:t>)/, '$1{{comment2}}$2')  // Second comment
    .replace(/(<w:t>)7(<\/w:t>)/, '$1{{score3}}$2')  // 7
    .replace(/(<w:t>)scs(<\/w:t>)/, '$1{{comment3}}$2')  // Third comment
    .replace(/(<w:t>)10(<\/w:t>)/, '$1{{score4}}$2')  // First 10
    .replace(/(<w:t>)czc(<\/w:t>)/, '$1{{comment4}}$2')  // Fourth comment
    .replace(/(<w:t>)10(<\/w:t>)/, '$1{{score5}}$2')  // Second 10
    .replace(/(<w:t>)czc(<\/w:t>)/, '$1{{comment5}}$2')  // Fifth comment
    .replace(/(<w:t>)5(<\/w:t>)/, '$1{{score6}}$2')  // Third 5
    .replace(/(<w:t>)cac(<\/w:t>)/, '$1{{comment6}}$2');  // Sixth comment
  
  documentXml = beforeTable + tableSection + afterTable;
}

// Replace total score (42)
documentXml = documentXml.replace(
  /(<w:t>)42(<\/w:t>)/,
  '$1{{totalScore}}$2'
);

// Replace reviewer information
documentXml = documentXml.replace(
  /reviewer 1/g,
  '{{reviewerName}}'
);

documentXml = documentXml.replace(
  /reviewer1@test\.com/g,
  '{{reviewerEmail}}'
);

// Replace signature text
documentXml = documentXml.replace(
  /\[Digital signature captured\]/g,
  '{{signatureText}}'
);

// For empty fields (designation, organization, discipline, phone),
// we need to add placeholders in empty <w:t></w:t> tags that follow the field labels

// Find the reviewer information section
const reviewerInfoStart = documentXml.indexOf('Reviewer Information');
if (reviewerInfoStart > 0) {
  const reviewerSection = documentXml.substring(reviewerInfoStart);
  const sectionEnd = reviewerInfoStart + 10000; // Reasonable section size
  let reviewerPart = documentXml.substring(reviewerInfoStart, sectionEnd);
  
  // Add placeholders in empty cells
  // Pattern: After "Designation" label, there's an empty cell - add placeholder there
  reviewerPart = reviewerPart.replace(
    /(Designation<\/w:t>.*?<w:t>)(<\/w:t>)/,
    '$1{{reviewerDesignation}}$2'
  );
  
  reviewerPart = reviewerPart.replace(
    /(Organization<\/w:t>.*?<w:t>)(<\/w:t>)/,
    '$1{{reviewerOrganization}}$2'
  );
  
  reviewerPart = reviewerPart.replace(
    /(Discipline<\/w:t>.*?<w:t>)(<\/w:t>)/,
    '$1{{reviewerDiscipline}}$2'
  );
  
  reviewerPart = reviewerPart.replace(
    /(Phone<\/w:t>.*?<w:t>)(<\/w:t>)/,
    '$1{{reviewerPhone}}$2'
  );
  
  documentXml = documentXml.substring(0, reviewerInfoStart) + reviewerPart + documentXml.substring(sectionEnd);
}

// Save the modified template
zip.file('word/document.xml', documentXml);
const buf = zip.generate({ type: 'nodebuffer' });

const outputPath = path.join(__dirname, 'templates/evaluation_template_filled.docx');
fs.writeFileSync(outputPath, buf);

console.log('✅ Template with placeholders saved to:', outputPath);
console.log('\nAll placeholders added successfully:');
console.log('- {{projectId}}');
console.log('- {{projectTitle}}');
console.log('- {{score1}} through {{score6}}');
console.log('- {{comment1}} through {{comment6}}');
console.log('- {{totalScore}}');
console.log('- {{reviewerName}}');
console.log('- {{reviewerEmail}}');
console.log('- {{reviewerDesignation}}');
console.log('- {{reviewerOrganization}}');
console.log('- {{reviewerDiscipline}}');
console.log('- {{reviewerPhone}}');
console.log('- {{signatureText}}');
