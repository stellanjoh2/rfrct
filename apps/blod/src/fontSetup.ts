import { publicUrl } from "./publicUrl";

const style = document.createElement("style");
style.textContent = `
@font-face {
  font-family: "Vintokeys";
  src: url("${publicUrl("Fonts/Vintokeys-Regular.otf")}") format("opentype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`;
document.head.appendChild(style);
