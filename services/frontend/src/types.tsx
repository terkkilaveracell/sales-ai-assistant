export interface RAGResponse {
  prompt: string;
  answer: string;
  chunks: Chunk[];
}

export interface Chunk {
  url: string;
  text: string;
  index: string;
}

export interface CompanyDetailsResponse {
  summary: {
    ragResponse: RAGResponse;
  };
  contacts: {
    ragResponse: RAGResponse;
    contactDetails: ContactDetails[];
  };
}

export interface ContactDetails {
  name: string;
  title: string;
  cellphone: string;
  email: string;
}
