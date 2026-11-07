import NotFound from "../components/NotFound.jsx";

/**
 * NotFoundPage: Handles 404 routes and invalid URLs using the reusable NotFound component.
 */
export default function NotFoundPage() {
  return (
    <div className="container not-found-page-wrapper">
      <NotFound
        eyebrow="404 · PAGE NOT FOUND"
        title="This space is empty."
        message="We could not find the page you are looking for. The slot may have moved or does not exist. Let’s get you back on track."
        actionTo="/"
        actionText="Back to Home"
        showDashboardLink={true}
      />
    </div>
  );
}
