// For generating a directory listing page for a folder
import generateDirectoryListing from "./generateDirectoryListing.mjs";
// TODO: folder listing broken somehow
export default async () => {
  const folderHandle = await window.showDirectoryPicker();
  const fetch = async ({ url }) => {
    try {
      let relativeUrl = decodeURIComponent(new URL(url).pathname);
      // Strip leading / if any, so the last token is the folder/file name
      if (relativeUrl.startsWith("/")) {
        relativeUrl = relativeUrl.substr(1, relativeUrl.length);
      }
      // Strip trailing / if any, so the last token is the folder/file name
      if (relativeUrl.endsWith("/")) {
        relativeUrl = relativeUrl.substr(0, relativeUrl.length - 1);
      }
      // Strip query string if any, since it will cause file name lookups to fail
      const q = relativeUrl.indexOf("?");
      if (q !== -1) {
        relativeUrl = relativeUrl.substr(0, q);
      }
      // Look up through any subfolders in path.
      // Note this uses File System Access API methods, either the real kind or a mini
      // polyfill when using webkitdirectory fallback.
      const subfolderArr = relativeUrl.split("/");
      let curFolderHandle = folderHandle;
      for (
        let i = 0, len = subfolderArr.length - 1 /* skip last */;
        i < len;
        ++i
      ) {
        const subfolder = subfolderArr[i];
        curFolderHandle = await curFolderHandle.getDirectoryHandle(subfolder);
      }
      // Check if the name is a directory or a file
      let body = null;
      const lastName = subfolderArr[subfolderArr.length - 1];
      if (!lastName) {
        // empty name, e.g. for root /, treated as folder
        try {
          // Check for default 'index.html' if empty directory.
          const fileHandle = await curFolderHandle.getFileHandle("index.html");
          body = await fileHandle.getFile();
        } catch {
          // Serve directory listing
          body = await generateDirectoryListing(curFolderHandle, relativeUrl);
        }
      } else {
        try {
          const listHandle = await curFolderHandle.getDirectoryHandle(lastName);
          body = await generateDirectoryListing(listHandle, relativeUrl);
        } catch {
          const fileHandle = await curFolderHandle.getFileHandle(lastName);
          body = await fileHandle.getFile();
        }
      }

      return new Response(body, {
        headers: { "Cache-Control": "no-store" },
        status: 200,
        statusText: "OK",
      });
    } catch (e) {
      console.error(e);
      return new Response(e.message, {
        status: 500,
        statusText: "Internal Server Error",
      });
    }
  };
  return {
    fetch,
    name: folderHandle.name,
  };
};
