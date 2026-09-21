// PlantUML "text encoding": raw-deflate the UTF-8 source, then map bytes
// through PlantUML's own base64-like alphabet (0-9A-Za-z-_).
// Reference: https://plantuml.com/text-encoding
window.PlantUML = (function () {
  const server = "https://www.plantuml.com/plantuml";

  function encode6bit(b) {
    if (b < 10) return String.fromCharCode(48 + b); // 0-9
    b -= 10;
    if (b < 26) return String.fromCharCode(65 + b); // A-Z
    b -= 26;
    if (b < 26) return String.fromCharCode(97 + b); // a-z
    b -= 26;
    if (b === 0) return "-";
    if (b === 1) return "_";
    return "?";
  }

  function append3bytes(b1, b2, b3) {
    const c1 = b1 >> 2;
    const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
    const c3 = ((b2 & 0xf) << 2) | (b3 >> 6);
    const c4 = b3 & 0x3f;
    return (
      encode6bit(c1 & 0x3f) +
      encode6bit(c2 & 0x3f) +
      encode6bit(c3 & 0x3f) +
      encode6bit(c4 & 0x3f)
    );
  }

  function encode64(data) {
    let result = "";
    for (let i = 0; i < data.length; i += 3) {
      if (i + 2 === data.length) {
        result += append3bytes(data[i], data[i + 1], 0);
      } else if (i + 1 === data.length) {
        result += append3bytes(data[i], 0, 0);
      } else {
        result += append3bytes(data[i], data[i + 1], data[i + 2]);
      }
    }
    return result;
  }

  function encode(text) {
    const utf8 = new TextEncoder().encode(text);
    const compressed = pako.deflateRaw(utf8, { level: 9 });
    return encode64(compressed);
  }

  function url(text, format) {
    return `${server}/${format}/${encode(text)}`;
  }

  return { encode, url };
})();
