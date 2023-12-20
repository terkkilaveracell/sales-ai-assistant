import {
  Box,
  LoadingOverlay,
  Title,
  Textarea,
  Modal,
  Text,
  Space,
  Table,
  TableData,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { CompanyDetailsResponse, ContactDetails } from "../../types";

interface CompanyDetailsProps {
  isLoading: boolean;
  companyDetails: CompanyDetailsResponse;
}

export const CompanyDetails = (props: CompanyDetailsProps) => {
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

  const makeContactDetailsTableData = (contactDetails: ContactDetails[]) => {
    const contactDetailsTableData: TableData = {
      //caption: "Contact details",
      head: ["Name", "Title", "Cellphone", "Email"],
      body: contactDetails.map((d) => [d.name, d.title, d.cellphone, d.email]),
    };
    return contactDetailsTableData;
  };

  return (
    <Box pos="relative">
      <LoadingOverlay
        visible={props.isLoading}
        zIndex={1000}
        overlayProps={{ radius: "sm", blur: 2 }}
      />
      <Title order={6}>Company summary</Title>
      <Textarea
        contentEditable={false}
        description={props.companyDetails.summary.ragResponse.chunks
          .map((chunk) => chunk.url)
          .concat(" ")}
        value={props.companyDetails.summary.ragResponse.answer}
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
          value={props.companyDetails.summary.ragResponse.prompt}
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
          props.companyDetails.contacts.contactDetails
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
          value={props.companyDetails.contacts.ragResponse.prompt}
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
  );
};
