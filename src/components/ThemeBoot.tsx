// 페이지 첫 페인트 전에 테마를 적용해 깜빡임 방지.
// <head>에 인라인 스크립트로 주입한다.
const SCRIPT = `
(function(){
  try {
    var k = "lime.theme";
    var v = localStorage.getItem(k) || "auto";
    var resolved = v;
    if (v === "auto") {
      resolved = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    var root = document.documentElement;
    root.classList.remove("theme-light","theme-dark","dark");
    root.classList.add("theme-" + resolved);
    if (resolved === "dark") root.classList.add("dark");
  } catch(e){}
})();
`;

export default function ThemeBoot() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
