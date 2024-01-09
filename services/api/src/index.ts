import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import {
  identifyLikeliesCompanyUrl,
  scrapeWebsite,
  scrapeWebsiteBySitemap,
  identifyLikeliesCompanyFonectaFinderUrl,
  Chunk,
} from "./modules/scraper";
import { makeVectorStore } from "./modules/store";
import { askGPTWithRAG, askGPT } from "./modules/openai";
import { FaissStore } from "langchain/vectorstores/faiss";
import { askGoogle } from "./modules/google";
import {
  promptToFindCompanyWebsiteUrlFromChunks,
  promptToFindPeopleNamesFromChunks,
  promptToSearchContactDetailsUrls,
} from "./modules/prompts";

dotenv.config();

const app = express();

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

  const hits = await askGoogle(`${companyName} contact`);

  console.log(hits);

  const prompt2 = `
Given the following list of URLs, which are the likely ones to contain contact details for the decision-makers of the company?

URLs:
${hits.map((hit) => `\n- ${hit.link}`)}

  `;

  console.log(prompt2);

  const foo = await askGPT(gptModelVersion, prompt2);

  console.log(foo);

  const chunkSize = 1000;
  const chunkOverlap = 0;

  const contents = reduceChunks(
    await Promise.all(
      hits.map(async (hit) =>
        reduceChunks(await scrapeWebsite(hit.link, chunkSize, chunkOverlap))
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

  const scrapedCompanyWebsiteContent = await scrapeWebsite(companyUrl);
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
  const chunkOverlap = 0;

  const contents = reduceChunks(
    await Promise.all(
      hits.map(async (hit) =>
        reduceChunks(await scrapeWebsite(hit.link, chunkSize, chunkOverlap))
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

const port = 3000;

app.listen(port, () => {
  console.log(`API server listening at http://localhost:${port}`);
});

app.post("/sandbox/google-search", async (req, res) => {
  const gptModelVersion = req.query.gptModelVersion as string;
  const googleSearchString = req.query.googleSearchString as string;
  const language = req.query.language as string;

  const googleSearchResults = await askGoogle(googleSearchString);

  res.send({ googleSearchResults });
});

interface PromptProps {
  instruction: string;
  exampleOutput: string[];
  backgroundInformation: string;
}

const makePrompt = (props: PromptProps) => {
  return `
Instruction:
${props.instruction}

Example output:
${props.exampleOutput}

Background information:
${props.backgroundInformation}

  `;
};

const extractListOfStrings = (jsonString: string): string[] => {
  try {
    const result = JSON.parse(jsonString);
    // Validate if the result is an array of strings
    if (
      Array.isArray(result) &&
      result.every((item) => typeof item === "string")
    ) {
      return result;
    } else {
      throw new Error("Parsed data is not an array of strings");
    }
  } catch (error) {
    console.error("Error parsing JSON string:", error);
    return [];
  }
};

//const extractJSONFromString = (responseString: string): string | null {
//  // This regex looks for anything between ```json and ```
//  const jsonMatch = responseString.match(/```json([^`]*)```/);
//  return jsonMatch ? jsonMatch[1].trim() : null; // Trim to remove any whitespace around the JSON
//}

const makeContactSearchRegExp = (
  firstName: string,
  lastName: string
): RegExp => {
  const escapeRegExp = (string: string) =>
    string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const firstNameEscaped = escapeRegExp(firstName);
  const lastNameEscaped = escapeRegExp(lastName);

  const regexpStr = `${firstNameEscaped}.{0,20}?${lastNameEscaped}(.{0,100})?`;

  // Construct the regular expression
  const regex = new RegExp(regexpStr, "i");

  return regex;
};

const findCompanyContactDetails = async (
  gptModelVersion: string,
  companyName: string,
  contactName: string
): Promise<ContactDetails | null> => {
  const googleSearchQuery = `${companyName} ${contactName}`;

  const hits = await askGoogle(googleSearchQuery);

  console.log(hits.map((hit) => hit.link));

  const companyContactPageRes = await askGPT(
    gptModelVersion,
    promptToSearchContactDetailsUrls({
      companyName,
      contactName,
      urls: hits.map((hit) => hit.link),
    })
  );

  const urls = extractListOfStrings(companyContactPageRes);

  console.log("Company contact page res:", companyContactPageRes);

  console.log("Contact URL candidates:", urls);

  const chunks = (
    await Promise.all(urls.map((url) => scrapeWebsite(url, 1000, 500)))
  ).flat();

  const faissContact = await makeVectorStore(chunks);

  const contactFormat = `
{
  "name": "Firstname Lastname",
  "title": "Title",
  "cellphone": "+358 12 3456 789",
  "email": "firstname.lastname@email.suffix"
}
`;

  const contactRagRes = await askGPTWithRAG(
    gptModelVersion,
    faissContact,
    contactName,
    contactFormat
  );

  console.log("RAG response", contactRagRes);

  console.log(contactRagRes.answer);

  const contactDetails = extractJSONFromString(
    contactRagRes.answer
  ) as ContactDetails | null;

  console.log("Contact details:", contactDetails);

  return contactDetails;
};

app.post("/sandbox/google-company-search", async (req, res) => {
  const gptModelVersion = req.query.gptModelVersion as string;
  const companyName = req.query.companyName as string;
  const language = req.query.language as string;

  //const companyUrl = await identifyLikeliesCompanyUrl(companyName);
  const companyFinderUrl = await identifyLikeliesCompanyFonectaFinderUrl(
    companyName
  );

  //console.log(
  //  `For company name "${companyName}", likeliest company URL is: ${companyUrl}`
  //);

  console.log(
    `For company name "${companyName}", likeliest company Finder URL is: ${companyFinderUrl}`
  );

  const companyFinderWebsiteChunks = await scrapeWebsite(companyFinderUrl);

  const faissFinder = await makeVectorStore(companyFinderWebsiteChunks);

  //const companyWebsiteChunks = await scrapeWebsiteBySitemap(companyUrl);

  //const faissWebsite = await makeVectorStore(companyWebsiteChunks);

  const ceoAns = await askGPTWithRAG(
    gptModelVersion,
    faissFinder,
    "Yrityksen toimitusjohtaja"
  );

  const ceoName = extractListOfStrings(
    await askGPT(
      gptModelVersion,
      promptToFindPeopleNamesFromChunks({
        chunks: [{ index: 0, text: ceoAns.answer, url: "" } as Chunk],
      })
    )
  )[0];

  const ceoNameSplit = ceoName.split(" ");

  const ceoFirstName = ceoNameSplit[0];
  const ceoLastName = ceoNameSplit[ceoNameSplit.length - 1];

  const ceoFirstAndLastName = `${ceoFirstName} ${ceoLastName}`;

  const ceoContactDetails = await findCompanyContactDetails(
    gptModelVersion,
    companyName,
    ceoFirstAndLastName
  );

  const companyUrl = await askGPT(
    gptModelVersion,
    promptToFindCompanyWebsiteUrlFromChunks({
      companyName,
      chunks: companyFinderWebsiteChunks,
    })
  );

  //const scrapedCompanyWebsiteContent = await scrapeWebsiteBySitemap(companyUrl);

  /*
  const faissCompany = await makeVectorStore(scrapedCompanyWebsiteContent);

  const whatIsTheCompanyDoingQuery = `What is the main business of company ${companyName}?`;

  const companySummaryRagResponse = await askGPTWithRAG(
    gptModelVersion,
    faissCompany,
    whatIsTheCompanyDoingQuery
  );

  console.log(`Company summary: \n\n${companySummaryRagResponse.answer}`);
*/

  res.send({
    companyFinderWebsite: companyFinderUrl,
    companyCEO: ceoFirstAndLastName,
    companyWebsite: companyUrl,
    companyCEOContactDetails: ceoContactDetails,
    //companySummary: companySummaryRagResponse.answer,
  });
});

app.post("/sandbox/company/contact-search", async (req, res) => {
  const gptModelVersion = req.query.gptModelVersion as string;
  const companyName = req.query.companyName as string;
  const language = req.query.language as string;
  const contactName = req.query.contactName as string;

  const contactDetails = await findCompanyContactDetails(
    gptModelVersion,
    companyName,
    contactName
  );

  res.send({
    name: contactDetails?.name,
    title: contactDetails?.title,
    cellphone: contactDetails?.cellphone,
    email: contactDetails?.email,
  });
});
