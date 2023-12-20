import { useState } from "react";
import { Group, AppShell } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";

import classes from "./AppNavbar.module.css";

const data = [{ link: "", label: "Company details", icon: IconHome }];

export const AppNavbar = () => {
  const [active, setActive] = useState("Billing");

  const [isNavbarOpened, { toggle: toggleNavbar }] = useDisclosure();

  const links = data.map((item) => (
    <a
      className={classes.link}
      data-active={item.label === active || undefined}
      href={item.link}
      key={item.label}
      onClick={(event) => {
        event.preventDefault();
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </a>
  ));

  return (
    <AppShell.Navbar p={"md"} withBorder={true} zIndex={200}>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between"></Group>
        {links}
      </div>
      <div className={classes.footer}></div>
    </AppShell.Navbar>
  );
};
