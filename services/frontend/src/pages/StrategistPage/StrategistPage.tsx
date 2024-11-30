import { useState, ChangeEvent, useEffect } from "react";

import { Grid, Box, Button, Select, Title, Space, Table } from "@mantine/core";

import axios from "axios";

interface GoogleSearchResultItem {
  link: string;
  snippet: string;
}

interface GoogleSearchQueryAndResultItem {
  google_search_query: string;
  google_search_result: GoogleSearchResultItem;
}

interface GoogleSearchResponse {
  googleSearchQueriesAndResults: GoogleSearchQueryAndResultItem[];
}

interface StrategistPageProps {
  gptModelVersion: string;
  language: string;
}

interface CompanyRow {
  company_id: string;
  company_name: string;
  company_details: any | null;
  company_url: string;
}

export const StrategistPage = (props: StrategistPageProps) => {
  const [companies, setCompanies] = useState<CompanyRow[]>([]);

  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");

  const onCompanyNameChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Update the state with the new value of the textarea
    setSelectedCompanyName(event.currentTarget.value);
  };

  const companyGoogleSearchParams = {
    params: {
      companyName: selectedCompanyName,
    },
  };

  useEffect(() => {
    if (selectedCompanyName) {
      alert(`Selected company: ${selectedCompanyName}`);
    }
  }, [selectedCompanyName]);

  useEffect(() => {
    const fetchCompanies = async () => {
      const response = await axios.get<CompanyRow[]>(
        "http://localhost:3000/companies"
      );
      setCompanies(response.data);
    };
    fetchCompanies();
  }, []);

  const onGoogleSearchClick = async () => {
    console.log("onGoogleSearchClick");
    const response = await axios.post<any>(
      "http://localhost:3000/company/gather-information",
      {},
      companyGoogleSearchParams
    );

    console.log(response.data);
  };

  return (
    <Grid>
      <Grid.Col span={2}>
        <Box pos="relative">
          <Title order={6}>Select company:</Title>
          <Select
            value={selectedCompanyName}
            onChange={(value) => setSelectedCompanyName(value || "")}
            data={companies.map((company) => ({
              value: company.company_name,
              label: company.company_name,
            }))}
            searchable
            clearable
            placeholder="Choose a company"
          />
          <Space my="sm" />
          <Button onClick={onGoogleSearchClick}>Search</Button>
        </Box>
      </Grid.Col>
      <Grid.Col span={10}>
        <Box pos="relative"></Box>
      </Grid.Col>
    </Grid>
  );
};
