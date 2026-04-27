import { useParams } from "react-router-dom";

export default function Community() {
  const { id } = useParams();

  // community info
  // hosts info

  return <div>Community {id}</div>;
}
