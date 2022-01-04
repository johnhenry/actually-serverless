const defaultHandler = ({ request }) => {
  const { origin, pathname } = window.location;
  const href = `${origin}${pathname}`;
  return new Response(
    `Implement host at <a href="${href}" target="_blank">${href}</a> and <a href="#" onclick="window.location.reload()">reload</a> this page.`,
    {
      status: 501,
      headers: { "content-type": "text/html" },
      statusText: "Not Implemented",
    }
  );
};
export const defaultExportStr = `export default ${defaultHandler.toString()}`;

export default defaultHandler;
