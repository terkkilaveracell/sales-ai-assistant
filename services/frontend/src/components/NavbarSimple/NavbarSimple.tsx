import { useState } from "react";
import { Group, Code } from "@mantine/core";
import { IconHome } from "@tabler/icons-react";
import classes from "./NavbarSimple.module.css";
//import { UserButton } from "../UserButton/UserButton";

const data = [{ link: "", label: "Company details", icon: IconHome }];

export function NavbarSimple() {
  const [active, setActive] = useState("Billing");

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
    <>
      <div className={classes.navbarMain}>
        <Group className={classes.header} justify="space-between"></Group>
        {links}
      </div>
      <div className={classes.footer}></div>
    </>
  );
}
