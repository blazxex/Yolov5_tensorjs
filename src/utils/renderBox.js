import labels from "./labels.json";
let lastCallTimestamp = 0;

/**
 * Render prediction boxes
 * @param {HTMLCanvasElement} canvasRef canvas tag reference
 * @param {number} classThreshold class threshold
 * @param {Array} boxes_data boxes array
 * @param {Array} scores_data scores array
 * @param {Array} classes_data class array
 * @param {Array[Number]} ratios boxes ratio [xRatio, yRatio]
 */
export const renderBoxes = (
  canvasRef,
  classThreshold,
  boxes_data,
  scores_data,
  classes_data,
  ratios
) => {
  const currentTimestamp = performance.now();

  if (lastCallTimestamp !== 0) {
    const timeDifference = currentTimestamp - lastCallTimestamp;
    console.log(`Time since last call: ${timeDifference} milliseconds`);
  }
  // Update the last call timestamp
  lastCallTimestamp = currentTimestamp;

  const ctx = canvasRef.getContext("2d");
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); // clean canvas

  const colors = new Colors();

  // font configs
  const font = `${Math.max(
    Math.round(Math.max(ctx.canvas.width, ctx.canvas.height) / 40),
    14
  )}px Arial`;
  ctx.font = font;
  ctx.textBaseline = "top";
  let groups = { eye: [], pupil: [] };

  for (let i = 0; i < scores_data.length; ++i) {
    // filter based on class threshold
    if (scores_data[i] > classThreshold) {
      const klass = labels[classes_data[i]];
      const color = colors.get(classes_data[i]);
      const score = (scores_data[i] * 100).toFixed(1);

      let [x1, y1, x2, y2] = boxes_data.slice(i * 4, (i + 1) * 4);
      x1 *= canvasRef.width * ratios[0];
      x2 *= canvasRef.width * ratios[0];
      y1 *= canvasRef.height * ratios[1];
      y2 *= canvasRef.height * ratios[1];
      const width = x2 - x1;
      const height = y2 - y1;
      if (klass === "eye" || klass === "pupil") {
        groups[klass].push({
          x: x1,
          y: y1,
          x2: x2,
          y2: y2,
          score: scores_data[i],
        });
      }
      // draw box.
      ctx.fillStyle = Colors.hexToRgba(color, 0.2);
      ctx.fillRect(x1, y1, width, height);
      // draw border box.
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(
        Math.min(ctx.canvas.width, ctx.canvas.height) / 200,
        2.5
      );
      ctx.strokeRect(x1, y1, width, height);

      // Draw the label background.
      ctx.fillStyle = color;
      const textWidth = ctx.measureText(klass + " - " + score + "%").width;
      const textHeight = parseInt(font, 10); // base 10
      const yText = y1 - (textHeight + ctx.lineWidth);
      ctx.fillRect(
        x1 - 1,
        yText < 0 ? 0 : yText, // handle overflow label box
        textWidth + ctx.lineWidth,
        textHeight + ctx.lineWidth
      );
      // console.log(scores_data);

      // Draw labels
      ctx.fillStyle = "#ffffff";
      ctx.fillText(klass + " - " + score + "%", x1 - 1, yText < 0 ? 0 : yText);
    }
    if (groups["eye"].length && groups["pupil"].length) {
      // Sort by confidence and select the top one
      groups["eye"].sort((a, b) => b.score - a.score);
      groups["pupil"].sort((a, b) => b.score - a.score);

      const eye = groups["eye"][0];
      const pupil = groups["pupil"][0];

      // Calculate centers
      const eye_center = { x: (eye.x + eye.x2) / 2, y: (eye.y + eye.y2) / 2 };
      const pupil_center = {
        x: (pupil.x + pupil.x2) / 2,
        y: (pupil.y + pupil.y2) / 2,
      };

      // Determine direction
      const direction = pupil_center.x < eye_center.x ? "left" : "right";
      console.log(`Eye is looking to the ${direction}`);
    }
  }
};

class Colors {
  // ultralytics color palette https://ultralytics.com/
  constructor() {
    this.palette = [
      "#FF3838",
      "#FF9D97",
      "#FF701F",
      "#FFB21D",
      "#CFD231",
      "#48F90A",
      "#92CC17",
      "#3DDB86",
      "#1A9334",
      "#00D4BB",
      "#2C99A8",
      "#00C2FF",
      "#344593",
      "#6473FF",
      "#0018EC",
      "#8438FF",
      "#520085",
      "#CB38FF",
      "#FF95C8",
      "#FF37C7",
    ];
    this.n = this.palette.length;
  }

  get = (i) => this.palette[Math.floor(i) % this.n];

  static hexToRgba = (hex, alpha) => {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? `rgba(${[
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ].join(", ")}, ${alpha})`
      : null;
  };
}
