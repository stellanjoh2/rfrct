/// <reference types="vite/client" />

/** File System Access API — optional on Window in browsers that omit typings. */
interface Window {
  showDirectoryPicker?(): Promise<FileSystemDirectoryHandle>;
}
