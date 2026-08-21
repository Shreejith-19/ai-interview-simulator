import { useParams } from "react-router-dom";
import PageShell from "./PageShell.jsx";

export default function Results() {
  const { id } = useParams();

  return (
    <PageShell
      title="Results"
      description={`Placeholder page for result ${id ?? "unknown"}.`}
    />
  );
}