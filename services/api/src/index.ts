import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  identifyLikeliesCompanyUrl,
  scrapeWebsite,
  scrapeWebsiteBySitemap,
  identifyLikeliesCompanyFonectaFinderUrl,
} from "./modules/scraper";
import { makeVectorStore } from "./modules/store";
import { askGPTWithRAG, askGPT } from "./modules/openai";
import { FaissStore } from "langchain/vectorstores/faiss";

dotenv.config();

const app = express();
const port = 3000;

// Enable CORS for frontend service
app.use(
  cors({
    origin: "http://localhost:8000", // URL of your frontend service
  })
);

// Hello World endpoint
app.get("/hello", (req, res) => {
  res.send("Hello World!");
});

var VECTOR_STORE: FaissStore | undefined = undefined;

interface ContactDetails {
  name: string;
  title?: string;
  cellphone?: string;
  email?: string;
}

const extractJSONFromString = (text: string): any => {
  // Regular expression to find a JSON object
  const jsonPattern = /{.*?}/gs;
  const matches = text.match(jsonPattern);

  if (matches && matches.length > 0) {
    // Assuming the first match is the desired JSON
    const jsonString = matches[0].replace(/'/g, '"');

    try {
      const jsonObject = JSON.parse(jsonString);
      return jsonObject;
    } catch (error) {
      console.error("Error parsing JSON:", error);
      return null;
    }
  }

  return null;
};

app.post("/company/details", async (req, res) => {
  const companyName = req.query.companyName as string;
  const gptModelVersion = req.query.gptModelVersion as string;
  const language = req.query.language as string;

  console.log(`Using GPT model version: ${gptModelVersion}`);

  const companyUrl = await identifyLikeliesCompanyUrl(companyName);
  const companyFinderUrl = await identifyLikeliesCompanyFonectaFinderUrl(
    companyName
  );

  console.log(
    `For company name "${companyName}", likeliest company URL is: ${companyUrl}`
  );

  console.log(
    `For company name "${companyName}", likeliest company Finder URL is: ${companyFinderUrl}`
  );

  const scrapedCompanyWebsiteContent = await scrapeWebsiteBySitemap(companyUrl);
  const scrapedCompanyFinderContent = await scrapeWebsite(companyFinderUrl);

  const scrapedContent = [
    ...scrapedCompanyWebsiteContent,
    ...scrapedCompanyFinderContent,
  ];

  console.log(
    `Making vector store of the scraped content (${scrapedContent.length} chunks)`
  );

  VECTOR_STORE = await makeVectorStore(scrapedContent);

  const whatIsTheCompanyDoingQuery = `What is the main business of company ${companyName}?`;

  const companySummaryRagResponse = await askGPTWithRAG(
    gptModelVersion,
    VECTOR_STORE,
    whatIsTheCompanyDoingQuery
  );

  console.log(`Company summary: \n\n${companySummaryRagResponse.answer}`);

  const whoIsTheCEOQuery = `Who is the CEO of the company ${companyName}?`;

  const whoIsTheCEORagResponse = await askGPTWithRAG(
    gptModelVersion,
    VECTOR_STORE,
    whoIsTheCEOQuery,
    "String, given as Firstname Lastname. Middle names, if available, are OK. Avoid titles such as CEO, Sir, Madam, PhD, etc.",
    "'John Doe'"
  );

  console.log(`Company CEO: \n\n${whoIsTheCEORagResponse.answer}`);

  const contactDetailsRagResponse = await askGPTWithRAG(
    gptModelVersion,
    VECTOR_STORE,
    `What are the contact details (email, phone, title) for ${whoIsTheCEORagResponse.answer}?`,
    `JSON with the following structure
    {
      'name': 'Firstname Lastname',
      'title': 'Title',
      'cellphone': '+358 12 3456789',
      'email': 'firstname.lastname@email.suffix'
    }`
  );

  console.log("Contact details:\n", contactDetailsRagResponse.answer);

  const ceoContactDetails = extractJSONFromString(
    contactDetailsRagResponse.answer
  ) as ContactDetails;

  console.log("CEO contact details as JSON:", ceoContactDetails);

  res.send({
    summary: {
      ragResponse: companySummaryRagResponse,
    },
    contacts: {
      ragResponse: contactDetailsRagResponse,
      contactDetails: [ceoContactDetails],
    },
  });
});

app.post("/sales/email", async (req, res) => {
  const gptModelVersion = req.query.gptModelVersion as string;
  const companySummary = req.query.companySummary as string;
  const salesOffering = req.query.salesOffering as string;
  const language = req.query.language as string;

  const senderCompany = "Veracell";
  const recipientCompany = "GetUp Consulting";
  const recipientName = "Sami Martikainen";

  const prompt = `
Task:
Your role is a salesperson doing sales outreach to cold contacts (prospects). Write an email with the following contents:
- Introduction of your company
- What are the biggest bottlenecks in the industry of the prospect
- How the vendor can help with the sales offering to help the prospect
- Finally, propose a meeting. Provide a calendly link for booking the meeting

Company that is sending the email:
${senderCompany}

Sales offering of Veracell:
${salesOffering}

Name of the recipient:
${recipientName}

Name of the recipient company:
${recipientCompany}

Business summary of the recipient company:
${companySummary}

Write the email in language:
${language}

Example output (replace values inside curly braces):
Hi {RecipientFirstName},

We're Veracell, AI consultancy. As you are operating in boosting the sales of your customers, perhaps you've aware how AI is disrupting the field at a rapid pace. Our company is helping customers like you to empower their sales teams with AI to beat the competition. We have been developing AI assistants that leverage large language models to improve and automate processes in customer sales operations.

Are you interested meeting our AI expert Timo Erkkilä? If so, book a meeting here:
https://calendly.com/veracell/timo-erkkila/30min


Kind regards,
John Doe
Veracell
  `;

  console.log(prompt);

  const response = await askGPT(gptModelVersion, prompt);

  console.log("Response email:\n\n", response);

  res.send({ email: response });
});

app.post("/company/ask", async (req, res) => {
  if (VECTOR_STORE === undefined) return;

  const gptModelVersion = req.query.gptModelVersion as string;
  const question = req.query.question as string;
  const language = req.query.language as string;

  console.log(`Using GPT model version: ${gptModelVersion}`);

  const ragResponse = await askGPTWithRAG(
    gptModelVersion,
    VECTOR_STORE,
    question
  );

  res.send({
    response: ragResponse,
  });
});

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});
