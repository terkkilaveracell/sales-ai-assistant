import "./App.css";

import { useState, ChangeEvent, useEffect } from "react";
import axios from "axios";

import {
  AppShell,
  Textarea,
  Button,
  Grid,
  Box,
  Space,
  Divider,
  Title,
} from "@mantine/core";
import { AppNavbar } from "./components/AppNavbar/AppNavbar";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { ConfigGroup } from "./components/ConfigGroup/ConfigGroup";
import { CompanySpecifier } from "./components/CompanySpecifier/CompanySpecifier";
import { CompanyDetails } from "./components/CompanyDetails/CompanyDetails";
import {
  Chunk,
  RAGResponse,
  CompanyDetailsResponse,
  ContactDetails,
} from "./types";

interface SalesEmailProps {
  email: string;
}

function App() {
  const defaultGptModelVersion = "gpt-3.5-turbo";
  const defaultLanguage = "Finnish";

  const [gptModelVersion, setGptModelVersion] = useState(
    defaultGptModelVersion
  );

  const [language, setLanguage] = useState<string>(defaultLanguage);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [salesOffering, setSalesOffering] = useState<string>("");

  const [salesEmail, setSalesEmail] = useState<string>("");

  const defaultCompanyDetails = {
    summary: {
      ragResponse: {
        prompt: "Prompt",
        answer: "Answer",
        chunks: [] as Chunk[],
      } as RAGResponse,
    },
    contacts: {
      ragResponse: {
        prompt: "Prompt",
        answer: "Answer",
        chunks: [] as Chunk[],
      } as RAGResponse,
      contactDetails: [
        {
          name: "John Doe",
          title: "CEO",
          cellphone: "+358 12 345 6789",
          email: "firstname.lastname@email.suffix",
        } as ContactDetails,
      ],
    },
  } as CompanyDetailsResponse;

  const [companyDetails, setCompanyDetails] = useState<CompanyDetailsResponse>(
    defaultCompanyDetails
  );

  useEffect(() => {
    console.log({ isLoading });
  }, [isLoading]);

  useEffect(() => {
    console.log({ gptModelVersion });
  }, [gptModelVersion]);

  useEffect(() => {
    console.log({ language });
  }, [language]);

  useEffect(() => {
    console.log({ salesEmail });
  }, [salesEmail]);

  const onCompanyDetailsChange = (
    newCompanyDetails: CompanyDetailsResponse
  ) => {
    setCompanyDetails(newCompanyDetails);
    setIsLoading(false);
  };

  const onSalesOfferingChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Update the state with the new value of the textarea
    setSalesOffering(event.currentTarget.value);
  };

  const onGptModelVersionChange = (newGptModelVersion: string) => {
    setGptModelVersion(newGptModelVersion);
  };

  const onLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  const onCreateSalesEmailClick = async () => {
    console.log("onCreateSalesEmailClick");
    const response = await axios.post<SalesEmailProps>(
      "http://localhost:3000/sales/email",
      {},
      {
        params: {
          salesOffering,
          companySummary: companyDetails.summary.ragResponse.answer,
          gptModelVersion: gptModelVersion,
          language: language,
        },
      }
    );

    console.log("setSalesEmail", response.data.email);

    setSalesEmail(response.data.email);
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: { sm: 200, lg: 300 },
        breakpoint: "sm",
        collapsed: { mobile: false },
      }}
      padding="md"
      withBorder={false}
    >
      <AppHeader />
      <AppNavbar />
      <AppShell.Main>
        <ConfigGroup
          language={language}
          onLanguageChange={onLanguageChange}
          gptModelVersion={gptModelVersion}
          onGptModelVersionChange={onGptModelVersionChange}
        />
        <Divider my="lg" />
        <Grid>
          <Grid.Col span={4}>
            <CompanySpecifier
              gptModelVersion={gptModelVersion}
              language={language}
              onSubmit={() => setIsLoading(true)}
              onCompanyDetailsChange={onCompanyDetailsChange}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <CompanyDetails
              isLoading={isLoading}
              companyDetails={companyDetails}
            />
          </Grid.Col>
        </Grid>
        <Divider my="lg" />
        <Grid>
          <Grid.Col span={4}>
            <Box pos="relative">
              <Title order={6}>What product or service are you offering?</Title>
              <Textarea
                autosize
                value={salesOffering}
                onChange={onSalesOfferingChange}
              ></Textarea>
              <Space my="sm" />
              <Button onClick={onCreateSalesEmailClick}>
                Create sales email
              </Button>
            </Box>
          </Grid.Col>
          <Grid.Col span={8}>
            <Box pos="relative">
              <Title order={6}>Sales email</Title>
              <Textarea
                autosize
                contentEditable={false}
                value={salesEmail}
              ></Textarea>
            </Box>
          </Grid.Col>
        </Grid>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
