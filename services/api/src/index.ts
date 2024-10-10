import dotenv from "dotenv";

dotenv.config();

import express from "express";
import cors from "cors";

import {
  scrapeAndChunkWebsite,
  scrapeAndChunkWebsiteWithRetries,
  identifyLikeliestCompanyFonectaFinderUrl,
  Chunk,
} from "./modules/scraper";
import { openaiService as openai } from "./services/openaiService";
import { ragService as rag } from "./services/ragService";

import { askGoogle } from "./services/googleService";

import companyRoutes from "./routes/companyRoutes";

/*
import { GraphQLClient, gql } from "graphql-request";

// Initialize the GraphQL client with the endpoint URL
const endpoint = "https://api.monday.com/v2"; // Example GraphQL API
const graphQLClient = new GraphQLClient(endpoint, {
  headers: {
    // If authentication is required, add headers here
    // Authorization: `Bearer YOUR_TOKEN`,
  },
});
*/

const app = express();

const API_PORT = 3000;

app.listen(API_PORT, () => {
  console.log(`Server is running at http://localhost:${API_PORT}`);
});

// Enable CORS for frontend service
app.use(
  cors({
    origin: "http://localhost:8000", // URL of your frontend service
  })
);

app.use("/", companyRoutes);

// Hello World endpoint
app.get("/hello", (req, res) => {
  res.send("Hello World!");
});

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

  const companyUrl = "foobar"; //await identifyLikeliestCompanyUrl(companyName);
  const companyFinderUrl = await identifyLikeliestCompanyFonectaFinderUrl(
    companyName
  );

  console.log(
    `For company name "${companyName}", likeliest company URL is: ${companyUrl}`
  );

  console.log(
    `For company name "${companyName}", likeliest company Finder URL is: ${companyFinderUrl}`
  );

  const hits = await askGoogle(`${companyName} contact`);

  console.log(hits);

  const prompt2 = `
Given the following list of URLs, which are the likely ones to contain contact details for the decision-makers of the company?

URLs:
${hits.map((hit) => `\n- ${hit.link}`)}

  `;

  console.log(prompt2);

  const foo = await openai.ask(prompt2);

  console.log(foo);

  const chunkSize = 1000;
  const numRetries = 3;

  const contents = reduceChunks(
    await Promise.all(
      hits.map(async (hit) =>
        reduceChunks(
          await scrapeAndChunkWebsiteWithRetries(
            hit.link,
            chunkSize,
            numRetries
          )
        )
      )
    )
  );

  const prompt = `
Find all the names from the provided text. The names should contain first name and last name. Provide the names in a list.

Example output:
['John Doe', 'Mark Hamill', 'John Wayne']

Text:
${contents.text}

  `;

  //console.log(prompt);

  const scrapedCompanyWebsiteContent = await scrapeAndChunkWebsite(
    companyUrl,
    chunkSize
  );
  const scrapedCompanyFinderContent = await scrapeAndChunkWebsite(
    companyFinderUrl,
    chunkSize
  );

  const scrapedContent = [
    ...scrapedCompanyWebsiteContent,
    ...scrapedCompanyFinderContent,
  ];

  console.log(
    `Making vector store of the scraped content (${scrapedContent.length} chunks)`
  );

  const whatIsTheCompanyDoingQuery = `What is the main business of company ${companyName}?`;

  const companySummaryRagResponse = await rag.ask(whatIsTheCompanyDoingQuery);

  console.log(`Company summary: \n\n${companySummaryRagResponse.answer}`);

  const whoIsTheCEOQuery = `Who is the CEO of the company ${companyName}?`;

  const whoIsTheCEORagResponse = await rag.ask(whoIsTheCEOQuery);

  console.log(`Company CEO: \n\n${whoIsTheCEORagResponse.answer}`);

  const contactDetailsRagResponse = await rag.ask(
    `What are the contact details (email, phone, title) for ${whoIsTheCEORagResponse.answer}?`
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

const reduceChunks = (chunks: Chunk[]) => {
  return chunks.reduce(
    (prev, curr) =>
      ({
        url: prev.url,
        index: 0,
        text: prev.text + curr.text,
      } as Chunk)
  );
};

app.post("/company/contacts", async (req, res) => {
  const companyName = req.query.companyName as string;
  const gptModelVersion = req.query.gptModelVersion as string;

  const hits = (await askGoogle(`${companyName} contact`)).slice(0, 3);

  const chunkSize = 1000;

  const contents = reduceChunks(
    await Promise.all(
      hits.map(async (hit) =>
        reduceChunks(await scrapeAndChunkWebsite(hit.link, chunkSize))
      )
    )
  );

  const prompt = `
Find all the names from the provided text. The names should contain first name and last name. Provide the names in a list.

Example output:
['John Doe', 'Mark Hamill', 'John Wayne']

Text:
${contents.text}

  `;

  console.log(prompt);

  //const contacts = await askGPT(gptModelVersion, prompt);

  res.send({ hits, prompt });
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

  const response = await openai.ask(prompt);

  console.log("Response email:\n\n", response);

  res.send({ email: response });
});

app.post("/sandbox/google-search", async (req, res) => {
  const googleSearchString = req.query.googleSearchString as string;

  const googleSearchResults = await askGoogle(googleSearchString);

  res.send({ googleSearchResults });
});
