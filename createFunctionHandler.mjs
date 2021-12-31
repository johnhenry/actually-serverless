import { defaultExportStr } from "./default-handler.mjs";

export default async (str = defaultExportStr) => {
  try {
    return (
      await import(
        URL.createObjectURL(
          new Blob([str], {
            type: "application/javascript",
          })
        )
      )
    ).default;
  } catch (error) {
    return () => new Response("Malformed Function", { status: 500 });
  }
};
