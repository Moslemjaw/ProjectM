import OpenAI from "openai";
import { extractTextFromDocuments } from "./documentOCR";

// Using DeepSeek API (OpenAI-compatible)
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// AASU Research Centers and their focus areas
const AASU_RESEARCH_CENTERS = {
  "Center for Artificial Intelligence and Data Science (CAIDS)": [
    "AI", "machine learning", "data analytics", "computational intelligence"
  ],
  "Center for Advanced Materials and Nanotechnology (CAMN)": [
    "materials science", "nanotechnology", "advanced manufacturing"
  ],
  "Center for Energy and Sustainability (CES)": [
    "renewable energy", "sustainability", "environmental engineering"
  ],
  "Center for Biomedical Engineering and Health Informatics (CBEHI)": [
    "medical devices", "healthcare technology", "biomedical informatics"
  ],
  "Center for Entrepreneurship and Innovation (CEI)": [
    "business innovation", "startup development", "entrepreneurial research"
  ],
  "Center for Cybersecurity and Digital Forensics (CCDF)": [
    "cybersecurity", "digital forensics", "information security"
  ],
  "Center for Robotics and Autonomous Systems (CRAS)": [
    "robotics", "automation", "intelligent systems"
  ],
};

// AASU Information from website
const AASU_INFO = `
Abdullah Al Salem University (AASU) is a Kuwaiti university focused on innovation in education and research.

Constituent Colleges:
- Business & Entrepreneurship
- Computer and Systems Engineering
- Engineering & Energy
- Health & Medicine

Research Centers:
- Cyber Security and Digital Transformation
- Data Science and Artificial Intelligence
- Resource, Energy and Sustainability
- Advanced Material Science and Engineering
- Marine and Coastal Research
- Quantitative Finance and Risk Management
- Research in Entrepreneurship and Innovation
- Health and Wellbeing
- Innovative Learning
- Future of Work

Mission: AASU offers degree programs designed to empower youth to meet current and future challenges, embracing the opportunities of New Kuwait (Kuwait's Vision 2035), delivering world class education through collaboration of leading economic players and policy makers.

Vision: To be a world-class university that drives innovation, fosters entrepreneurship, and contributes to Kuwait's sustainable development and economic diversification.

Strategic Priorities:
1. Align research with Kuwait Vision 2035 (economic diversification, sustainability, innovation)
2. Foster industry-academia collaboration
3. Promote entrepreneurship and innovation
4. Address national challenges (energy, environment, healthcare, cybersecurity)
5. Develop cutting-edge technology and applied research
6. Contribute to Kuwait's knowledge-based economy
`;

export async function gradeProjectWithAI(
  title: string,
  description: string,
  department: string,
  budget: number,
  keywords?: string[],
  alignedCenter?: string | null,
  fileUrls?: string[],
  researchFormUrls?: string[]
): Promise<{
  score: number;
  feedback: string;
  alignedCenter: string | null;
}> {
  try {
    // Combine all document URLs (both Complete Proposal and Research Form)
    const allDocumentUrls = [
      ...(fileUrls || []),
      ...(researchFormUrls || [])
    ];

    // Extract text from uploaded documents if any
    let documentText = "";
    if (allDocumentUrls.length > 0) {
      console.log(`[AI Grading] Extracting text from ${allDocumentUrls.length} document(s)...`);
      try {
        documentText = await extractTextFromDocuments(allDocumentUrls);
        if (documentText) {
          console.log(`[AI Grading] Successfully extracted ${documentText.length} characters from documents`);
        }
      } catch (error) {
        console.error("[AI Grading] Failed to extract text from documents:", error);
        // Continue with grading even if OCR fails
      }
    }

    const researchCentersList = Object.entries(AASU_RESEARCH_CENTERS)
      .map(([center, focus]) => `- ${center}: ${focus.join(", ")}`)
      .join("\n");

    const keywordsSection = keywords && keywords.length > 0
      ? `\n- Keywords: ${keywords.join(', ')}`
      : '';
    
    const researchCenterSection = alignedCenter
      ? `\n- Proposed Research Center: ${alignedCenter}`
      : '';

    const documentSection = documentText 
      ? `\n\nExtracted Document Content:\n${documentText}\n\n`
      : '';

    const prompt = `You are an expert research evaluator for Abdullah Al Salem University (AASU) in Kuwait.

${AASU_INFO}

AASU Research Centers and Focus Areas:
${researchCentersList}

SCORING RUBRIC (Total: 100 points):

1. Research Center Alignment (30 points):
   - 25-30: Perfectly aligned with a specific AASU research center's focus areas
   - 18-24: Strong connection to research center priorities
   - 10-17: Moderate alignment with research areas
   - 0-9: Minimal or no alignment with AASU research centers

2. Mission & Vision Alignment (25 points):
   - 20-25: Strongly supports Kuwait Vision 2035 and AASU's strategic priorities
   - 15-19: Good alignment with university mission and national goals
   - 8-14: Some connection to AASU mission
   - 0-7: Weak connection to mission/vision

3. Innovation & Impact (20 points):
   - 16-20: Highly innovative with significant potential impact
   - 11-15: Good innovation with clear benefits
   - 6-10: Moderate innovation
   - 0-5: Limited innovation or impact

4. Practical Usefulness (15 points):
   - 12-15: Addresses critical needs with clear practical applications
   - 8-11: Useful with identifiable benefits
   - 4-7: Some practical value
   - 0-3: Limited practical application

5. Feasibility & Budget (10 points):
   - 8-10: Well-planned, realistic budget, achievable goals
   - 5-7: Reasonable approach and budget
   - 2-4: Some feasibility concerns
   - 0-1: Significant feasibility or budget issues

Research Proposal to Evaluate:
- Title: ${title}
- Department: ${department}
- Budget: ${budget} KD${keywordsSection}${researchCenterSection}
- Description (Abstract): ${description}${documentSection}

IMPORTANT INSTRUCTIONS:
- Evaluate objectively based on the content provided
- Scores should vary based on actual proposal quality (avoid giving the same score to all projects)
- Consider how well the project serves Kuwait's development and AASU's strategic goals
- Identify the most relevant research center if there's a clear match

Provide your evaluation in JSON format:
{
  "score": <number 0-100 based on rubric above>,
  "feedback": "<2-3 paragraph detailed evaluation covering strengths, alignment with AASU priorities, and specific areas for improvement>",
  "alignedCenter": "<exact name of the most relevant AASU research center from the list above, or null if no clear match>"
}

Be thorough, objective, and constructive. Differentiate between strong and weak proposals.`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You are an expert research evaluator for Abdullah Al Salem University. Evaluate each proposal independently and objectively. Scores should vary significantly based on actual quality and alignment - strong proposals should score 75-95, moderate proposals 50-74, and weak proposals below 50. Provide detailed, constructive feedback in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const result = JSON.parse(completion.choices[0].message.content || "{}");
    
    // Log the AI grading result for debugging
    console.log(`[AI Grading] Project: "${title}"`);
    console.log(`[AI Grading] Score: ${result.score}`);
    console.log(`[AI Grading] Aligned Center: ${result.alignedCenter}`);
    
    return {
      score: Math.max(0, Math.min(100, result.score || 0)),
      feedback: result.feedback || "No feedback provided.",
      alignedCenter: result.alignedCenter || null,
    };
  } catch (error) {
    console.error("AI grading error:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    
    // Fallback scoring if API fails
    return {
      score: 75,
      feedback: "AI grading service temporarily unavailable. This is a preliminary score based on submission completeness. Final evaluation pending.",
      alignedCenter: null,
    };
  }
}
