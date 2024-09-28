import { useState, ChangeEvent } from "react";

import { Grid, Box, Button, Textarea, Title, Space } from "@mantine/core";

import axios from "axios";

interface GoogleSearchResultItem {
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  googleSearchResults: GoogleSearchResultItem[];
}

interface StrategistPageProps {
  gptModelVersion: string;
  language: string;
}

const mondayAPIToken =
  "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjQxMzc2NTM3NywiYWFpIjoxMSwidWlkIjoyNzM0NzM2MSwiaWFkIjoiMjAyNC0wOS0yMVQxMzo0NTozMi4xNDJaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTA5NzUxOTgsInJnbiI6InVzZTEifQ.RJ7w6d2lWhkVmB8U5EQULCEhIB7UVMH08leic-ALccs";

export const StrategistPage = (props: StrategistPageProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [companyName, setCompanyName] = useState<string>("");

  const [googleSearchResponse, setGoogleSearchResponse] = useState<
    GoogleSearchResponse | undefined
  >(undefined);

  const onCompanyNameChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Update the state with the new value of the textarea
    setCompanyName(event.currentTarget.value);
  };

  const onGoogleSearchClick = async () => {
    console.log("onGoogleSearchClick");
    setIsLoading(true);
    const response = await axios.post<GoogleSearchResponse>(
      "http://localhost:3000/sandbox/google-search",
      {},
      {
        params: {
          companyName: companyName,
          gptModelVersion: props.gptModelVersion,
          language: props.language,
        },
      }
    );

    setGoogleSearchResponse(response.data);
    setIsLoading(false);
  };

  return (
    <Grid>
      <Grid.Col span={4}>
        <Box pos="relative">
          <Title order={6}>Provide company name:</Title>
          <Textarea
            autosize
            value={companyName}
            onChange={onCompanyNameChange}
          ></Textarea>
          <Space my="sm" />
          <Button onClick={onGoogleSearchClick}>Search</Button>
        </Box>
      </Grid.Col>
    </Grid>
  );
};
