import "./App.css";

import { useState, ChangeEvent, useEffect } from "react";
import axios from "axios";

import { useDisclosure } from "@mantine/hooks";
import {
  AppShell,
  Burger,
  Group,
  Textarea,
  Button,
  LoadingOverlay,
  Grid,
  Box,
  Modal,
  Text,
  Table,
  TableData,
  Space,
  Divider,
  Title,
  Radio,
} from "@mantine/core";
import { NavbarSimple } from "./components/NavbarSimple/NavbarSimple";

interface ContactDetails {
  name: string;
  title: string;
  cellphone: string;
  email: string;
}

interface CompanySummaryProps {
  summary: {
    ragResponse: RAGResponse;
  };
  contacts: {
    ragResponse: RAGResponse;
    contactDetails: ContactDetails[];
  };
}

interface CompanySpecifierProps {
  gptModelVersion: string;
  onCompanySummaryChange: (newCompanySummary: CompanySummaryProps) => void;
  onSubmit: () => void;
}

const CompanySpecifier = (props: CompanySpecifierProps) => {
  const [companyName, setCompanyName] = useState("");

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    // Update the state with the new value of the textarea
    setCompanyName(event.currentTarget.value);
  };

  const onClickSubmit = async () => {
    props.onSubmit();

    const response = await axios.post<CompanySummaryProps>(
      "http://localhost:3000/company/summary",
      {},
      {
        params: {
          companyName,
          gptModelVersion: props.gptModelVersion,
        },
      }
    );

    const res = response.data;

    props.onCompanySummaryChange(res);
  };

  return (
    <Box pos="relative">
      <Title order={6}>What company are you interested in?</Title>
      <Textarea value={companyName} onChange={handleChange} minRows={1} />
      <Space my="sm" />
      <Button onClick={onClickSubmit}>Submit</Button>
    </Box>
  );
};

interface Chunk {
  url: string;
  text: string;
  index: string;
}

interface RAGResponse {
  prompt: string;
  answer: string;
  chunks: Chunk[];
}

function App() {
  const defaultGptModelVersion = "gpt-3.5-turbo";

  const [gptModelVersion, setGptModelVersion] = useState(
    defaultGptModelVersion
  );

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const defaultCompanySummary = {
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
  } as CompanySummaryProps;

  const [companySummary, setCompanySummary] = useState<CompanySummaryProps>(
    defaultCompanySummary
  );

  const [
    isCompanySummaryPromptOpened,
    {
      open: openCompanySummaryPromptModal,
      close: closeCompanySummaryPromptModal,
    },
  ] = useDisclosure(false);

  const [
    isCompanyFinderSummaryPromptOpened,
    {
      open: openCompanyFinderSummaryPromptModal,
      close: closeCompanyFinderSummaryPromptModal,
    },
  ] = useDisclosure(false);

  const [isNavbarOpened, { toggle: toggleNavbar }] = useDisclosure();

  useEffect(() => {
    console.log({ isLoading });
  }, [isLoading]);

  useEffect(() => {
    console.log({ gptModelVersion });
  }, [gptModelVersion]);

  const makeContactDetailsTableData = (contactDetails: ContactDetails[]) => {
    const contactDetailsTableData: TableData = {
      //caption: "Contact details",
      head: ["Name", "Title", "Cellphone", "Email"],
      body: contactDetails.map((d) => [d.name, d.title, d.cellphone, d.email]),
    };
    return contactDetailsTableData;
  };

  const onCompanySummaryChange = (newCompanySummary: CompanySummaryProps) => {
    setCompanySummary(newCompanySummary);
    setIsLoading(false);
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: { sm: 200, lg: 300 },
        breakpoint: "sm",
        collapsed: { mobile: !isNavbarOpened },
      }}
      padding="md"
      withBorder={false}
    >
      <AppShell.Header bg={"black"}>
        <Group h="100%" px="md" c={"white"}>
          <Burger
            opened={isNavbarOpened}
            onClick={toggleNavbar}
            hiddenFrom="sm"
            size="sm"
          />
          Sales AI Assistant
        </Group>
      </AppShell.Header>
      <AppShell.Navbar p={"md"} withBorder={true} zIndex={200}>
        <NavbarSimple />
      </AppShell.Navbar>
      <AppShell.Main>
        <Grid>
          <Grid.Col span={12}>
            <Title order={6}>Choose the GPT model version</Title>
            <Radio.Group
              value={gptModelVersion}
              onChange={setGptModelVersion}
              name="gptModelVersion"
            >
              <Group mt="xs">
                <Radio value="gpt-3.5-turbo" label="gpt-3.5-turbo" />
                <Radio value="gpt-4" label="gpt-4" />
              </Group>
            </Radio.Group>
          </Grid.Col>
        </Grid>
        <Divider my="lg" />
        <Grid>
          <Grid.Col span={4}>
            <CompanySpecifier
              gptModelVersion={gptModelVersion}
              onSubmit={() => setIsLoading(true)}
              onCompanySummaryChange={onCompanySummaryChange}
            />
          </Grid.Col>
          <Grid.Col span={8}>
            <Box pos="relative">
              <LoadingOverlay
                visible={isLoading}
                zIndex={1000}
                overlayProps={{ radius: "sm", blur: 2 }}
              />
              <Title order={6}>Company summary</Title>
              <Textarea
                contentEditable={false}
                description={companySummary.summary.ragResponse.chunks
                  .map((chunk) => chunk.url)
                  .concat(" ")}
                value={companySummary.summary.ragResponse.answer}
                //label="Company summary"
                autosize
                minRows={1}
              ></Textarea>
              <Modal
                opened={isCompanySummaryPromptOpened}
                onClose={closeCompanySummaryPromptModal}
                title="Prompt"
                size="60%"
              >
                <Textarea
                  contentEditable={false}
                  value={companySummary.summary.ragResponse.prompt}
                  autosize
                  minRows={1}
                ></Textarea>
              </Modal>

              <Text
                component="a"
                href="#" // Specify the link target here
                size="xs"
                style={{
                  cursor: "pointer", // Changes the cursor to a finger pointer on hover
                }}
                c="blue"
                onClick={openCompanySummaryPromptModal}
              >
                Show prompt
              </Text>

              <Space h="md" />

              <Title order={6}>Contact details</Title>

              <Table
                striped
                highlightOnHover
                withTableBorder
                data={makeContactDetailsTableData(
                  companySummary.contacts.contactDetails
                )}
              />
              <Modal
                opened={isCompanyFinderSummaryPromptOpened}
                onClose={closeCompanyFinderSummaryPromptModal}
                title="Prompt"
                size="60%"
              >
                <Textarea
                  contentEditable={false}
                  value={companySummary.contacts.ragResponse.prompt}
                  autosize
                  minRows={1}
                ></Textarea>
              </Modal>

              <Text
                component="a"
                href="#" // Specify the link target here
                size="xs"
                style={{
                  cursor: "pointer", // Changes the cursor to a finger pointer on hover
                }}
                c="blue"
                onClick={openCompanyFinderSummaryPromptModal}
              >
                Show prompt
              </Text>
            </Box>
          </Grid.Col>
        </Grid>
        <Divider my="lg" />
        <Grid>
          <Grid.Col span={4}>
            <Box pos="relative">
              <Title order={6}>What product or service are you offering?</Title>
              <Textarea autosize></Textarea>
            </Box>
          </Grid.Col>
          <Grid.Col span={4}>2</Grid.Col>
        </Grid>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
