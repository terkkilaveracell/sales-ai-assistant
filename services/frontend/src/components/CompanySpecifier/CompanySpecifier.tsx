import { useState, ChangeEvent } from "react";
import { Box, Title, Textarea, Space, Button } from "@mantine/core";
import { CompanyDetailsResponse } from "../../types";

import axios from "axios";

export interface CompanySpecifierProps {
  gptModelVersion: string;
  language: string;
  onCompanyDetailsChange: (newCompanyDetails: CompanyDetailsResponse) => void;
  onSubmit: () => void;
}

export const CompanySpecifier = (props: CompanySpecifierProps) => {
  const [companyName, setCompanyName] = useState("");

  const onChangeUpdateCompanyName = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    // Update the state with the new value of the textarea
    setCompanyName(event.currentTarget.value);
  };

  const onClickSubmit = async () => {
    props.onSubmit();

    const response = await axios.post<CompanyDetailsResponse>(
      "http://localhost:3000/company/details",
      {},
      {
        params: {
          companyName,
          gptModelVersion: props.gptModelVersion,
          language: props.language,
        },
      }
    );

    const res = response.data;

    props.onCompanyDetailsChange(res);
  };

  return (
    <Box pos="relative">
      <Title order={6}>What company are you interested in?</Title>
      <Textarea
        value={companyName}
        onChange={onChangeUpdateCompanyName}
        minRows={1}
      />
      <Space my="sm" />
      <Button onClick={onClickSubmit}>Fetch company details</Button>
    </Box>
  );
};
