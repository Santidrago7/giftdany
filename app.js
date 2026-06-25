(() => {
  "use strict";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const XLINK_NS = "http://www.w3.org/1999/xlink";

  const svg = document.getElementById("memoryTree");
  const defs = document.getElementById("svgDefs");
  const starLayer = document.getElementById("starLayer");
  const rootLayer = document.getElementById("rootLayer");
  const branchLayer = document.getElementById("branchLayer");
  const leafLayer = document.getElementById("leafLayer");
  const photoLayer = document.getElementById("photoLayer");
  const sparkleLayer = document.getElementById("sparkleLayer");
  const rootTitle = document.getElementById("rootMemoryTitle");
  const rootMessage = document.getElementById("rootMessageText");
  const replayButton = document.getElementById("replayTreeButton");
  const nextButton = document.getElementById("nextMemoryButton");
  const softHint = document.getElementById("softHint");
const mobileQuery = window.matchMedia("(max-width: 720px)");

function applyResponsiveTreeMode() {
  const isMobile = mobileQuery.matches;

  if (isMobile) {
    svg.setAttribute("viewBox", "0 0 900 1320");
    svg.setAttribute("preserveAspectRatio", "xMidYMin meet");

    const mobileTreeTransform = "translate(-350 170)";

    [rootLayer, branchLayer, leafLayer, photoLayer, sparkleLayer].forEach((layer) => {
      layer.setAttribute("transform", mobileTreeTransform);
    });

    starLayer.removeAttribute("transform");
    document.body.classList.add("mobile-tree");
  } else {
    svg.setAttribute("viewBox", "0 0 1600 900");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    [starLayer, rootLayer, branchLayer, leafLayer, photoLayer, sparkleLayer].forEach((layer) => {
      layer.removeAttribute("transform");
    });

    document.body.classList.remove("mobile-tree");
  }
}
  const memories = Array.isArray(window.MEMORIES) ? window.MEMORIES : [];

  const palette = [
    "#ff6ec7",
    "#ffd166",
    "#ff8a64",
    "#8f5cff",
    "#6ee7ff",
    "#ff4fc3",
    "#c084fc",
    "#f7b267",
    "#80ffdb"
  ];

  const leafPalette = [
    "#ff5ccf",
    "#ff9bd9",
    "#ffd166",
    "#ff8a64",
    "#8f5cff",
    "#6ee7ff",
    "#9cffd2"
  ];

  const state = {
    selectedIndex: -1,
    photoPositions: [],
    branchByMemory: new Map(),
    rootPaths: []
  };

  function createSvgElement(tagName, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tagName);

    Object.entries(attributes).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (key === "href") {
        element.setAttributeNS(XLINK_NS, "href", value);
        element.setAttribute("href", value);
        return;
      }

      if (key === "textContent") {
        element.textContent = value;
        return;
      }

      element.setAttribute(key, value);
    });

    return element;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function seededWave(index, factor = 1) {
    return Math.sin(index * 12.9898 + factor * 78.233) * 43758.5453 % 1;
  }

  function clearScene() {
    [starLayer, rootLayer, branchLayer, leafLayer, photoLayer, sparkleLayer].forEach((layer) => {
      while (layer.firstChild) layer.removeChild(layer.firstChild);
    });

    [...defs.querySelectorAll(".dynamic-def")].forEach((item) => item.remove());
    state.photoPositions = [];
    state.branchByMemory.clear();
    state.rootPaths = [];
  }

  function setupPathAnimation(path, delay = 0, duration = 2.4) {
    const length = path.getTotalLength ? path.getTotalLength() : 1200;
    path.classList.add("growing-path");
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length}`;
    path.style.setProperty("--path-delay", `${delay}s`);
    path.style.setProperty("--path-duration", `${duration}s`);

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => path.classList.add("is-drawn"));
    });
  }

  function createStars() {
    const starCount = 92;
    const dustCount = 54;
    const petalCount = 30;

    for (let i = 0; i < starCount; i += 1) {
      const x = 18 + ((i * 97) % 1560);
      const y = 36 + ((i * 71) % 660);
      const r = 1.2 + ((i * 11) % 26) / 10;
      const star = createSvgElement("circle", {
        class: "star",
        cx: x,
        cy: y,
        r,
        opacity: 0.35 + ((i * 7) % 55) / 100
      });

      star.style.setProperty("--twinkle-speed", `${3.2 + (i % 6) * 0.75}s`);
      star.style.setProperty("--twinkle-delay", `${(i % 9) * -0.4}s`);
      starLayer.appendChild(star);
    }

    for (let i = 0; i < dustCount; i += 1) {
      const x = 40 + ((i * 151) % 1520);
      const y = 88 + ((i * 83) % 650);
      const dust = createSvgElement("circle", {
        class: "dust",
        cx: x,
        cy: y,
        r: 1.8 + (i % 5) * 0.9,
        fill: palette[i % palette.length]
      });

      dust.style.setProperty("--dust-speed", `${7 + (i % 7)}s`);
      dust.style.setProperty("--dust-delay", `${(i % 10) * -0.55}s`);
      starLayer.appendChild(dust);
    }

    for (let i = 0; i < petalCount; i += 1) {
      const x = 42 + ((i * 193) % 1516);
      const y = 110 + ((i * 127) % 610);
      const color = leafPalette[i % leafPalette.length];
      const petal = createSvgElement("path", {
        class: "petal",
        d: "M0 0 C14 -14 32 -13 42 0 C29 10 14 11 0 0Z",
        fill: color,
        opacity: 0.72,
        transform: `translate(${x} ${y}) rotate(${(i * 47) % 360}) scale(${0.45 + (i % 6) * 0.08})`
      });
      petal.style.setProperty("--petal-speed", `${6.5 + (i % 8)}s`);
      petal.style.setProperty("--petal-delay", `${(i % 9) * -0.8}s`);
      starLayer.appendChild(petal);
    }
  }

  function getPhotoPositions(count) {
    const base = [
      { x: 460, y: 356, branchStart: { x: 782, y: 622 }, anchor: "left" },
      { x: 705, y: 256, branchStart: { x: 790, y: 570 }, anchor: "left" },
      { x: 918, y: 208, branchStart: { x: 806, y: 548 }, anchor: "center" },
      { x: 1140, y: 332, branchStart: { x: 823, y: 594 }, anchor: "right" },
      { x: 1234, y: 476, branchStart: { x: 825, y: 636 }, anchor: "right" },
      { x: 970, y: 505, branchStart: { x: 812, y: 642 }, anchor: "right" },
      { x: 642, y: 508, branchStart: { x: 788, y: 648 }, anchor: "left" },
      { x: 390, y: 514, branchStart: { x: 775, y: 662 }, anchor: "left" },
      { x: 807, y: 345, branchStart: { x: 800, y: 560 }, anchor: "center" },
      { x: 1050, y: 232, branchStart: { x: 818, y: 560 }, anchor: "right" },
      { x: 548, y: 232, branchStart: { x: 785, y: 560 }, anchor: "left" },
      { x: 1110, y: 595, branchStart: { x: 822, y: 668 }, anchor: "right" }
    ];

    if (count <= base.length) return base.slice(0, count);

    const generated = [...base];

    for (let i = base.length; i < count; i += 1) {
      const angle = -Math.PI * 0.92 + (Math.PI * 1.84 * (i - base.length + 0.5)) / (count - base.length + 1);
      const ring = 410 + (i % 3) * 74;
      const x = 800 + Math.cos(angle) * ring;
      const y = 470 + Math.sin(angle) * 270 - (i % 2) * 32;
      generated.push({
        x: clamp(x, 210, 1390),
        y: clamp(y, 170, 615),
        branchStart: { x: 800 + (x < 800 ? -18 : 18), y: 610 + (i % 4) * 12 },
        anchor: x < 720 ? "left" : x > 880 ? "right" : "center"
      });
    }

    return generated;
  }

  function branchPath(start, end, curve = 1, variant = 0) {
    const side = end.x >= start.x ? 1 : -1;
    const distance = Math.abs(end.x - start.x);
    const vertical = Math.abs(end.y - start.y);
    const sway = 44 * Math.sin(variant * 1.7 + distance / 160);
    const c1 = {
      x: start.x + side * (distance * 0.24 + 40) + sway,
      y: start.y - vertical * (0.15 + curve * 0.08) - 48 - variant * 4
    };
    const c2 = {
      x: end.x - side * (distance * 0.34 + 52) - sway * 0.45,
      y: end.y + vertical * 0.18 + 88 + variant * 7
    };

    return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
  }

  function twigPath(start, angle, length, bend, variant = 0) {
    const end = {
      x: start.x + Math.cos(angle) * length,
      y: start.y + Math.sin(angle) * length
    };
    const c1 = {
      x: start.x + Math.cos(angle - bend) * length * 0.35,
      y: start.y + Math.sin(angle - bend) * length * 0.35
    };
    const c2 = {
      x: start.x + Math.cos(angle + bend) * length * 0.76 + variant * 6,
      y: start.y + Math.sin(angle + bend) * length * 0.76 - variant * 4
    };

    return {
      d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`,
      end
    };
  }

  function createLineGroup(memoryIndex, start, end, options = {}) {
    const lines = [];
    const strands = options.strands ?? 5;
    const baseDelay = options.delay ?? 0.45;
    const baseWidth = options.width ?? 4.6;
    const colorOffset = options.colorOffset ?? memoryIndex;
    const activeId = options.memoryId;

    for (let strand = 0; strand < strands; strand += 1) {
      const offset = strand - (strands - 1) / 2;
      const jitter = {
        x: offset * 5 + Math.sin((memoryIndex + 1) * (strand + 2)) * 4,
        y: offset * 2.2 + Math.cos((memoryIndex + 2) * (strand + 1)) * 3
      };
      const localStart = {
        x: start.x + jitter.x * 0.3,
        y: start.y + jitter.y * 0.2
      };
      const localEnd = {
        x: end.x + jitter.x,
        y: end.y + jitter.y
      };

      const path = createSvgElement("path", {
        class: "branch-line",
        d: branchPath(localStart, localEnd, 0.45 + strand * 0.06, strand),
        stroke: palette[(strand + colorOffset) % palette.length],
        "stroke-width": Math.max(1.5, baseWidth - strand * 0.36),
        "data-memory-id": activeId || "decorative"
      });

      branchLayer.appendChild(path);
      setupPathAnimation(path, baseDelay + strand * 0.08 + memoryIndex * 0.04, 2.05 + strand * 0.18);
      lines.push(path);
    }

    return lines;
  }

  function createLeaf(x, y, rotation, scale, color, delay) {
    const leaf = createSvgElement("ellipse", {
      class: "memory-leaf",
      cx: x,
      cy: y,
      rx: 7 * scale,
      ry: 19 * scale,
      fill: color,
      transform: `rotate(${rotation} ${x} ${y})`
    });

    leaf.style.setProperty("--leaf-rotation", `${rotation}deg`);
    leaf.style.setProperty("--leaf-delay", `${delay}s`);
    leafLayer.appendChild(leaf);
    return leaf;
  }

  function createOrnamentalBranches() {
    const ornamental = [
      { start: { x: 790, y: 620 }, angle: -2.82, length: 360, bend: 0.36 },
      { start: { x: 780, y: 585 }, angle: -2.33, length: 280, bend: -0.24 },
      { start: { x: 810, y: 575 }, angle: -0.82, length: 320, bend: 0.22 },
      { start: { x: 825, y: 630 }, angle: -0.28, length: 420, bend: -0.26 },
      { start: { x: 805, y: 525 }, angle: -1.34, length: 335, bend: 0.22 },
      { start: { x: 795, y: 545 }, angle: -1.86, length: 310, bend: -0.2 },
      { start: { x: 820, y: 555 }, angle: -0.58, length: 290, bend: 0.18 },
      { start: { x: 775, y: 650 }, angle: -2.95, length: 270, bend: -0.18 },
      { start: { x: 840, y: 660 }, angle: -0.06, length: 290, bend: 0.15 }
    ];

    ornamental.forEach((item, index) => {
      let start = item.start;
      for (let strand = 0; strand < 3; strand += 1) {
        const twig = twigPath(
          { x: start.x + strand * 4, y: start.y - strand * 3 },
          item.angle + strand * 0.018,
          item.length - strand * 34,
          item.bend,
          strand
        );
        const path = createSvgElement("path", {
          class: "branch-line",
          d: twig.d,
          stroke: palette[(index + strand + 2) % palette.length],
          "stroke-width": 2.1 - strand * 0.15,
          opacity: 0.66,
          "data-memory-id": "decorative"
        });
        branchLayer.appendChild(path);
        setupPathAnimation(path, 0.7 + index * 0.09 + strand * 0.12, 2.1 + strand * 0.25);

        for (let leafIndex = 0; leafIndex < 3; leafIndex += 1) {
          const t = 0.48 + leafIndex * 0.18;
          const lx = start.x + Math.cos(item.angle) * item.length * t + Math.sin(index + leafIndex) * 20;
          const ly = start.y + Math.sin(item.angle) * item.length * t + Math.cos(index + leafIndex) * 20;
          createLeaf(
            lx,
            ly,
            (item.angle * 180) / Math.PI + 78 + leafIndex * 28,
            0.62 + (leafIndex % 2) * 0.18,
            leafPalette[(index + leafIndex + strand) % leafPalette.length],
            2.0 + index * 0.06 + leafIndex * 0.12
          );
        }
      }
    });
  }

  function createTrunk() {
    const trunkLines = [
      { x: 760, c1: 702, c2: 858, end: 806, color: "#ff6ec7", w: 8.2, delay: 0.2 },
      { x: 784, c1: 760, c2: 824, end: 790, color: "#ffd166", w: 7.4, delay: 0.28 },
      { x: 806, c1: 884, c2: 730, end: 820, color: "#8f5cff", w: 6.8, delay: 0.34 },
      { x: 830, c1: 880, c2: 734, end: 792, color: "#6ee7ff", w: 5.8, delay: 0.39 },
      { x: 742, c1: 690, c2: 795, end: 778, color: "#ff8a64", w: 5.4, delay: 0.46 },
      { x: 850, c1: 915, c2: 814, end: 832, color: "#ff4fc3", w: 4.8, delay: 0.52 }
    ];

    trunkLines.forEach((line, index) => {
      const d = `M ${line.x} 740 C ${line.c1} 645, ${line.c2} 560, ${line.end} 398 C ${line.end + Math.sin(index) * 36} 312, ${line.end + Math.cos(index) * 28} 232, ${line.end + (index - 2) * 18} 170`;
      const path = createSvgElement("path", {
        class: "branch-line",
        d,
        stroke: line.color,
        "stroke-width": line.w,
        opacity: 0.96,
        "data-memory-id": "trunk"
      });
      branchLayer.appendChild(path);
      setupPathAnimation(path, line.delay, 2.8);
    });
  }

  function createRoots() {
    const rootStarts = [
      { x: 772, y: 706 },
      { x: 790, y: 714 },
      { x: 810, y: 710 },
      { x: 828, y: 705 },
      { x: 756, y: 725 },
      { x: 844, y: 724 }
    ];

    const rootEnds = [
      { x: 260, y: 834 },
      { x: 405, y: 808 },
      { x: 600, y: 850 },
      { x: 995, y: 850 },
      { x: 1190, y: 814 },
      { x: 1360, y: 846 },
      { x: 130, y: 872 },
      { x: 1468, y: 872 },
      { x: 720, y: 882 },
      { x: 880, y: 878 }
    ];

    rootEnds.forEach((end, index) => {
      const start = rootStarts[index % rootStarts.length];
      const side = end.x >= start.x ? 1 : -1;
      const c1x = start.x + side * (120 + (index % 4) * 30);
      const c2x = end.x - side * (210 + (index % 5) * 22);
      const c1y = start.y + 75 + (index % 3) * 18;
      const c2y = end.y - 62 - (index % 2) * 24;
      const d = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;
      const path = createSvgElement("path", {
        class: "root-line",
        d,
        stroke: palette[(index + 1) % palette.length],
        "stroke-width": 2.4 + (index % 3) * 0.9
      });
      rootLayer.appendChild(path);
      setupPathAnimation(path, 0.38 + index * 0.075, 2.65 + (index % 3) * 0.3);
      state.rootPaths.push(path);

      if (index < 8) {
        const curl = createSvgElement("path", {
          class: "root-line",
          d: `M ${end.x} ${end.y} C ${end.x + side * 64} ${end.y - 44}, ${end.x + side * 16} ${end.y - 78}, ${end.x - side * 34} ${end.y - 38}`,
          stroke: palette[(index + 4) % palette.length],
          "stroke-width": 1.4,
          opacity: 0.58
        });
        rootLayer.appendChild(curl);
        setupPathAnimation(curl, 0.94 + index * 0.08, 1.8);
        state.rootPaths.push(curl);
      }
    });
  }

  function createPhotoNode(memory, position, index) {
    const idSafe = `${memory.id || `memory-${index}`}`.replace(/[^a-z0-9_-]/gi, "-");
    const clipId = `photoClip-${idSafe}-${index}`;
    const clip = createSvgElement("clipPath", { id: clipId, class: "dynamic-def" });
    clip.appendChild(createSvgElement("circle", { cx: 0, cy: 0, r: 54 }));
    defs.appendChild(clip);

    const group = createSvgElement("g", {
      class: `photo-node ${memory.clickable === false ? "" : "clickable"}`.trim(),
      transform: `translate(${position.x} ${position.y})`,
      tabindex: memory.clickable === false ? "-1" : "0",
      role: memory.clickable === false ? "img" : "button",
      "aria-label": memory.clickable === false ? memory.title : `Ver recuerdo: ${memory.title}`,
      "data-memory-id": memory.id,
      "data-index": index
    });

    const size = 114;
    const glow = createSvgElement("circle", {
      class: "node-glow",
      cx: 0,
      cy: 0,
      r: 76,
      fill: memory.color || palette[index % palette.length],
      opacity: 0.26,
      filter: "url(#strongGlow)"
    });

    const ringBack = createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 62,
      fill: "rgba(19, 5, 31, 0.62)",
      stroke: "rgba(255, 247, 232, 0.32)",
      "stroke-width": 2
    });

    const ring = createSvgElement("circle", {
      class: "photo-ring",
      cx: 0,
      cy: 0,
      r: 60,
      fill: "none",
      stroke: "url(#photoFrameGradient)",
      "stroke-width": 7,
      filter: "url(#lineGlow)"
    });

    const image = createSvgElement("image", {
      class: "photo-core",
      href: memory.image,
      x: -size / 2,
      y: -size / 2,
      width: size,
      height: size,
      preserveAspectRatio: "xMidYMid slice",
      "clip-path": `url(#${clipId})`
    });

    const shine = createSvgElement("path", {
      d: "M -48 -18 C -24 -48, 18 -52, 46 -20 C 18 -30, -14 -25, -48 -18Z",
      fill: "rgba(255,255,255,.28)",
      opacity: 0.48,
      "clip-path": `url(#${clipId})`
    });

    const badge = createSvgElement("g", {
      class: "heart-badge",
      transform: "translate(45 42)",
      opacity: memory.clickable === false ? 0.4 : 0.88
    });
    badge.appendChild(createSvgElement("circle", {
      cx: 0,
      cy: 0,
      r: 19,
      fill: "rgba(35, 8, 42, .78)",
      stroke: memory.color || palette[index % palette.length],
      "stroke-width": 3,
      filter: "url(#lineGlow)"
    }));
    badge.appendChild(createSvgElement("path", {
      d: "M 0 9 C -12 1, -13 -8, -5 -10 C -1 -11, 0 -7, 0 -7 C 0 -7, 1 -11, 6 -10 C 14 -8, 12 1, 0 9Z",
      fill: "none",
      stroke: "#ffe9b0",
      "stroke-width": 3,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    }));

    group.style.setProperty("--node-delay", `${2.15 + index * 0.12}s`);
    group.appendChild(glow);
    group.appendChild(ringBack);
    group.appendChild(image);
    group.appendChild(shine);
    group.appendChild(ring);
    group.appendChild(badge);

    if (memory.clickable === false) {
      const label = createSvgElement("text", {
        class: "node-label",
        x: 0,
        y: 0,
        textContent: "✦"
      });
      group.appendChild(label);
    }

    if (memory.clickable !== false) {
      group.addEventListener("click", () => showMemory(index));
      group.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showMemory(index);
        }
      });
    }

    photoLayer.appendChild(group);
    return group;
  }

  function createMemoryBranches() {
    const clickableMemories = memories.length ? memories : [{ id: "default", title: "Recuerdo", image: "", message: "Cada recuerdo florece en nuestro árbol", clickable: true, color: palette[0] }];
    state.photoPositions = getPhotoPositions(clickableMemories.length);

    clickableMemories.forEach((memory, index) => {
      const position = state.photoPositions[index];
      const endpoint = { x: position.x, y: position.y };
      const start = position.branchStart;
      const lines = createLineGroup(index, start, endpoint, {
        strands: 5,
        delay: 0.74 + index * 0.05,
        width: 5.1,
        colorOffset: index,
        memoryId: memory.id
      });

      state.branchByMemory.set(memory.id, lines);

      const side = position.anchor === "left" ? -1 : position.anchor === "right" ? 1 : index % 2 ? -1 : 1;
      const twigStart = {
        x: endpoint.x - side * 54,
        y: endpoint.y + 38
      };

      for (let twigIndex = 0; twigIndex < 4; twigIndex += 1) {
        const angle = (side < 0 ? Math.PI + 0.36 : -0.36) + (twigIndex - 1.5) * 0.18;
        const twig = twigPath(twigStart, angle, 72 + twigIndex * 20, 0.2 * side, twigIndex);
        const twigElement = createSvgElement("path", {
          class: "branch-line",
          d: twig.d,
          stroke: palette[(index + twigIndex + 2) % palette.length],
          "stroke-width": 1.8,
          opacity: 0.7,
          "data-memory-id": memory.id
        });
        branchLayer.appendChild(twigElement);
        setupPathAnimation(twigElement, 1.1 + index * 0.08 + twigIndex * 0.07, 1.7);
        lines.push(twigElement);

        createLeaf(
          twig.end.x,
          twig.end.y,
          (angle * 180) / Math.PI + 80,
          0.72,
          leafPalette[(index + twigIndex) % leafPalette.length],
          2.1 + index * 0.11 + twigIndex * 0.08
        );
      }

      createPhotoNode(memory, position, index);
    });
  }

  function writeRootMessage(message, title = "Raíces del árbol", color = palette[0]) {
  const cleanMessage = message && message.trim()
    ? message.trim()
    : "Cada recuerdo florece en nuestro árbol";

  rootTitle.textContent = title || "Raíces del árbol";
  rootMessage.innerHTML = "";

  rootMessage.classList.toggle("is-long", cleanMessage.length > 70);
  rootMessage.classList.toggle("is-very-long", cleanMessage.length > 145);

  document.documentElement.style.setProperty("--memory-accent", color || palette[0]);

  const characters = Array.from(cleanMessage);

  characters.forEach((character, index) => {
    const span = document.createElement("span");
    span.className = character === " " ? "space letter" : "letter";
    span.style.setProperty("--i", String(index));
    span.textContent = character === " " ? "\u00A0" : character;
    rootMessage.appendChild(span);
  });

  if (cleanMessage.length > 90) {
    setTimeout(() => {
      rootMessage.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }, 350);
  }
}

  function createSparkleBurst(x, y, color) {
    for (let i = 0; i < 22; i += 1) {
      const angle = (Math.PI * 2 * i) / 22;
      const distance = 34 + (i % 6) * 11;
      const holder = createSvgElement("g", {
        transform: `translate(${x} ${y}) rotate(${i * 17})`
      });
      const sparkle = createSvgElement("path", {
        class: "sparkle",
        d: "M0 -8 L2.3 -2.3 L8 0 L2.3 2.3 L0 8 L-2.3 2.3 L-8 0 L-2.3 -2.3Z",
        fill: i % 3 === 0 ? "#ffe9b0" : color,
        opacity: 0.92
      });
      sparkle.style.color = color;
      sparkle.style.setProperty("--sx", `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty("--sy", `${Math.sin(angle) * distance}px`);
      holder.appendChild(sparkle);
      sparkleLayer.appendChild(holder);
      setTimeout(() => holder.remove(), 980);
    }
  }

  function showMemory(index) {
    const memory = memories[index];
    if (!memory || memory.clickable === false) return;

    state.selectedIndex = index;

    [...photoLayer.querySelectorAll(".photo-node")].forEach((node) => {
      node.classList.toggle("is-selected", Number(node.dataset.index) === index);
    });

    [...branchLayer.querySelectorAll(".branch-line")].forEach((line) => {
      const isActive = line.dataset.memoryId === memory.id || line.dataset.memoryId === "trunk";
      line.classList.toggle("is-active", isActive);
      line.classList.toggle("is-muted", !isActive && line.dataset.memoryId !== "decorative");
    });

    state.rootPaths.forEach((path, pathIndex) => {
      path.classList.add("is-awake");
      path.setAttribute("stroke", pathIndex % 2 === 0 ? memory.color || palette[index % palette.length] : palette[(index + pathIndex) % palette.length]);
      path.setAttribute("stroke-width", pathIndex % 2 === 0 ? "3.6" : "2.2");
    });

    writeRootMessage(memory.message, memory.title, memory.color || palette[index % palette.length]);

    const position = state.photoPositions[index];
    createSparkleBurst(position.x, position.y, memory.color || palette[index % palette.length]);

    if (softHint) {
      softHint.style.opacity = "0";
      softHint.style.transform = "translateX(-50%) translateY(8px)";
    }
  }

  function showNextMemory() {
    const clickable = memories
      .map((memory, index) => ({ memory, index }))
      .filter((item) => item.memory.clickable !== false);

    if (!clickable.length) return;

    const currentClickablePosition = clickable.findIndex((item) => item.index === state.selectedIndex);
    const next = clickable[(currentClickablePosition + 1 + clickable.length) % clickable.length];
    showMemory(next.index);
  }

  function buildScene({ replay = false } = {}) {
  clearScene();
  applyResponsiveTreeMode();
  createStars();
  createRoots();
  createTrunk();
  createOrnamentalBranches();
  createMemoryBranches();

    const firstClickableIndex = memories.findIndex((memory) => memory.clickable !== false);
    const first = firstClickableIndex >= 0 ? memories[firstClickableIndex] : null;

    writeRootMessage(
      first?.message || "Cada recuerdo florece en nuestro árbol",
      first ? first.title : "Raíces del árbol",
      first?.color || palette[0]
    );

    if (softHint) {
      softHint.style.opacity = "";
      softHint.style.transform = "";
    }

    if (!replay && firstClickableIndex >= 0) {
      window.setTimeout(() => showMemory(firstClickableIndex), 3150);
    }
  }

  replayButton?.addEventListener("click", () => {
    state.selectedIndex = -1;
    buildScene({ replay: true });
  });

  nextButton?.addEventListener("click", showNextMemory);

mobileQuery.addEventListener("change", () => {
  state.selectedIndex = -1;
  buildScene({ replay: true });
});

buildScene();
})();
