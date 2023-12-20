import { Group, Box, Title, Radio } from "@mantine/core";

interface ConfigGroupProps {
  gptModelVersion: string;
  onGptModelVersionChange: (newGptModelVersion: string) => void;
  language: string;
  onLanguageChange: (newLanguage: string) => void;
}

export const ConfigGroup = (props: ConfigGroupProps) => {
  return (
    <Group>
      <Box style={{ marginRight: "30px" }}>
        <Title order={6}>Choose the GPT model version</Title>
        <Radio.Group
          value={props.gptModelVersion}
          onChange={props.onGptModelVersionChange}
          name="gptModelVersion"
        >
          <Group mt="xs">
            <Radio value="gpt-3.5-turbo" label="gpt-3.5-turbo" />
            <Radio value="gpt-4" label="gpt-4" />
          </Group>
        </Radio.Group>
      </Box>
      <Box style={{ marginRight: "30px" }}>
        <Title order={6}>Choose language</Title>
        <Radio.Group
          value={props.language}
          onChange={props.onLanguageChange}
          name="language"
        >
          <Group mt="xs">
            <Radio value="Finnish" label="Finnish" />
            <Radio value="English" label="English" />
          </Group>
        </Radio.Group>
      </Box>
    </Group>
  );
};
