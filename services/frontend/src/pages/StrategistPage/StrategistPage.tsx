import { useState, ChangeEvent } from "react";

import {
  Grid,
  Box,
  Button,
  Textarea,
  Title,
  Space,
  Table,
} from "@mantine/core";

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

export const StrategistPage = (props: StrategistPageProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [companyName, setCompanyName] = useState<string>("");

  const [googleSearchQueryAndResultItems, setGoogleSearchQueryAndResultItems] =
    useState<GoogleSearchQueryAndResultItem[]>([]);

  const onCompanyNameChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Update the state with the new value of the textarea
    setCompanyName(event.currentTarget.value);
  };

  const companyGoogleSearchParams = {
    params: {
      companyName: companyName,
    },
  };

  const onGoogleSearchClick = async () => {
    console.log("onGoogleSearchClick");
    setIsLoading(true);
    const response = await axios.post<GoogleSearchQueryAndResultItem[]>(
      "http://localhost:3000/company/google-search",
      {},
      companyGoogleSearchParams
    );

    console.log(response.data);

    setGoogleSearchQueryAndResultItems(response.data);
    setIsLoading(false);
  };

  return (
    <Grid>
      <Grid.Col span={2}>
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
      <Grid.Col span={10}>
        <Box pos="relative">
          <Title order={6}>Search results</Title>
          <Table
            stickyHeader
            //stickyHeaderOffset={60}
            //style={{ tableLayout: "fixed", width: "100%" }}
          >
            <Table.Thead>
              <Table.Tr>
                <Table.Th style={{ maxWidth: "200px" }}>Search query</Table.Th>
                <Table.Th style={{ maxWidth: "200px" }}>URL</Table.Th>
                <Table.Th style={{ width: "600px" }}>Snippet</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {googleSearchQueryAndResultItems.map((item, index) => (
                <Table.Tr key={index}>
                  <Table.Td style={{ maxWidth: "200px" }}>
                    {item.google_search_query}
                  </Table.Td>
                  <Table.Td
                    style={{
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.google_search_result.link}
                  </Table.Td>
                  <Table.Td>{item.google_search_result.snippet}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
            <Table.Caption>Scroll page to see sticky thead</Table.Caption>
          </Table>
        </Box>
      </Grid.Col>
    </Grid>
  );
};
