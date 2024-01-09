import { useState } from "react";
import { Group, AppShell, Button, Box } from "@mantine/core";
import { IconHome, IconBottle } from "@tabler/icons-react";
import { useDisclosure } from "@mantine/hooks";
import { Link } from "react-router-dom";

import classes from "./AppNavbar.module.css";

const data = [
  { link: "/", label: "Sales assistant", icon: IconHome },
  { link: "/sandbox", label: "Sandbox", icon: IconBottle },
];

export const AppNavbar = () => {
  const [active, setActive] = useState("Sales assistant");

  const [isNavbarOpened, { toggle: toggleNavbar }] = useDisclosure();

  const links = data.map((item) => (
    <Link
      to={item.link}
      className={classes.link}
      data-active={item.label === active || undefined}
      onClick={(event) => {
        setActive(item.label);
      }}
    >
      <item.icon className={classes.linkIcon} stroke={1.5} />
      <span>{item.label}</span>
    </Link>
  ));

  return (
    <AppShell.Navbar p={"md"} withBorder={true} zIndex={200}>
      <div className={classes.navbarMain}>{links}</div>
      <div className={classes.footer}></div>
    </AppShell.Navbar>
  );
};
