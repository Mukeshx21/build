import { Link } from "react-router-dom"
import { Button } from "../components/ui"

export default function NotFoundPage() {
  return (
    <div className="public-shell centered">
      <h1>Page not found</h1>
      <p>The page you requested does not exist in LandAI.</p>
      <Link to="/">
        <Button>Return home</Button>
      </Link>
    </div>
  )
}
