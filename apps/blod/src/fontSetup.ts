import { publicUrl } from "./publicUrl";

const style = document.createElement("style");
style.textContent = `
@font-face {
  font-family: "Bageshron";
  src: url("${publicUrl("Fonts/Bageshron-Regular.ttf")}") format("truetype");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
`;
document.head.appendChild(style);
