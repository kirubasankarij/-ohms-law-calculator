// backend/server.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// middleware to read JSON and allow frontend to call API
app.use(cors());
app.use(express.json());

// simple in-memory history (will reset when server restarts)
let history = [];

// unit conversion factors to base units
const unitFactors = {
  V: 1,
  mV: 1e-3,

  A: 1,
  mA: 1e-3,

  Ohm: 1,
  kOhm: 1e3,

  W: 1,
  mW: 1e-3,
};

function toBase(value, unit) {
  if (value == null) return null;
  return value * (unitFactors[unit] || 1);
}

function fromBase(value, unit) {
  if (value == null) return null;
  return value / (unitFactors[unit] || 1);
}

// POST /calculate  <-- this is what script.js calls
app.post("/calculate", (req, res) => {
  try {
    let { V, VUnit, I, IUnit, R, RUnit, P, PUnit } = req.body;

    // convert strings to numbers or null
    V = V === null || V === "" || V === undefined ? null : Number(V);
    I = I === null || I === "" || I === undefined ? null : Number(I);
    R = R === null || R === "" || R === undefined ? null : Number(R);
    P = P === null || P === "" || P === undefined ? null : Number(P);

    // convert given values to base units
    let v = V != null ? toBase(V, VUnit || "V") : null;
    let i = I != null ? toBase(I, IUnit || "A") : null;
    let r = R != null ? toBase(R, RUnit || "Ohm") : null;
    let p = P != null ? toBase(P, PUnit || "W") : null;

    // must have at least 2 known values
    const known =
      (v != null) + (i != null) + (r != null) + (p != null);
    if (known < 2) {
      return res.status(400).json({
        error: "Provide at least two among V, I, R, P.",
        note: "This is a learning and quick-check tool, not a full circuit simulator.",
      });
    }

    // use Ohm's law relationships to fill missing values
    // V = I * R, P = V * I
    let changed = true;
    let guard = 0;
    while (changed && guard < 10) {
      changed = false;
      guard++;

      if (v != null && r != null && i == null) {
        i = v / r;
        changed = true;
      }
      if (v != null && i != null && r == null) {
        r = v / i;
        changed = true;
      }
      if (i != null && r != null && v == null) {
        v = i * r;
        changed = true;
      }
      if (v != null && i != null && p == null) {
        p = v * i;
        changed = true;
      }
      if (p != null && v != null && i == null) {
        i = p / v;
        changed = true;
      }
      if (p != null && i != null && v == null) {
        v = p / i;
        changed = true;
      }
      if (p != null && r != null && (i == null || v == null)) {
        if (i == null) i = Math.sqrt(p / r);
        if (v == null) v = Math.sqrt(p * r);
        changed = true;
      }
    }

    if (v == null || i == null || r == null || p == null) {
      return res.status(400).json({
        error: "Cannot compute all values from inputs.",
        note: "Only simple Ohm’s law cases are supported.",
      });
    }

    // convert back to requested units
    const outV = fromBase(v, VUnit || "V");
    const outI = fromBase(i, IUnit || "A");
    const outR = fromBase(r, RUnit || "Ohm");
    const outP = fromBase(p, PUnit || "W");

    const explanations = [
      "Used Ohm’s law: V = I × R and P = V × I.",
      "Units are converted internally to base units for calculation.",
      "This app is for learning and quick checks, not for professional circuit design.",
    ];

    const result = {
      V: outV,
      VUnit: VUnit || "V",
      I: outI,
      IUnit: IUnit || "A",
      R: outR,
      RUnit: RUnit || "Ohm",
      P: outP,
      PUnit: PUnit || "W",
      explanations,
    };

    // save to in-memory history
    history.push({
      timestamp: new Date().toISOString(),
      input: req.body,
      result,
    });
    if (history.length > 50) history.shift();

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error.",
      note: "Check your input and try again.",
    });
  }
});

// GET /history  <-- script.js uses this to show past calculations
app.get("/history", (req, res) => {
  res.json({
    note: "History is stored only in memory (for learning/demo).",
    items: history,
  });
});

app.listen(PORT, () => {
  console.log(`API running at http://localhost:${PORT}`);
});
