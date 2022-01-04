import { defaultExportStr } from "./default-handler.mjs";

export default async (str = defaultExportStr, preamble = "") => {
  try {
    const body = preamble ? preamble + "\n" + str : str;
    return (
      await import(
        URL.createObjectURL(
          new Blob([body], {
            type: "application/javascript",
          })
        )
      )
    ).default;
  } catch (error) {
    return () =>
      new Response(`Malformed Function:${error.message}`, { status: 500 });
  }
};
