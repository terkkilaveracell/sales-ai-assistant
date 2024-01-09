import "./App.css";

import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { AppShell, Divider } from "@mantine/core";
import { AppHeader } from "./components/AppHeader/AppHeader";
import { ConfigGroup } from "./components/ConfigGroup/ConfigGroup";
import { AppNavbar } from "./components/AppNavbar/AppNavbar";
import { SalesAssistantPage } from "./pages/SalesAssistantPage/SalesAssistantPage";
import { SandboxPage } from "./pages/SandboxPage/SandboxPage";

function App() {
  const defaultGptModelVersion = "gpt-4"; // "gpt-3.5-turbo"
  const defaultLanguage = "Finnish";

  const [gptModelVersion, setGptModelVersion] = useState(
    defaultGptModelVersion
  );

  const [language, setLanguage] = useState<string>(defaultLanguage);

  useEffect(() => {
    console.log({ gptModelVersion });
  }, [gptModelVersion]);

  useEffect(() => {
    console.log({ language });
  }, [language]);

  const onGptModelVersionChange = (newGptModelVersion: string) => {
    setGptModelVersion(newGptModelVersion);
  };

  const onLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
  };

  return (
    <Router>
      <AppShell
        header={{ height: 60 }}
        padding="md"
        withBorder={false}
        navbar={{
          width: 300,
          breakpoint: "sm",
          collapsed: { mobile: false },
        }}
      >
        <AppHeader />
        <AppNavbar />
        <AppShell.Main>
          {/* 
          <ConfigGroup
            language={language}
            onLanguageChange={onLanguageChange}
            gptModelVersion={gptModelVersion}
            onGptModelVersionChange={onGptModelVersionChange}
          />
          <Divider my="lg" />
          */}
          <Routes>
            <Route
              path="/"
              element={
                <SalesAssistantPage
                  gptModelVersion={gptModelVersion}
                  language={language}
                />
              }
            />
            <Route
              path="/sandbox"
              element={
                <SandboxPage
                  gptModelVersion={gptModelVersion}
                  language={language}
                />
              }
            />
          </Routes>
        </AppShell.Main>
      </AppShell>
    </Router>
  );
}

export default App;
