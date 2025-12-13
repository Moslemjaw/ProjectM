import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Instead of trying to replace existing text, let's create a new template from scratch
// by opening the original and using docxtemplater's modules

const templatePath = path.join(__dirname, 'templates/evaluation_template.docx');
const content = fs.readFileSync(templatePath, 'binary');

const zip = new PizZip(content);

// Get the document XML
let documentXml = zip.files['word/document.xml'].asText();

console.log('Analyzing template structure...\n');

// The issue is that Word splits text across multiple <w:t> tags
// We need to merge consecutive text runs first

// Function to merge consecutive <w:t> tags
function mergeTextRuns(xml) {
  // This regex finds patterns like </w:t></w:r><w:r><w:t> and merges them
  const merged = xml.replace(/<\/w:t><\/w:r><w:r[^>]*><w:t[^>]*>/g, '');
  return merged;
}

// Merge text runs first
documentXml = mergeTextRuns(documentXml);

console.log('Text runs merged. Now replacing with placeholders...\n');

// Now do the replacements
documentXml = documentXml.replace(/9217453e-024f-4d6e-8a33-0d27257e3401/g, '{{projectId}}');
documentXml = documentXml.replace(/AI Research Project Low Budget - 1761130043521/g, '{{projectTitle}}');

// For the scores and comments, we need to be more careful
// Let's use a more targeted approach for the evaluation table

// Replace "reviewer 1" with {{reviewerName}}
documentXml = documentXml.replace(/reviewer\s+1/gi, '{{reviewerName}}');
documentXml = documentXml.replace(/reviewer1@test\.com/g, '{{reviewerEmail}}');
documentXml = documentXml.replace(/\[Digital signature captured\]/g, '{{signatureText}}');

// For scores, we'll replace them in sequence
let scoreCount = 0;
documentXml = documentXml.replace(/(<w:t[^>]*>)\s*(\d+)\s*(<\/w:t>)/g, (match, opening, number, closing) => {
  // Only replace if it's a likely score (0-10)
  const num = parseInt(number);
  if (num >= 0 && num <= 10 && scoreCount < 6) {
    scoreCount++;
    return `${opening}{{score${scoreCount}}}${closing}`;
  }
  return match;
});

// For comments, look for common patterns
const commentPatterns = ['ad', 'sc', 'scs', 'czc', 'cac'];
let commentIndex = 0;
commentPatterns.forEach((pattern) => {
  commentIndex++;
  const regex = new RegExp(`(<w:t[^>]*>)${pattern}(<\/w:t>)`, 'g');
  documentXml = documentXml.replace(regex, `$1{{comment${commentIndex}}}$2`);
});

// Replace total score (42)
documentXml = documentXml.replace(/(<w:t[^>]*>)42(<\/w:t>)/g, '$1{{totalScore}}$2');

// For empty cells (reviewer metadata), add placeholders
// These are trickier since they're empty
documentXml = documentXml.replace(
  /(Designation<\/w:t>[\s\S]{0,200}?<w:t[^>]*>)(<\/w:t>)/,
  '$1{{reviewerDesignation}}$2'
);

documentXml = documentXml.replace(
  /(Organization<\/w:t>[\s\S]{0,200}?<w:t[^>]*>)(<\/w:t>)/,
  '$1{{reviewerOrganization}}$2'
);

documentXml = documentXml.replace(
  /(Discipline<\/w:t>[\s\S]{0,200}?<w:t[^>]*>)(<\/w:t>)/,
  '$1{{reviewerDiscipline}}$2'
);

documentXml = documentXml.replace(
  /(Phone<\/w:t>[\s\S]{0,200}?<w:t[^>]*>)(<\/w:t>)/,
  '$1{{reviewerPhone}}$2'
);

// Save the modified template
zip.file('word/document.xml', documentXml);
const buf = zip.generate({ type: 'nodebuffer' });

const outputPath = path.join(__dirname, 'templates/evaluation_template_filled.docx');
fs.writeFileSync(outputPath, buf);

// Verify placeholders were added
const verifyZip = new PizZip(buf);
const verifyXml = verifyZip.files['word/document.xml'].asText();
const placeholders = verifyXml.match(/{{[^}]+}}/g) || [];

console.log('✅ Template saved to:', outputPath);
console.log('\nPlaceholders found:', placeholders.length);
console.log('Unique placeholders:', [...new Set(placeholders)].join(', '));
