import { Chunk } from "./scraper";

const reduceChunkTexts = (chunks: Chunk[]): string => {
  return chunks
    .map((chunk) => chunk.text)
    .reduce((accumulator, currentString) => {
      return accumulator + currentString + "\n\n";
    }, "");
};

interface PromptToFindCompanyWebsiteUrlFromChunksProps {
  companyName: string;
  chunks: Chunk[];
}

export const promptToFindCompanyWebsiteUrlFromChunks = (
  props: PromptToFindCompanyWebsiteUrlFromChunksProps
) => `
Find the likely URL of the website of company ${
  props.companyName
}, given the following text chunks scraped from another website. 
As output, only the URL should be given as string, nothing else.

Accepted output example:
https://acme.com

Unaccepted output example:
I found the following URL: https://acme.com

Chunks:
${reduceChunkTexts(props.chunks)}
`;

interface PromptToFindPeopleNamesFromChunks {
  chunks: Chunk[];
}

export const promptToFindPeopleNamesFromChunks = (
  props: PromptToFindPeopleNamesFromChunks
) => `
List all the names of the people you find in the following text chunks scraped from another website. 
As output, only the first and last names should be provided as a list of strings, nothing else. 

Accepted output example:
["John Doe", "Leslie Nielsen", "Nelson Mandela"]

Unaccepted output example:
John Doe, Leslie Nielse, Nelson Mandela

Chunks:
${reduceChunkTexts(props.chunks)}
`;

interface PromptToDetectLanguageFromChunksProps {
  chunks: Chunk[];
}

export const promptToDetectLanguageFromChunks = (
  props: PromptToDetectLanguageFromChunksProps
) => `
Given the following chunks scraped from website, give me the most likely language used. 
As output, only the name of the language as string is needed, nothing else.

Accepted output example:
Finnish

Unaccepted output example:
The language is Finnish

Chunks:
${reduceChunkTexts(props.chunks)}
`;

interface PromptToTranslateTextProps {
  text: string;
  language: string;
}

export const promptToTranslateText = (props: PromptToTranslateTextProps) => `
Translate the following text to ${props.language}. 
As output, only the translated text as string is needed, nothing else.

Accepted output example:
Suomi on kaunis maa

Unaccepted output example:
Sure, the translation is: Suomi on kaunis maa.

Text:
${props.text}
`;

interface PromptToSearchContactDetailsUrlsProps {
  companyName: string;
  contactName: string;
  urls: string[];
}

export const promptToSearchContactDetailsUrls = (
  props: PromptToSearchContactDetailsUrlsProps
) => `
Which of the following URLs is the likeliest to contain contact information of the company ${
  props.companyName
} employee ${props.contactName}? 
The URL should start with the base domain of company ${
  props.companyName
} and likely contain the path "contact" or "ota yhteyttä", 
or a variation of that. Provide just the URL as string, nothing more.
    
Accepted output example:
["https://acme.com/contact", "https://acme.fi/ota-yhteytta"]
    
Unaccepted output example:
This is the likeliest URL: https://acme.com, https://acme.fi/ota-yhteytta
    
URL candidates:
${props.urls.join("\n")}
`;
