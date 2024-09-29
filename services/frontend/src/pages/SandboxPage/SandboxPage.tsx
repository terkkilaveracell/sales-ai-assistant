import { useState, ChangeEvent } from "react";

import axios from "axios";

import {
  Grid,
  Box,
  Space,
  Button,
  Textarea,
  Title,
  Card,
  Text,
  Anchor,
  List,
  Table,
  TableData,
  LoadingOverlay,
} from "@mantine/core";

interface SandboxPageProps {
  gptModelVersion: string;
  language: string;
}

interface GoogleSearchResultItem {
  link: string;
  snippet: string;
}

interface GoogleSearchResponse {
  googleSearchResults: GoogleSearchResultItem[];
}

interface ContactDetails {
  name: string;
  title: string;
  cellphone: string;
  email: string;
}

interface GoogleCompanySearchResponse {
  companyWebsite: string;
  companyFinderWebsite: string;
  companyCEO: string;
  companyCEOContactDetails: ContactDetails;
  //companySummary: string;
}

const makeContactDetailsTableData = (contactDetails: ContactDetails[]) => {
  const contactDetailsTableData: TableData = {
    //caption: "Contact details",
    head: ["Name", "Title", "Cellphone", "Email"],
    body: contactDetails.map((d) => [d.name, d.title, d.cellphone, d.email]),
  };
  return contactDetailsTableData;
};

const GoogleSearchResultCard = (props: GoogleSearchResultItem) => (
  <Card shadow="sm" p="lg" radius="md" withBorder>
    <Text>
      <Anchor href={props.link} target="_blank" rel="noopener noreferrer">
        {props.link}
      </Anchor>
    </Text>
    <Text size="sm" color="dimmed">
      {props.snippet}
    </Text>
  </Card>
);

const GoogleSearchResults = (props: GoogleSearchResponse | undefined) => {
  if (!props) return <></>;

  return (
    <List spacing="sm" size="sm" center>
      {props.googleSearchResults.map((result, index) => (
        <List.Item key={index}>
          <GoogleSearchResultCard link={result.link} snippet={result.snippet} />
        </List.Item>
      ))}
    </List>
  );
};

export const SandboxPage = (props: SandboxPageProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [isContactSearchInProgress, setIsContactSearchInProgress] =
    useState<boolean>(false);

  const [googleSearchString, setGoogleSearchString] = useState<string>("");

  const [googleSearchResponse, setGoogleSearchResponse] = useState<
    GoogleSearchResponse | undefined
  >(undefined);

  const [companyName, setCompanyName] = useState<string>("");

  const [contactName, setContactName] = useState<string>("");

  const [contactDetails, setContactDetails] = useState<ContactDetails>();

  const [googleCompanySearchResponse, setGoogleCompanySearchResponse] =
    useState<GoogleCompanySearchResponse | undefined>(undefined);

  const onGoogleSearchStringChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    // Update the state with the new value of the textarea
    setGoogleSearchString(event.currentTarget.value);
  };

  const onGoogleSearchClick = async () => {
    console.log("onGoogleSearchClick");
    const response = await axios.post<GoogleSearchResponse>(
      "http://localhost:3000/sandbox/google-search",
      {},
      {
        params: {
          googleSearchString,
          gptModelVersion: props.gptModelVersion,
          language: props.language,
        },
      }
    );

    setGoogleSearchResponse(response.data);
  };

  const onCompanyNameChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Update the state with the new value of the textarea
    setCompanyName(event.currentTarget.value);
  };

  const onContactNameChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Update the state with the new value of the textarea
    setContactName(event.currentTarget.value);
  };

  const onGoogleCompanySearchClick = async () => {
    console.log("onGoogleCompanySearchClick");
    setIsLoading(true);
    const response = await axios.post<GoogleCompanySearchResponse>(
      "http://localhost:3000/sandbox/google-company-search",
      {},
      {
        params: {
          companyName: companyName,
          gptModelVersion: props.gptModelVersion,
          language: props.language,
        },
      }
    );

    setGoogleCompanySearchResponse(response.data);
    setIsLoading(false);
  };

  const onCompanyContactDetailsSearchClick = async () => {
    console.log("onCompanyContactDetailsSearchClick");
    setIsContactSearchInProgress(true);
    const response = await axios.post<ContactDetails>(
      "http://localhost:3000/sandbox/company/contact-search",
      {},
      {
        params: {
          companyName: companyName,
          contactName: contactName,
          gptModelVersion: props.gptModelVersion,
          language: props.language,
        },
      }
    );

    setContactDetails(response.data);
    setIsContactSearchInProgress(false);
  };

  return (
    <>
      {/*
      <Grid>
        <Grid.Col span={4}>
          <Box pos="relative">
            <Title order={6}>Test Google search</Title>
            <Textarea
              autosize
              value={googleSearchString}
              onChange={onGoogleSearchStringChange}
            ></Textarea>
            <Space my="sm" />
            <Button onClick={onGoogleSearchClick}>Search</Button>
          </Box>
        </Grid.Col>
        <Grid.Col span={8}>
          <GoogleSearchResults
            googleSearchResults={
              googleSearchResponse?.googleSearchResults || []
            }
          />
        </Grid.Col>
      </Grid>
      */}
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
            <Button onClick={onGoogleCompanySearchClick}>Search</Button>
          </Box>
        </Grid.Col>
        {googleCompanySearchResponse ? (
          <Grid.Col span={8} pos="relative">
            <LoadingOverlay
              visible={isLoading}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 2 }}
            />
            <Title order={5}>Company homepage:</Title>
            <Text>{googleCompanySearchResponse?.companyWebsite}</Text>
            <Space my="sm" />
            <Title order={5}>Company Finder page:</Title>
            <Text>{googleCompanySearchResponse?.companyFinderWebsite}</Text>
            <Space my="sm" />
            <Title order={5}>Company CEO:</Title>
            <Text>{googleCompanySearchResponse?.companyCEO}</Text>
            <Space my="sm" />
            <Table
              striped
              highlightOnHover
              withTableBorder
              data={makeContactDetailsTableData(
                googleCompanySearchResponse
                  ? [googleCompanySearchResponse.companyCEOContactDetails]
                  : []
              )}
            />
            {/* 
            <Box pos="relative">
              <LoadingOverlay
                visible={isLoading}
                zIndex={1000}
                overlayProps={{ radius: "sm", blur: 2 }}
              />
              <Space my="sm" />
              <Title order={5}>Company summary:</Title>
              <Textarea
                autosize
                contentEditable={false}
                value={"Company summary"}
              ></Textarea>
            </Box>
            */}
          </Grid.Col>
        ) : (
          <Grid.Col span={8} pos="relative">
            <LoadingOverlay
              visible={isLoading}
              zIndex={1000}
              overlayProps={{ radius: "sm", blur: 2 }}
            />
            No data to show
          </Grid.Col>
        )}
      </Grid>
      <Space my="sm" />
      <Grid>
        <Grid.Col span={4}>
          <Box pos="relative">
            <Title order={6}>Provide contact name:</Title>
            <Textarea
              autosize
              value={contactName}
              onChange={onContactNameChange}
            ></Textarea>
            <Space my="sm" />
            <Button onClick={onCompanyContactDetailsSearchClick}>Search</Button>
          </Box>
        </Grid.Col>
        <Grid.Col span={8} pos="relative">
          <LoadingOverlay
            visible={isContactSearchInProgress}
            zIndex={1000}
            overlayProps={{ radius: "sm", blur: 2 }}
          />
          {contactDetails ? (
            <Table
              striped
              highlightOnHover
              withTableBorder
              data={makeContactDetailsTableData(
                contactDetails ? [contactDetails] : []
              )}
            />
          ) : (
            <></>
          )}
        </Grid.Col>
      </Grid>
    </>
  );
};
