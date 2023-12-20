import { AppShell, Group, Burger } from "@mantine/core";

export const AppHeader = () => {
  return (
    <AppShell.Header bg={"black"}>
      <Group h="100%" px="md" c={"white"}>
        <Burger opened={true} hiddenFrom="sm" size="sm" />
        Sales AI Assistant
      </Group>
    </AppShell.Header>
  );
};
