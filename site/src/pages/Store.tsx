export function StorePage({ gameSlug, query }: { gameSlug?: string; query: URLSearchParams }) {
  return <div className="page container"><h1 className="h1">Store {gameSlug} {query.toString()}</h1></div>;
}
