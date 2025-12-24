const API_BASE = "http://localhost:3000"; // your Node backend

const form = document.getElementById("calcForm");
const resultDiv = document.getElementById("result");
const historyDiv = document.getElementById("history");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// Local array to store history
let historyItems = [];

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const payload = {
    V: getNumberOrNull("V"),
    I: getNumberOrNull("I"),
    R: getNumberOrNull("R"),
    P: getNumberOrNull("P"),
    VUnit: document.getElementById("VUnit").value,
    IUnit: document.getElementById("IUnit").value,
    RUnit: document.getElementById("RUnit").value,
    PUnit: document.getElementById("PUnit").value,
  };

  try {
    const res = await fetch(`${API_BASE}/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.error) {
      resultDiv.innerHTML = `<strong>Error:</strong> ${data.error}`;
      return;
    }

    // Show result
    showResult(data);

    // Add to history
    addToHistory(data, payload);
    renderHistory();
  } catch (err) {
    console.error(err);
    resultDiv.innerText = "Error contacting server.";
  }
});

function getNumberOrNull(id) {
  const value = document.getElementById(id).value;
  if (value === "") return null;
  return Number(value);
}

function showResult(data) {
  const { V, I, R, P, explanations = [] } = data;

  resultDiv.innerHTML = `
    <strong>Result</strong><br/>
    Voltage: ${V.toFixed(3)} V<br/>
    Current: ${I.toFixed(3)} A<br/>
    Resistance: ${R.toFixed(3)} Ω<br/>
    Power: ${P.toFixed(3)} W<br/><br/>
    <strong>Notes:</strong><br/>
    ${explanations.map((e) => "• " + e).join("<br/>")}
  `;
}

function addToHistory(result, input) {
  historyItems.unshift({
    time: new Date().toLocaleTimeString(),
    input,
    result,
  });
}

function renderHistory() {
  if (historyItems.length === 0) {
    historyDiv.innerHTML = "No history yet.";
    return;
  }

  historyDiv.innerHTML = historyItems
    .map((item) => {
      const { V, I, R, P } = item.result;
      const inp = item.input;
      return `
        <div style="margin-bottom:6px; border-bottom:1px solid #e5e7eb; padding-bottom:4px;">
          <div><strong>${item.time}</strong></div>
          <div>Input: V=${inp.V ?? "-"} ${inp.VUnit}, I=${inp.I ?? "-"} ${inp.IUnit},
               R=${inp.R ?? "-"} ${inp.RUnit}, P=${inp.P ?? "-"} ${inp.PUnit}</div>
          <div>Result: V=${V.toFixed(3)} V, I=${I.toFixed(3)} A,
               R=${R.toFixed(3)} Ω, P=${P.toFixed(3)} W</div>
        </div>
      `;
    })
    .join("");
}

// Clear history button
clearHistoryBtn.addEventListener("click", () => {
  historyItems = [];
  renderHistory();
});
