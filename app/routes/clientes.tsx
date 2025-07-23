import type { Route } from "./+types/clientes";
import { Clientes } from "../pages/clientes";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "New React Router App" },
    { name: "description", content: "Welcome to React Router!" },
  ];
}

export default function Home() {
  return <Clientes />;
}
